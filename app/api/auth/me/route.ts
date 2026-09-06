import { NextRequest } from 'next/server';
import { getUserById } from '@/lib/identity';
import { apiResponse, getAuthenticatedUserId, getRequestId } from '@/lib/security';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return apiResponse(request, '/api/auth/me', requestId, 401, startedAt, { error: 'Not authenticated' });
  const user = await getUserById(userId);
  if (!user) return apiResponse(request, '/api/auth/me', requestId, 401, startedAt, { error: 'Not authenticated' });
  return apiResponse(request, '/api/auth/me', requestId, 200, startedAt, { user });
}