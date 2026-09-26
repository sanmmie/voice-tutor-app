import { NextRequest } from 'next/server';
import {
  apiResponse,
  enforceRateLimit,
  getAuthenticatedUserId,
  getClientIp,
  getRequestId,
  isSameOrigin,
} from '@/lib/security';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const url = new URL(request.url);
    const isGuest = url.searchParams.get('guest') === 'true';

    if (!isSameOrigin(request)) {
      return apiResponse(request, '/api/token', requestId, 403, startedAt, { error: 'Forbidden' });
    }

    // Guest mode: much higher rate limit (60/5min) since unauthenticated users share IPs
    // Authenticated users: 10/5min
    // Use 5-minute window for better burst handling
    const rateLimit = isGuest ? 60 : 10;
    const identifier = isGuest 
      ? request.headers.get('x-client-id') || getClientIp(request) 
      : await getAuthenticatedUserId(request);
    
    const rate = await enforceRateLimit(request, 'token', rateLimit, identifier || getClientIp(request));
    if (!rate.success) {
      return apiResponse(request, '/api/token', requestId, 429, startedAt, { error: 'Too many requests. Please wait a moment.' }, {
        headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
      });
    }

    if (!isGuest && !(await getAuthenticatedUserId(request))) {
      return apiResponse(request, '/api/token', requestId, 401, startedAt, { error: 'Not authenticated' });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return apiResponse(request, '/api/token', requestId, 500, startedAt, { error: 'Service is not configured' });
    }

    const maxDuration = isGuest ? 3600 : 10800;
    const res = await fetch(
      `https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=${maxDuration}`,
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

    const response = apiResponse(request, '/api/token', requestId, 200, startedAt, { token: data.token, guest: isGuest }, {
      headers: { 'Cache-Control': 'no-store' },
    });
    return response;
  } catch {
    return apiResponse(request, '/api/token', requestId, 502, startedAt, { error: 'Token service unavailable' });
  }
}