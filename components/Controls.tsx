'use client';

interface ControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  status: string;
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m7-7a7 7 0 00-7 7m7-7v-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4m-7 7h10a2 2 0 002-2v-3a2 2 0 00-2-2H7a2 2 0 00-2 2v3a2 2 0 002 2z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function Controls({ isConnected, isRecording, onStart, onStop, status }: ControlsProps) {
  const isBusy = status === 'connecting';

  return (
    <div className="flex items-center gap-4">
      {!isConnected && !isRecording && (
        <button
          type="button"
          onClick={onStart}
          disabled={isBusy}
          className={`group inline-flex items-center gap-2 px-6 py-3 rounded-full font-mono text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg ${
            isBusy
              ? 'bg-terminal-border text-terminal-muted cursor-not-allowed'
              : 'bg-terminal-accent text-terminal-bg hover:bg-terminal-accentDim hover:scale-105 active:scale-95'
          }`}
        >
          <MicIcon />
          {isBusy ? 'Starting...' : 'Start Tutoring'}
        </button>
      )}

      {(isConnected || isRecording) && (
        <button
          type="button"
          onClick={onStop}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-mono text-sm font-semibold transition-all bg-red-500/80 text-white hover:bg-red-600 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
        >
          <StopIcon />
          Stop Session
        </button>
      )}
    </div>
  );
}