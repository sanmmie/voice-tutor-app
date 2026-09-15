'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { AuthPanel } from './AuthPanel';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Controls } from './Controls';
import { StatusBar } from './StatusBar';
import { TranscriptList } from './TranscriptList';
import { ToolCallCard } from './ToolCallCard';
import { ChatHistory } from './ChatHistory';
import { Logo } from './Logo';

export function VoiceTutor() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const { state, startSession, disconnect, setTranscripts, isConnected, isRecording } = useVoiceAgent();

  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedChatRef = useRef(false);

  const createNewChat = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New conversation', language: 'python' }),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentChatId(data.chat.id);
      }
    } catch {
      // Graceful degradation - continue without persistence
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    fetch('/api/auth/me', { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        const authenticatedUser = data?.user || null;
        setUser(authenticatedUser);
        if (authenticatedUser?.id) {
          const parsedId = parseInt(authenticatedUser.id, 10);
          if (!isNaN(parsedId)) {
            setUserId(parsedId);
          }
        }
      })
      .catch(() => {
        setUser(null);
        setAuthError(true);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setAuthLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (user && userId !== null && !hasInitializedChatRef.current) {
      hasInitializedChatRef.current = true;
      createNewChat();
    }
  }, [user, userId, createNewChat]);

  const saveCurrentChat = useCallback(async () => {
    if (!currentChatId || !userId) return;
    if (state.userTranscripts.length === 0 && state.agentTranscripts.length === 0) return;

    const messages = [
      ...state.userTranscripts.map((t) => ({ role: 'user' as const, text: t.text, ts: t.timestamp })),
      ...state.agentTranscripts.map((t) => ({ role: 'agent' as const, text: t.text, ts: t.timestamp })),
    ].sort((a, b) => a.ts - b.ts);

    if (messages.length === 0) return;

    const firstUserMessage = messages.find((m) => m.role === 'user');
    const title = firstUserMessage
      ? firstUserMessage.text.slice(0, 50) + (firstUserMessage.text.length > 50 ? '…' : '')
      : 'New conversation';

    try {
      await fetch('/api/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentChatId,
          title,
          messages,
          language: 'python',
          updatedAt: Date.now(),
        }),
      });
    } catch {
      // Graceful degradation
    }
  }, [currentChatId, userId, state.userTranscripts, state.agentTranscripts]);

  useEffect(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    if (currentChatId && (state.userTranscripts.length > 0 || state.agentTranscripts.length > 0)) {
      saveDebounceRef.current = setTimeout(() => {
        saveCurrentChat();
      }, 2000);
    }
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [state.userTranscripts, state.agentTranscripts, currentChatId, saveCurrentChat]);

  useEffect(() => {
    return () => {
      if (currentChatId && (state.userTranscripts.length > 0 || state.agentTranscripts.length > 0)) {
        saveCurrentChat();
      }
    };
  }, [currentChatId, state.userTranscripts, state.agentTranscripts, saveCurrentChat]);

  const handleSelectChat = useCallback(async (chatId: string) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/chats/get?id=${chatId}`);
      if (!response.ok) throw new Error('Failed to load chat');
      const data = await response.json();
      const chat = data.chat;

      const userMessages = chat.messages
        .filter((m: { role: string }) => m.role === 'user')
        .map((m: { text: string; ts: number }) => ({
          type: 'transcript.user' as const,
          text: m.text,
          timestamp: m.ts,
          isFinal: true,
        }));
      const agentMessages = chat.messages
        .filter((m: { role: string }) => m.role === 'agent')
        .map((m: { text: string; ts: number }) => ({
          type: 'transcript.agent' as const,
          text: m.text,
          timestamp: m.ts,
          isFinal: true,
        }));

      // Restore the saved conversation into the live UI before reconnecting.
      setTranscripts(userMessages, agentMessages);
      setCurrentChatId(chatId);
      disconnect();
      await startSession();
    } catch {
      // Graceful degradation
    }
  }, [userId, disconnect, startSession, setTranscripts]);

  const handleNewChat = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New conversation', language: 'python' }),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentChatId(data.chat.id);
        disconnect();
        await startSession();
      }
    } catch {
      // Graceful degradation
      setCurrentChatId(null);
      disconnect();
      await startSession();
    }
  }, [userId, disconnect, startSession]);

  const retryAuth = () => {
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="font-mono text-terminal-muted" role="status">
        Loading VoiceTutor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full">
        {authError && (
          <p className="mb-4 text-center text-sm text-red-400" role="alert">
            Could not check your account. You can still try signing in.
            <button type="button" onClick={retryAuth} className="ml-2 underline hover:text-red-300">
              Retry
            </button>
          </p>
        )}
        <AuthPanel onAuthenticated={(authenticatedUser) => {
          setAuthError(false);
          setUser(authenticatedUser);
        }} />
      </div>
    );
  }

  const handleStart = () => {
    startSession();
  };

  const handleStop = () => {
    disconnect();
  };

  return (
    <div
      className={`relative flex flex-col h-full max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5 min-h-0 ${
        chatHistoryOpen ? 'pointer-events-none select-none' : ''
      }`}
      aria-hidden={chatHistoryOpen}
    >
      <ChatHistory
        userId={userId || 0}
        isOpen={chatHistoryOpen}
        onClose={() => setChatHistoryOpen(false)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
      />

      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setChatHistoryOpen((prev) => !prev)}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-terminal-muted hover:text-terminal-accent hover:bg-terminal-surface/60 transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent"
            aria-label={chatHistoryOpen ? 'Close chat history' : 'Open chat history'}
            aria-expanded={chatHistoryOpen}
            aria-controls="chat-history-panel"
          >
            {chatHistoryOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <Logo size={32} />
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-terminal-accent truncate">Voice Tutor</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline text-xs text-terminal-muted truncate max-w-[200px]" title={user.email}>
            {user.email}
          </span>
          <StatusBar status={state.status} error={state.error} sessionId={state.sessionId} />
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-terminal-muted hover:text-terminal-accent hover:bg-terminal-surface/60 transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent"
            aria-label="New conversation"
            title="New conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={async () => { disconnect(); await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); }}
            className="px-3 py-2 rounded-lg text-xs font-mono text-terminal-muted hover:text-terminal-accent hover:bg-terminal-surface/60 transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Visualizer */}
      <div className="flex justify-center">
        <VoiceVisualizer isActive={isRecording} />
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <Controls
          isConnected={isConnected}
          isRecording={isRecording}
          onStart={handleStart}
          onStop={handleStop}
          status={state.status}
        />
      </div>

      {/* Transcripts */}
      <div className="flex-1 min-h-0 bg-terminal-surface/30 rounded-xl border border-terminal-border p-3 sm:p-4">
        <TranscriptList
          userTranscripts={state.userTranscripts}
          agentTranscripts={state.agentTranscripts}
        />
      </div>

      {/* Tool Calls */}
      {state.toolCalls.length > 0 && (
        <section aria-label="Tool activity" className="space-y-2">
          <h2 className="text-sm font-mono text-terminal-muted flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 114 0v2h2V4z"/>
            </svg>
            Tool Activity
          </h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {state.toolCalls.map((call) => (
              <ToolCallCard key={call.call_id} call={call} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}