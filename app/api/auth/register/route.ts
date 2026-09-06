import { NextRequest } from 'next/server';
import { registerUser, normalizeEmail, validatePassword } from '@/lib/identity';
import { apiResponse, createAuthenticatedSession, enforceRateLimit, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    if (!isSameOrigin(request)) return apiResponse(request, '/api/auth/register', requestId, 403, startedAt, { error: 'Forbidden' });
    const rate = await enforceRateLimit(request, 'auth-register', 5);
    if (!rate.success) return apiResponse(request, '/api/auth/register', requestId, 429, startedAt, { error: 'Too many requests' });
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return apiResponse(request, '/api/auth/register', requestId, 413, startedAt, { error: 'Request body too large' });

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    if (!email || !validatePassword(body?.password)) {
      return apiResponse(request, '/api/auth/register', requestId, 400, startedAt, { error: 'Use a valid email and a password with 12 to 128 characters' });
    }

    const user = await registerUser(email, body.password);
    if (!user) return apiResponse(request, '/api/auth/register', requestId, 409, startedAt, { error: 'Unable to create account' });
    const response = apiResponse(request, '/api/auth/register', requestId, 201, startedAt, { user });
    return createAuthenticatedSession(response, user.id);
  } catch {
    return apiResponse(request, '/api/auth/register', requestId, 503, startedAt, { error: 'Identity service unavailable' });
  }
}