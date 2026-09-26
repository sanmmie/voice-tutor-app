'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { AuthPanel } from './AuthPanel';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Controls } from './Controls';
import { StatusBar } from './StatusBar';
import { TranscriptList } from './TranscriptList';
import { ToolCallCard } from './ToolCallCard';
import { Logo } from './Logo';
import { Sidebar } from './Sidebar';
import { PDFViewer } from './PDFViewer';
import { LandingPage } from './LandingPage';

export function VoiceTutor() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [learningLevel, setLearningLevel] = useState<'entry' | 'basic' | 'intermediate' | 'advanced'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('syntax_learning_level') as 'entry' | 'basic' | 'intermediate' | 'advanced') || 'basic';
    }
    return 'basic';
  });
  const [learningPath, setLearningPath] = useState<'python' | 'web' | 'algorithms' | 'math' | 'general'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('syntax_learning_path') as 'python' | 'web' | 'algorithms' | 'math' | 'general') || 'general';
    }
    return 'general';
  });
  const [pdfViewer, setPdfViewer] = useState<{ src: string; fileName: string } | null>(null);

  const { state, startSession, disconnect, setTranscripts, isConnected, isRecording } = useVoiceAgent({
    learningLevel,
    learningPath,
    isGuest,
  });

  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedChatRef = useRef(false);
  const authCheckedRef = useRef(false);

  // Persist learning settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('syntax_learning_level', learningLevel);
      localStorage.setItem('syntax_learning_path', learningPath);
    }
  }, [learningLevel, learningPath]);

  // Check auth status in background (non-blocking)
  useEffect(() => {
    if (authCheckedRef.current || isGuest) return;
    authCheckedRef.current = true;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    fetch('/api/auth/me', { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        const authenticatedUser = data?.user || null;
        if (authenticatedUser) {
          setUser(authenticatedUser);
          const parsedId = parseInt(authenticatedUser.id, 10);
          if (!isNaN(parsedId)) {
            setUserId(parsedId);
          }
        }
      })
      .catch(() => {
        // Silently fail - user stays as guest
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isGuest]);

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

  // Initialize chat for authenticated users
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
      setCurrentChatId(null);
      disconnect();
      await startSession();
    }
  }, [userId, disconnect, startSession]);

  const handleLevelChange = useCallback((level: 'entry' | 'basic' | 'intermediate' | 'advanced') => {
    setLearningLevel(level);
  }, []);

  const handlePathChange = useCallback((path: 'python' | 'web' | 'algorithms' | 'math' | 'general') => {
    setLearningPath(path);
  }, []);

  const handleDocumentReady = useCallback((name: string, type: 'image' | 'pdf') => {
    // Handled by DocumentUpload/PDFViewer
  }, []);

  const openPdfViewer = useCallback((src: string, fileName: string) => {
    setPdfViewer({ src, fileName });
  }, []);

  const startGuestSession = useCallback(async () => {
    setIsGuest(true);
    await startSession({ guest: true });
  }, [startSession]);

  const handleStart = () => {
    startSession(isGuest ? { guest: true } : undefined);
  };

  const handleStop = () => {
    disconnect();
  };

  const handleSignIn = async (authenticatedUser: { email: string; id: string; createdAt: string }) => {
    setShowSignInModal(false);
    setIsGuest(false);
    setUser(authenticatedUser);
    const parsedId = parseInt(authenticatedUser.id, 10);
    if (!isNaN(parsedId)) {
      setUserId(parsedId);
    }
  };

  const handleSignOut = async () => {
    disconnect();
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsGuest(false);
    setUser(null);
    setUserId(null);
    setCurrentChatId(null);
    hasInitializedChatRef.current = false;
    authCheckedRef.current = false;
  };

  // Show landing page if not guest and not authenticated (first visit)
  if (!user && !isGuest) {
    return (
      <LandingPage
        onGuestSession={startGuestSession}
        onAuthenticated={handleSignIn}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-screen bg-terminal-bg">
      {/* Sidebar - only for authenticated users */}
      {user && (
        <Sidebar
          userId={userId || 0}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          learningLevel={learningLevel}
          learningPath={learningPath}
          onLevelChange={handleLevelChange}
          onPathChange={handlePathChange}
          onDocumentReady={handleDocumentReady}
          onOpenPdfViewer={openPdfViewer}
          isGuest={false}
          isOpen={sidebarOpen}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 ${user ? 'lg:pl-[20rem]' : ''}`}>
        {/* Mobile sidebar toggle */}
        {user && (
          <div className="lg:hidden p-3 border-b border-terminal-border bg-terminal-surface">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-lg text-terminal-muted hover:text-terminal-accent hover:bg-terminal-bg transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-terminal-border bg-terminal-surface/50 sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Logo size={32} />
            <h1 className="text-xl sm:text-2xl font-mono font-bold text-terminal-accent truncate">Syntax</h1>
            <span className="text-xs text-terminal-muted hidden sm:inline">learn to code, out loud</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <span className="hidden md:inline text-xs text-terminal-muted truncate max-w-[200px]" title={user.email}>
                {user.email}
              </span>
            )}
            <StatusBar status={state.status} error={state.error} sessionId={state.sessionId} />
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 rounded-lg text-xs font-mono text-terminal-muted hover:text-terminal-accent hover:bg-terminal-bg transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent"
            >
              {isGuest ? 'Exit guest' : 'Sign out'}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-4 min-h-0">
          {/* Guest banner - Sign in to save */}
          {isGuest && (
            <div className="mx-3 mb-2 p-3 rounded-xl border border-delta-blue-500/30 bg-delta-blue-500/5 animate-slide-down">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-delta-blue-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V4m0 0L8 12l8 8 8-8-8-8zm0 4v10" />
                  </svg>
                  <span className="text-xs font-mono text-delta-blue-200 truncate">
                    Guest session — conversations are not saved.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignInModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-delta-blue-300 bg-delta-blue-500/10 border border-delta-blue-500/30 hover:bg-delta-blue-500/20 hover:border-delta-blue-400 transition-colors focus-visible:ring-2 focus-visible:ring-delta-blue-400 whitespace-nowrap"
                >
                  Sign in to save
                </button>
              </div>
            </div>
          )}

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
          <div className="flex-1 min-h-0 bg-terminal-surface/30 rounded-xl border border-terminal-border">
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

        {/* Sign in modal for guest users */}
        {showSignInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md animate-slide-up">
              <AuthPanel
                onAuthenticated={handleSignIn}
                onGuest={() => {}}
              />
            </div>
          </div>
        )}
      </main>

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <PDFViewer
          src={pdfViewer.src}
          fileName={pdfViewer.fileName}
          onClose={() => setPdfViewer(null)}
          onProcessComplete={() => setPdfViewer(null)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}