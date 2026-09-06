'use client';

import { useEffect, useState } from 'react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { AuthPanel } from './AuthPanel';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Controls } from './Controls';
import { StatusBar } from './StatusBar';
import { TranscriptList } from './TranscriptList';
import { ToolCallCard } from './ToolCallCard';

export function VoiceTutor() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { state, startSession, disconnect, isConnected, isRecording } = useVoiceAgent();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return <div className="font-mono text-terminal-muted">Loading account...</div>;
  }

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  const handleStart = () => {
    startSession();
  };

  const handleStop = () => {
    disconnect();
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold text-terminal-accent">
          🧑‍🏫 Voice Tutor
        </h1>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-terminal-muted sm:inline">{user.email}</span>
          <StatusBar status={state.status} error={state.error} sessionId={state.sessionId} />
          <button
            type="button"
            onClick={async () => { disconnect(); await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); }}
            className="text-xs text-terminal-muted hover:text-terminal-accent"
          >
            Sign out
          </button>
        </div>
      </div>

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
      <div className="flex-1 min-h-[200px] bg-terminal-surface/30 rounded-xl border border-terminal-border p-4">
        <TranscriptList
          userTranscripts={state.userTranscripts}
          agentTranscripts={state.agentTranscripts}
        />
      </div>

      {/* Tool Calls */}
      {state.toolCalls.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-mono text-terminal-muted">🔧 Tool Activity</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {state.toolCalls.map((call) => (
              <ToolCallCard key={call.call_id} call={call} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}