import { NextRequest } from 'next/server';
import { apiResponse, getAuthenticatedUserIdAsNumber, getRequestId, isSameOrigin } from '@/lib/security';
import { createChat } from '@/lib/chats';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/chats/create', requestId, 403, startedAt, { error: 'Forbidden' });
  }
  const userId = await getAuthenticatedUserIdAsNumber(request);
  if (userId === null) {
    return apiResponse(request, '/api/chats/create', requestId, 401, startedAt, { error: 'Unauthorized' });
  }
  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'New conversation';
    const language = typeof body?.language === 'string' && body.language.trim() ? body.language.trim() : 'python';
    const chat = await createChat(userId, title, language);
    return apiResponse(request, '/api/chats/create', requestId, 201, startedAt, { chat });
  } catch {
    return apiResponse(request, '/api/chats/create', requestId, 503, startedAt, { error: 'Chat service unavailable' });
  }
}