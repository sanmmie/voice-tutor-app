import { NextRequest } from 'next/server';
import { getUserById } from '@/lib/identity';
import { apiResponse, getAuthenticatedUserId, getRequestId } from '@/lib/security';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return apiResponse(request, '/api/auth/me', requestId, 200, startedAt, { user: null });
  const user = await getUserById(userId);
  if (!user) return apiResponse(request, '/api/auth/me', requestId, 200, startedAt, { user: null });
  return apiResponse(request, '/api/auth/me', requestId, 200, startedAt, { user });
}