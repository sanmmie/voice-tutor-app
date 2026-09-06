import { NextRequest } from 'next/server';
import {
  apiResponse,
  enforceRateLimit,
  getAuthenticatedUserId,
  getRequestId,
  isSameOrigin,
} from '@/lib/security';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const rate = await enforceRateLimit(request, 'token', 10);
    if (!rate.success) {
      return apiResponse(request, '/api/token', requestId, 429, startedAt, { error: 'Too many requests' }, {
        headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
      });
    }

    if (!isSameOrigin(request)) {
      return apiResponse(request, '/api/token', requestId, 403, startedAt, { error: 'Forbidden' });
    }

    if (!(await getAuthenticatedUserId(request))) {
      return apiResponse(request, '/api/token', requestId, 401, startedAt, { error: 'Not authenticated' });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return apiResponse(request, '/api/token', requestId, 500, startedAt, { error: 'Service is not configured' });
    }

    const res = await fetch(
      'https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=10800',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return apiResponse(request, '/api/token', requestId, 502, startedAt, { error: 'Token minting failed' });
    }

    const data = await res.json();
    if (typeof data.token !== 'string' || !data.token) {
      return apiResponse(request, '/api/token', requestId, 502, startedAt, { error: 'Invalid token response' });
    }

    const response = apiResponse(request, '/api/token', requestId, 200, startedAt, { token: data.token }, {
      headers: { 'Cache-Control': 'no-store' },
    });
    return response;
  } catch {
    return apiResponse(request, '/api/token', requestId, 502, startedAt, { error: 'Token service unavailable' });
  }
}