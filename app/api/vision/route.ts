import { NextRequest } from 'next/server';
import { extractDocumentContent, extractPdfContent } from '@/lib/vision';
import { apiResponse, enforceRateLimit, getAuthenticatedUserId, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB for base64 images/PDFs

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/vision', requestId, 403, startedAt, { error: 'Forbidden' });
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return apiResponse(request, '/api/vision', requestId, 401, startedAt, { error: 'Unauthorized' });
  }

  const rate = await enforceRateLimit(request, 'vision', 10, userId);
  if (!rate.success) {
    return apiResponse(request, '/api/vision', requestId, 429, startedAt, { error: 'Too many requests' }, {
      headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return apiResponse(request, '/api/vision', requestId, 413, startedAt, { error: 'Request body too large' });
  }

  try {
    const body = await request.json();
    const { base64, mimeType, fileName, pages } = body ?? {};

    if (typeof base64 !== 'string' || !base64) {
      return apiResponse(request, '/api/vision', requestId, 400, startedAt, { error: 'Missing base64 data' });
    }

    if (typeof mimeType !== 'string' || !mimeType) {
      return apiResponse(request, '/api/vision', requestId, 400, startedAt, { error: 'Missing mimeType' });
    }

    if (typeof fileName !== 'string' || !fileName) {
      return apiResponse(request, '/api/vision', requestId, 400, startedAt, { error: 'Missing fileName' });
    }

    let result;
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPdf && Array.isArray(pages) && pages.length > 0) {
      result = await extractPdfContent(pages, mimeType, fileName);
    } else {
      result = await extractDocumentContent(base64, mimeType, fileName);
    }

    return apiResponse(request, '/api/vision', requestId, 200, startedAt, { result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vision extraction failed';
    const status = /timed? out|timeout/i.test(message) ? 504 : 500;
    return apiResponse(request, '/api/vision', requestId, status, startedAt, { error: message });
  }
}