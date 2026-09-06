import { NextRequest } from 'next/server';
import { authenticateUser, normalizeEmail, validatePassword } from '@/lib/identity';
import { apiResponse, createAuthenticatedSession, enforceRateLimit, getRequestId, isSameOrigin } from '@/lib/security';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    if (!isSameOrigin(request)) return apiResponse(request, '/api/auth/login', requestId, 403, startedAt, { error: 'Forbidden' });
    const rate = await enforceRateLimit(request, 'auth-login', 10);
    if (!rate.success) return apiResponse(request, '/api/auth/login', requestId, 429, startedAt, { error: 'Too many requests' });

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    if (!email || !validatePassword(body?.password)) return apiResponse(request, '/api/auth/login', requestId, 401, startedAt, { error: 'Invalid email or password' });
    const user = await authenticateUser(email, body.password);
    if (!user) return apiResponse(request, '/api/auth/login', requestId, 401, startedAt, { error: 'Invalid email or password' });
    const response = apiResponse(request, '/api/auth/login', requestId, 200, startedAt, { user });
    return createAuthenticatedSession(response, user.id);
  } catch {
    return apiResponse(request, '/api/auth/login', requestId, 503, startedAt, { error: 'Identity service unavailable' });
  }
}