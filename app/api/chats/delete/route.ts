import { NextRequest } from 'next/server';
import { apiResponse, getAuthenticatedUserIdAsNumber, getRequestId, isSameOrigin } from '@/lib/security';
import { deleteChat } from '@/lib/chats';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/chats/delete', requestId, 403, startedAt, { error: 'Forbidden' });
  }
  const userId = await getAuthenticatedUserIdAsNumber(request);
  if (userId === null) {
    return apiResponse(request, '/api/chats/delete', requestId, 401, startedAt, { error: 'Unauthorized' });
  }
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) {
      return apiResponse(request, '/api/chats/delete', requestId, 400, startedAt, { error: 'Missing id' });
    }
    await deleteChat(userId, id);
    return apiResponse(request, '/api/chats/delete', requestId, 200, startedAt, { ok: true });
  } catch (reason) {
    if (reason instanceof Error && (reason.message === 'Forbidden' || reason.message === 'Chat not found')) {
      return apiResponse(request, '/api/chats/delete', requestId, 404, startedAt, { error: 'Not found' });
    }
    return apiResponse(request, '/api/chats/delete', requestId, 503, startedAt, { error: 'Chat service unavailable' });
  }
}