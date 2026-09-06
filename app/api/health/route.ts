import { NextRequest } from 'next/server';
import { apiResponse, checkSecurityHealth, getRequestId } from '@/lib/security';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const health = await checkSecurityHealth();
  return apiResponse(
    request,
    '/api/health',
    requestId,
    health.healthy ? 200 : 503,
    startedAt,
    { status: health.healthy ? 'ok' : 'degraded' }
  );
}