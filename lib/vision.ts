export interface VisionResult {
  text: string;
  type: 'image' | 'pdf';
}

const VISION_MODEL = process.env.VISION_MODEL || 'gpt-4o';
const VISION_API_URL = process.env.VISION_API_URL || 'https://api.openai.com/v1/chat/completions';
const VISION_API_KEY = process.env.VISION_API_KEY;

const SYSTEM_PROMPT = `You are a document analysis assistant for a voice-based coding and math tutor. 
Extract and describe the content of the uploaded document clearly and completely.

For images:
- If it's code: transcribe the code exactly, note the language if detectable
- If it's a math problem: transcribe the equation/problem text
- If it's a diagram/screenshot: describe what it shows in detail
- If it's handwritten: do your best to read and transcribe it

For PDFs:
- Extract the text content from each page
- Preserve code blocks, equations, and structure
- Note page numbers for reference

Return a clear, well-structured description that the tutor can reference by voice.`;

export async function extractDocumentContent(
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<VisionResult> {
  if (!VISION_API_KEY) {
    throw new Error('Vision API key not configured');
  }

  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const type = isPdf ? 'pdf' : 'image';

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this ${type} document (${fileName}):`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`,
            detail: 'high',
          },
        },
      ],
    },
  ];

  const response = await fetch(VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      max_tokens: 4000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Vision API error: ${response.status} - ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (!text.trim()) {
    throw new Error('No content extracted from document');
  }

  return { text, type };
}

export async function extractPdfContent(
  base64Pages: string[],
  mimeType: string,
  fileName: string
): Promise<VisionResult> {
  if (!VISION_API_KEY) {
    throw new Error('Vision API key not configured');
  }

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this PDF document (${fileName}) with ${base64Pages.length} pages:`,
        },
        ...base64Pages.map((pageData, index) => ({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${pageData}`,
            detail: 'high',
          },
        })),
      ],
    },
  ];

  const response = await fetch(VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      max_tokens: 8000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Vision API error: ${response.status} - ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (!text.trim()) {
    throw new Error('No content extracted from PDF');
  }

  return { text, type: 'pdf' };
}