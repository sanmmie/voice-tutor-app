import { NextRequest } from 'next/server';
import { apiResponse, getAuthenticatedUserIdAsNumber, getRequestId } from '@/lib/security';
import { getChat } from '@/lib/chats';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const userId = await getAuthenticatedUserIdAsNumber(request);
  if (userId === null) {
    return apiResponse(request, '/api/chats/get', requestId, 401, startedAt, { error: 'Unauthorized' });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return apiResponse(request, '/api/chats/get', requestId, 400, startedAt, { error: 'Missing id parameter' });
  }
  try {
    const chat = await getChat(userId, id);
    if (!chat) {
      return apiResponse(request, '/api/chats/get', requestId, 404, startedAt, { error: 'Not found' });
    }
    return apiResponse(request, '/api/chats/get', requestId, 200, startedAt, { chat });
  } catch (reason) {
    if (reason instanceof Error && (reason.message === 'Forbidden' || reason.message === 'Chat not found')) {
      return apiResponse(request, '/api/chats/get', requestId, 404, startedAt, { error: 'Not found' });
    }
    return apiResponse(request, '/api/chats/get', requestId, 503, startedAt, { error: 'Chat service unavailable' });
  }
}