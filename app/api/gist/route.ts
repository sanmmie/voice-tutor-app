import { NextRequest } from 'next/server';
import { apiResponse, enforceRateLimit, getAuthenticatedUserId, getRequestId, isSameOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!isSameOrigin(request)) {
    return apiResponse(request, '/api/gist', requestId, 403, startedAt, { error: 'Forbidden' });
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return apiResponse(request, '/api/gist', requestId, 401, startedAt, { error: 'Unauthorized' });
  }

  // Increased from 5/min to 15/min with 5-minute window for burst handling
  const rate = await enforceRateLimit(request, 'gist', 15, userId);
  if (!rate.success) {
    return apiResponse(request, '/api/gist', requestId, 429, startedAt, { error: 'Too many requests' }, {
      headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now()) / 1000)) },
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return apiResponse(request, '/api/gist', requestId, 413, startedAt, { error: 'Request body too large' });
  }

  try {
    const body = await request.json();
    const { token, content, filename } = body ?? {};

    if (typeof token !== 'string' || !token.trim()) {
      return apiResponse(request, '/api/gist', requestId, 400, startedAt, { error: 'Missing GitHub token' });
    }

    if (typeof content !== 'string' || !content.trim()) {
      return apiResponse(request, '/api/gist', requestId, 400, startedAt, { error: 'Missing content' });
    }

    if (typeof filename !== 'string' || !filename.trim()) {
      return apiResponse(request, '/api/gist', requestId, 400, startedAt, { error: 'Missing filename' });
    }

    const gistResponse = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Syntax-Voice-Tutor',
      },
      body: JSON.stringify({
        description: 'Syntax voice tutor session export',
        public: false,
        files: {
          [filename]: {
            content,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!gistResponse.ok) {
      const error = await gistResponse.json().catch(() => ({}));
      const message = error.message || `GitHub API error: ${gistResponse.status}`;
      return apiResponse(request, '/api/gist', requestId, gistResponse.status >= 500 ? 502 : 400, startedAt, { error: message });
    }

    const data = await gistResponse.json();

    return apiResponse(request, '/api/gist', requestId, 200, startedAt, {
      url: data.html_url,
      id: data.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gist creation failed';
    return apiResponse(request, '/api/gist', requestId, 500, startedAt, { error: message });
  }
}