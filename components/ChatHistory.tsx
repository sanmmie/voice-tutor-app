'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface ChatItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: 'user' | 'agent' | 'tool'; text: string; ts: number }[];
  language: string;
}

interface ChatHistoryProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId: string | null;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

function PlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ClockIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SkeletonItem() {
  return (
    <div className="p-3 border-b border-terminal-border animate-pulse">
      <div className="h-4 w-3/4 bg-terminal-surface rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-terminal-surface rounded"></div>
      <div className="mt-2 h-3 w-full bg-terminal-surface rounded"></div>
    </div>
  );
}

export function ChatHistory({
  userId,
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  currentChatId,
}: ChatHistoryProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/chats/list');
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchChats();
    }
  }, [isOpen, fetchChats]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch('/api/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete chat');
      fetchChats();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md bg-terminal-surface border-l border-terminal-border z-50 transform transition-transform duration-300 ease-in-out"
        style={{ transform: isOpen ? 'translateX(0%)' : 'translateX(100%)' }}
        role="dialog"
        aria-label="Chat history"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <Image
              src="/deltaos-core.svg"
              alt="DeltaOS Core"
              width={28}
              height={28}
              className="delta-glow"
            />
            <h2 className="font-mono text-lg text-terminal-accent">Conversations</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-terminal-muted hover:text-terminal-accent transition-colors"
              aria-label="Close chat history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3 border-b border-terminal-border">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-mono text-terminal-text bg-terminal-bg rounded-lg border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors"
            >
              <PlusIcon />
              <span>New conversation</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <SkeletonItem key={i} />)}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-400">{error}</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-sm text-terminal-muted">
                No conversations yet. Start a new one!
              </div>
            ) : (
              <ul className="divide-y divide-terminal-border" role="list">
                {chats.map((chat) => {
                  const firstUserMessage = chat.messages.find((m) => m.role === 'user');
                  const preview = firstUserMessage ? truncate(firstUserMessage.text, 40) : 'No messages';
                  const isCurrent = chat.id === currentChatId;

                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectChat(chat.id)}
                        className={`w-full px-3 py-3 text-left transition-colors ${
                          isCurrent
                            ? 'bg-terminal-accent/10 border-l-2 border-terminal-accent'
                            : 'hover:bg-terminal-bg'
                        }`}
                        aria-current={isCurrent ? 'true' : 'false'}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm text-terminal-text truncate">
                              {truncate(chat.title, 22)}
                            </p>
                            <p className="mt-1 text-xs text-terminal-muted truncate">{preview}</p>
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-terminal-muted">
                              <ClockIcon />
                              <span>{formatRelativeTime(chat.updatedAt)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(chat.id);
                            }}
                            disabled={deletingId === chat.id}
                            className="flex-shrink-0 p-1 text-terminal-muted hover:text-red-400 transition-colors disabled:opacity-50"
                            aria-label={`Delete ${chat.title}`}
                          >
                            {deletingId === chat.id ? (
                              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}