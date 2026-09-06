'use client';

interface ControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  status: string;
}

export function Controls({ isConnected, isRecording, onStart, onStop, status }: ControlsProps) {
  const isBusy = status === 'connecting' || status === 'idle';

  return (
    <div className="flex items-center gap-4">
      {!isConnected && !isRecording && (
        <button
          onClick={onStart}
          disabled={isBusy}
          className={`px-6 py-3 rounded-full font-mono text-sm font-semibold transition-all
            ${isBusy
              ? 'bg-terminal-border text-terminal-muted cursor-not-allowed'
              : 'bg-terminal-accent text-terminal-bg hover:bg-terminal-accentDim hover:scale-105 active:scale-95'
            }`}
        >
          {isBusy ? 'Starting...' : '🎤 Start Tutoring'}
        </button>
      )}

      {(isConnected || isRecording) && (
        <button
          onClick={onStop}
          className="px-6 py-3 rounded-full font-mono text-sm font-semibold transition-all
            bg-red-500/80 text-white hover:bg-red-600 hover:scale-105 active:scale-95"
        >
          ⏹ Stop Session
        </button>
      )}
    </div>
  );
}