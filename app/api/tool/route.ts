import { NextRequest } from 'next/server';
import { executeTool } from '@/lib/tools';
import { apiResponse, enforceRateLimit, getAuthenticatedUserId, getClientIp, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 128 * 1024; // 128KB for tool calls
const MAX_TOOL_RETRIES = 2;
const TOOL_RETRY_DELAY_MS = 500;

async function executeToolWithRetry(name: string, args: Record<string, unknown>, retries = MAX_TOOL_RETRIES): Promise<unknown> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeTool(name, args);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on validation errors or rate limits
      const message = lastError.message.toLowerCase();
      if (message.includes('missing') || 
          message.includes('invalid') || 
          message.includes('rate limit') ||
          message.includes('too many') ||
          message.includes('unauthorized') ||
          message.includes('forbidden')) {
        throw lastError;
      }
      
      // If this was the last attempt, throw
      if (attempt === retries) {
        throw lastError;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, TOOL_RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/tool', requestId, 403, startedAt, { error: 'Forbidden' });
  }

  // Guest mode: check for guest header or query param
  const url = new URL(request.url);
  const isGuest = request.headers.get('x-guest-mode') === 'true' || url.searchParams.get('guest') === 'true';
  
  let userId = await getAuthenticatedUserId(request);
  if (!userId && !isGuest) {
    return apiResponse(request, '/api/tool', requestId, 401, startedAt, { error: 'Unauthorized' });
  }

  // Use a guest identifier for rate limiting if no userId
  const rateLimitIdentifier = userId || getClientIp(request);
  const rate = await enforceRateLimit(request, 'tool', 60, rateLimitIdentifier);
  if (!rate.success) {
    return apiResponse(request, '/api/tool', requestId, 429, startedAt, { error: 'Too many requests' }, {
      headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return apiResponse(request, '/api/tool', requestId, 413, startedAt, { error: 'Request body too large' });
  }

  try {
    const body = await request.json();
    const { name, args } = body ?? {};

    if (typeof name !== 'string' || !name) {
      return apiResponse(request, '/api/tool', requestId, 400, startedAt, { error: 'Missing tool name' });
    }

    if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
      return apiResponse(request, '/api/tool', requestId, 400, startedAt, { error: 'Invalid tool arguments' });
    }

    const result = await Promise.race([
      executeToolWithRetry(name, args ?? {}),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timed out')), 15000);
      }),
    ]);
    return apiResponse(request, '/api/tool', requestId, 200, startedAt, { result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    const status = /timed? out|timeout/i.test(message) ? 504 : 500;
    return apiResponse(request, '/api/tool', requestId, status, startedAt, { error: message });
  }
}