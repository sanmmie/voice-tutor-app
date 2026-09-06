'use client';

interface StatusBarProps {
  status: string;
  error: string | null;
  sessionId: string | null;
}

export function StatusBar({ status, error, sessionId }: StatusBarProps) {
  const statusColors: Record<string, string> = {
    idle: 'bg-terminal-muted',
    connecting: 'bg-yellow-500 animate-pulse-slow',
    connected: 'bg-blue-500',
    recording: 'bg-terminal-accent animate-pulse-slow',
    disconnected: 'bg-terminal-muted',
    error: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    idle: 'Ready',
    connecting: 'Connecting...',
    connected: 'Connected',
    recording: '🎙️ Live',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || 'bg-terminal-muted'}`} />
      <span className="text-terminal-text">{statusLabels[status] || status}</span>
      {sessionId && (
        <span className="text-terminal-muted text-xs">
          session: {sessionId.slice(0, 12)}...
        </span>
      )}
      {error && (
        <span className="text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}