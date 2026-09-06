import { NextRequest } from 'next/server';
import { executeTool } from '@/lib/tools';
import { apiResponse, enforceRateLimit, getAuthenticatedUserId, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId(request);
  if (!isSameOrigin(request) || !userId) {
    return apiResponse(request, '/api/tool', requestId, 403, startedAt, { error: 'Forbidden' });
  }

  const rate = await enforceRateLimit(request, 'tool', 60, userId);
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

    const result = await executeTool(name, args ?? {});
    return apiResponse(request, '/api/tool', requestId, 200, startedAt, { result });
  } catch {
    return apiResponse(request, '/api/tool', requestId, 400, startedAt, { error: 'Tool execution failed' });
  }
}