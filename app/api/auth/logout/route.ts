import { NextRequest } from 'next/server';
import { apiResponse, destroySession, getRequestId, isSameOrigin } from '@/lib/security';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) return apiResponse(request, '/api/auth/logout', requestId, 403, startedAt, { error: 'Forbidden' });
  const response = apiResponse(request, '/api/auth/logout', requestId, 200, startedAt, { ok: true });
  return destroySession(request, response);
}