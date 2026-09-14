import { NextRequest } from 'next/server';
import { apiResponse, getAuthenticatedUserIdAsNumber, getRequestId, isSameOrigin } from '@/lib/security';
import { saveChat } from '@/lib/chats';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/chats/save', requestId, 403, startedAt, { error: 'Forbidden' });
  }
  const userId = await getAuthenticatedUserIdAsNumber(request);
  if (userId === null) {
    return apiResponse(request, '/api/chats/save', requestId, 401, startedAt, { error: 'Unauthorized' });
  }
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const language = typeof body?.language === 'string' ? body.language : '';
    const messages = body?.messages;
    if (!Array.isArray(messages)) {
      return apiResponse(request, '/api/chats/save', requestId, 400, startedAt, { error: 'Invalid messages' });
    }
    const updatedAt = typeof body?.updatedAt === 'number' ? body.updatedAt : Date.now();
    const chat = await saveChat(userId, {
      id,
      title,
      language,
      messages,
      updatedAt,
      createdAt: typeof body?.createdAt === 'number' ? body.createdAt : updatedAt,
    });
    return apiResponse(request, '/api/chats/save', requestId, 200, startedAt, { chat });
  } catch (reason) {
    if (reason instanceof Error && (reason.message === 'Forbidden' || reason.message === 'Chat not found')) {
      return apiResponse(request, '/api/chats/save', requestId, 404, startedAt, { error: 'Not found' });
    }
    return apiResponse(request, '/api/chats/save', requestId, 503, startedAt, { error: 'Chat service unavailable' });
  }
}