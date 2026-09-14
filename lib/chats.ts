import { getRedisClient } from '@/lib/security';

export interface ChatMessage {
  role: 'user' | 'agent' | 'tool';
  text: string;
  ts: number;
}

export interface SavedChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  language: string;
}

const CHAT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CHAT_KEY_PREFIX = 'chat:';
const OWNER_KEY_SUFFIX = ':owner';
const COUNTER_KEY = 'chat:id:counter';

function requireRedis() {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis is not configured');
  }
  return redis;
}

function chatKey(id: string): string {
  return `${CHAT_KEY_PREFIX}${id}`;
}

function ownerKey(id: string): string {
  return `${CHAT_KEY_PREFIX}${id}${OWNER_KEY_SUFFIX}`;
}

function assertOwnership(owner: unknown, userId: number): void {
  if (owner === null || owner === undefined) {
    throw new Error('Chat not found');
  }
  if (Number(owner) !== userId) {
    throw new Error('Forbidden');
  }
}

export async function listChats(userId: number): Promise<SavedChat[]> {
  try {
    const redis = requireRedis();
    const ids = await redis.keys(`${CHAT_KEY_PREFIX}*`);
    const chats: SavedChat[] = [];
    for (const key of ids) {
      if (key.endsWith(OWNER_KEY_SUFFIX)) continue;
      const id = key.slice(CHAT_KEY_PREFIX.length);
      const owner = await redis.get(ownerKey(id));
      if (owner === null || owner === undefined) continue;
      if (Number(owner) !== userId) continue;
      const raw = await redis.get(key);
      if (!raw) continue;
      const parsed = JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)) as SavedChat;
      chats.push(parsed);
    }
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    return chats;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Redis is not configured') {
      throw reason;
    }
    throw new Error(`Failed to list chats: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}

export async function createChat(userId: number, title: string, language: string): Promise<SavedChat> {
  try {
    const redis = requireRedis();
    const id = String(await redis.incr(COUNTER_KEY));
    const now = Date.now();
    const chat: SavedChat = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: [],
      language,
    };
    const pipeline = redis.pipeline();
    pipeline.set(chatKey(id), JSON.stringify(chat), { ex: CHAT_TTL_SECONDS });
    pipeline.set(ownerKey(id), userId, { ex: CHAT_TTL_SECONDS });
    await pipeline.exec();
    return chat;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Redis is not configured') {
      throw reason;
    }
    throw new Error(`Failed to create chat: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}

export async function getChat(userId: number, id: string): Promise<SavedChat | null> {
  try {
    const redis = requireRedis();
    const owner = await redis.get(ownerKey(id));
    assertOwnership(owner, userId);
    const raw = await redis.get(chatKey(id));
    if (!raw) return null;
    return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)) as SavedChat;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Redis is not configured') {
      throw reason;
    }
    if (reason instanceof Error && (reason.message === 'Chat not found' || reason.message === 'Forbidden')) {
      throw reason;
    }
    throw new Error(`Failed to get chat: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}

export async function saveChat(userId: number, chat: SavedChat): Promise<SavedChat> {
  try {
    const redis = requireRedis();
    const owner = await redis.get(ownerKey(chat.id));
    assertOwnership(owner, userId);
    const updated: SavedChat = { ...chat, updatedAt: Date.now() };
    await redis.set(chatKey(chat.id), JSON.stringify(updated), { ex: CHAT_TTL_SECONDS });
    return updated;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Redis is not configured') {
      throw reason;
    }
    if (reason instanceof Error && (reason.message === 'Chat not found' || reason.message === 'Forbidden')) {
      throw reason;
    }
    throw new Error(`Failed to save chat: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}

export async function deleteChat(userId: number, id: string): Promise<void> {
  try {
    const redis = requireRedis();
    const owner = await redis.get(ownerKey(id));
    assertOwnership(owner, userId);
    const pipeline = redis.pipeline();
    pipeline.del(chatKey(id));
    pipeline.del(ownerKey(id));
    await pipeline.exec();
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Redis is not configured') {
      throw reason;
    }
    if (reason instanceof Error && (reason.message === 'Chat not found' || reason.message === 'Forbidden')) {
      throw reason;
    }
    throw new Error(`Failed to delete chat: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
}