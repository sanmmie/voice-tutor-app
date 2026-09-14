import { NextRequest } from 'next/server';
import { apiResponse, getAuthenticatedUserIdAsNumber, getRequestId } from '@/lib/security';
import { listChats } from '@/lib/chats';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserIdAsNumber(request);
  if (userId === null) {
    return apiResponse(request, '/api/chats/list', requestId, 401, startedAt, { error: 'Unauthorized' });
  }
  try {
    const chats = await listChats(userId);
    return apiResponse(request, '/api/chats/list', requestId, 200, startedAt, { chats });
  } catch {
    return apiResponse(request, '/api/chats/list', requestId, 503, startedAt, { error: 'Chat service unavailable' });
  }
}