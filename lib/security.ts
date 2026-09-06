import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const SESSION_COOKIE = 'voice_tutor_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const redisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const sessionConfigured = Boolean(process.env.SESSION_SECRET);
const redis = redisConfigured ? Redis.fromEnv() : null;
const limiters = new Map<string, Ratelimit>();

export function getRedisClient() {
  return redis;
}

export function getRequestId(request: NextRequest): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && supplied.length <= 100 ? supplied : randomUUID();
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function requireProductionSecurity() {
  if (process.env.NODE_ENV === 'production' && (!redisConfigured || !sessionConfigured)) {
    throw new Error('Production security configuration is incomplete');
  }
}

export async function enforceRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  identifier = getClientIp(request)
) {
  requireProductionSecurity();
  if (!redis) return { success: true, remaining: limit, reset: Date.now() + 60_000 };

  let limiter = limiters.get(namespace);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      analytics: true,
      prefix: `voice-tutor:${namespace}`,
    });
    limiters.set(namespace, limiter);
  }

  return limiter.limit(identifier);
}

function sessionSignature(payload: string): string {
  return createHmac('sha256', process.env.SESSION_SECRET || '').update(payload).digest('base64url');
}

function sessionValue(userId: string): { id: string; value: string } {
  const id = randomUUID();
  const payload = `${id}.${Date.now()}`;
  return { id, value: `${payload}.${sessionSignature(payload)}` };
}

export async function createAuthenticatedSession(response: NextResponse, userId: string) {
  requireProductionSecurity();
  const session = sessionValue(userId);
  if (redis) {
    await redis.set(`session:${session.id}`, userId, { ex: SESSION_MAX_AGE_SECONDS });
  }

  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return response;
}

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  if (!sessionConfigured || !redis) return null;
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [id, timestamp, signature] = parts;
  const payload = `${id}.${timestamp}`;
  const expected = sessionSignature(payload);
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  if (!Number.isFinite(Number(timestamp)) || Date.now() - Number(timestamp) >= SESSION_MAX_AGE_SECONDS * 1000) {
    return null;
  }

  return (await redis.get<string>(`session:${id}`)) || null;
}

export async function destroySession(request: NextRequest, response: NextResponse) {
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  const id = value?.split('.')[0];
  if (redis && id) await redis.del(`session:${id}`);
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
  return response;
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export function logApiRequest(
  request: NextRequest,
  route: string,
  requestId: string,
  status: number,
  startedAt: number
) {
  console.info(JSON.stringify({
    event: 'api.request',
    requestId,
    route,
    method: request.method,
    status,
    durationMs: Date.now() - startedAt,
    ip: getClientIp(request),
  }));
}

export function apiResponse(
  request: NextRequest,
  route: string,
  requestId: string,
  status: number,
  startedAt: number,
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(body, { ...init, status });
  response.headers.set('x-request-id', requestId);
  logApiRequest(request, route, requestId, status, startedAt);
  return response;
}

export function securityStatus() {
  return { redisConfigured, sessionConfigured };
}

export async function checkSecurityHealth() {
  if (!redis) return { healthy: process.env.NODE_ENV !== 'production', ...securityStatus() };
  try {
    await redis.ping();
    return { healthy: true, ...securityStatus() };
  } catch {
    return { healthy: false, ...securityStatus() };
  }
}