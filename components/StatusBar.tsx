'use client';

interface StatusBarProps {
  status: string;
  error: string | null;
  sessionId: string | null;
}

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
    </svg>
  );
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
    recording: 'Live',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  const label = statusLabels[status] || status;

  return (
    <div
      className="flex items-center gap-3 font-mono text-sm"
      role="status"
      aria-live={error ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="sr-only">Session status:</span>
      <span
        className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || 'bg-terminal-muted'}`}
        aria-hidden="true"
      />
      <span className="text-terminal-text">{label}</span>
      {sessionId && (
        <span className="text-terminal-muted text-xs">
          session: {sessionId.slice(0, 12)}...
        </span>
      )}
      {error && (
        <span
          className="inline-flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded"
          role="alert"
        >
          <WarningIcon />
          {error}
        </span>
      )}
    </div>
  );
}