import { NextRequest } from 'next/server';
import { executeTool, toolDefinitions } from '@/lib/tools';
import { apiResponse, enforceRateLimit, getAuthenticatedUserId, getClientIp, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1024;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gpt-4o';

const SYSTEM_PROMPT = `You are a patient, encouraging coding and math mentor. Explain concepts step-by-step, use analogies, and guide the user to the answer rather than giving it away immediately. When the user asks a math question, use the calculate tool. When they ask about programming, use search_docs first, then get_code_example if they want code. If they reference an uploaded document, use the read_document tool to access its content.`;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/chat/text', requestId, 403, startedAt, { error: 'Forbidden' });
  }

  // Guest mode support
  const url = new URL(request.url);
  const isGuest = request.headers.get('x-guest-mode') === 'true' || url.searchParams.get('guest') === 'true';
  
  let userId = await getAuthenticatedUserId(request);
  if (!userId && !isGuest) {
    return apiResponse(request, '/api/chat/text', requestId, 401, startedAt, { error: 'Unauthorized' });
  }

  const rateLimitIdentifier = userId || getClientIp(request);
  const rate = await enforceRateLimit(request, 'chat:text', 30, rateLimitIdentifier);
  if (!rate.success) {
    return apiResponse(request, '/api/chat/text', requestId, 429, startedAt, { error: 'Too many requests' }, {
      headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return apiResponse(request, '/api/chat/text', requestId, 413, startedAt, { error: 'Request body too large' });
  }

  if (!OPENAI_API_KEY) {
    return apiResponse(request, '/api/chat/text', requestId, 500, startedAt, { error: 'Text LLM not configured' });
  }

  try {
    const body = await request.json();
    const { message, history = [], learningLevel = 'basic', learningPath = 'general' } = body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return apiResponse(request, '/api/chat/text', requestId, 400, startedAt, { error: 'Missing message' });
    }

    // Build system prompt based on learning level/path
    const levelPrompts: Record<string, string> = {
      entry: 'The user is a complete beginner. Use simple language, avoid jargon, explain every concept from first principles, and provide lots of encouragement. Assume no prior coding or math knowledge.',
      basic: 'The user has some basic familiarity. Use clear explanations with some technical terms (but define them), moderate pacing, and assume they know what variables, loops, and functions are.',
      intermediate: 'The user is comfortable with fundamentals. Use standard technical vocabulary, faster pacing, and assume knowledge of data structures, basic algorithms, and common patterns.',
      advanced: 'The user is experienced. Use precise technical language, minimal hand-holding, focus on nuance, trade-offs, and advanced concepts. Assume fluency in multiple paradigms.',
    };

    const pathPrompts: Record<string, string> = {
      python: 'Focus on Python: syntax, standard library, data science basics, scripting, and Pythonic patterns.',
      web: 'Focus on web development: HTML/CSS, JavaScript/TypeScript, React, Node.js, APIs, and frontend/backend patterns.',
      algorithms: 'Focus on algorithms and data structures: complexity analysis, sorting, searching, graphs, dynamic programming, and problem-solving techniques.',
      math: 'Focus on mathematics: algebra, calculus, discrete math, statistics, and mathematical reasoning for computer science.',
      general: 'Cover coding and math broadly. Adapt to whatever the user asks about.',
    };

    const levelPrompt = levelPrompts[learningLevel] || levelPrompts.basic;
    const pathPrompt = pathPrompts[learningPath] || pathPrompts.general;
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${levelPrompt}\n\n${pathPrompt}`;

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...history.slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // First call to OpenAI with tools
    let openaiResponse = await fetchWithTimeout(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: 4000,
        temperature: 0.3,
      }),
    }, 30000);

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${error.error?.message || openaiResponse.statusText}`);
    }

    let openaiData = await openaiResponse.json();
    let assistantMessage = openaiData.choices?.[0]?.message;

    // Handle tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const { name, arguments: argsStr } = toolCall.function;
        let args;
        try {
          args = JSON.parse(argsStr);
        } catch {
          args = {};
        }

        try {
          const result = await executeTool(name, args);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
          });
        }
      }

      // Second call with tool results
      const secondMessages = [
        ...messages,
        assistantMessage,
        ...toolResults,
      ];

      openaiResponse = await fetchWithTimeout(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: secondMessages,
          max_tokens: 4000,
          temperature: 0.3,
        }),
      }, 30000);

      if (!openaiResponse.ok) {
        const error = await openaiResponse.json().catch(() => ({}));
        throw new Error(`OpenAI API error (second call): ${openaiResponse.status} - ${error.error?.message || openaiResponse.statusText}`);
      }

      openaiData = await openaiResponse.json();
      assistantMessage = openaiData.choices?.[0]?.message;
    }

    const responseText = assistantMessage?.content || 'I apologize, but I could not generate a response.';

    return apiResponse(request, '/api/chat/text', requestId, 200, startedAt, { 
      response: responseText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text chat failed';
    return apiResponse(request, '/api/chat/text', requestId, 500, startedAt, { error: message });
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}