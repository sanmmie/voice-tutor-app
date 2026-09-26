'use client';

import { useState, useCallback } from 'react';

interface TextInputProps {
  onSendText: (text: string) => void;
  isConnected: boolean;
  isRecording: boolean;
  placeholder?: string;
}

function SendIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

export function TextInput({ onSendText, isConnected, isRecording, placeholder = 'Type a message...' }: TextInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !isConnected || isSubmitting) return;

    setIsSubmitting(true);
    try {
      onSendText(trimmed);
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, isConnected, isSubmitting, onSendText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const canSend = isConnected && text.trim() !== '' && !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-4">
      <div className="flex items-center gap-2 bg-terminal-surface/60 border border-terminal-border rounded-xl p-2 transition-colors">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!isConnected || isSubmitting}
          className="flex-1 bg-transparent text-terminal-text placeholder-terminal-muted font-mono text-sm outline-none focus:ring-0 disabled:opacity-50"
          aria-label="Type a message"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="flex items-center justify-center p-2 rounded-lg text-terminal-muted hover:text-terminal-accent hover:bg-terminal-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-terminal-accent"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
      {!isConnected && (
        <p className="text-xs text-terminal-muted text-center mt-2 font-mono">
          Connect to start typing
        </p>
      )}
    </form>
  );
}