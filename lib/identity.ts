import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getRedisClient } from './security';

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

interface StoredUser extends PublicUser {
  passwordHash: string;
}

function userKey(email: string) {
  return `user:email:${encodeURIComponent(email)}`;
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254
    ? normalized
    : null;
}

export function validatePassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function publicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function registerUser(email: string, password: string): Promise<PublicUser | null> {
  const redis = getRedisClient();
  if (!redis) throw new Error('Identity storage is not configured');

  const user: StoredUser = {
    id: randomUUID(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString(),
  };
  const created = await redis.set(userKey(email), JSON.stringify(user), { nx: true });
  if (created === 'OK') await redis.set(`user:id:${user.id}`, JSON.stringify(user));
  return created === 'OK' ? publicUser(user) : null;
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser | null> {
  const redis = getRedisClient();
  if (!redis) throw new Error('Identity storage is not configured');

  const stored = await redis.get<string>(userKey(email));
  if (!stored) return null;
  const user = typeof stored === 'string' ? JSON.parse(stored) as StoredUser : stored as StoredUser;
  return await bcrypt.compare(password, user.passwordHash) ? publicUser(user) : null;
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  const stored = await redis.get<string>(`user:id:${userId}`);
  if (!stored) return null;
  const user = typeof stored === 'string' ? JSON.parse(stored) as StoredUser : stored as StoredUser;
  return publicUser(user);
}