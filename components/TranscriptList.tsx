'use client';

import { useEffect, useRef } from 'react';
import { TranscriptMessage } from '@/lib/types';

interface TranscriptListProps {
  userTranscripts: TranscriptMessage[];
  agentTranscripts: TranscriptMessage[];
}

export function TranscriptList({ userTranscripts, agentTranscripts }: TranscriptListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [userTranscripts, agentTranscripts]);

  const allMessages = [
    ...agentTranscripts.map((t) => ({ ...t, speaker: 'agent' as const })),
    ...userTranscripts.map((t) => ({ ...t, speaker: 'user' as const })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  if (allMessages.length === 0) {
    return (
      <div className="text-terminal-muted text-sm text-center py-8 font-mono">
        No conversation yet — start speaking!
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[400px]">
      {allMessages.map((msg) => {
        const isUser = msg.speaker === 'user';
        const isPartial = isUser && !msg.isFinal;
        // Stable key per message: timestamp + first 8 chars of text. Using an
        // array index as the key was wrong because partials get replaced in
        // place (not appended), which made React lose track of elements and
        // re-render the list on every delta.
        const key = `${msg.timestamp}:${msg.text.slice(0, 8)}`;
        return (
          <div
            key={key}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] px-4 py-2 rounded-2xl font-mono text-sm ${
                isUser
                  ? isPartial
                    ? 'bg-terminal-border text-terminal-muted italic'
                    : 'bg-terminal-accent/20 text-terminal-text border border-terminal-accent/30'
                  : 'bg-terminal-surface text-terminal-text border border-terminal-border'
              }`}
            >
                <span className="text-xs text-terminal-muted block mb-0.5">
                  <span aria-hidden="true">{isUser ? '🧑' : '🏫'}</span>{' '}
                  <span className="visually-hidden">{isUser ? 'You' : 'Tutor'}</span>
                  {isUser ? 'You' : 'Tutor'}
                  {isPartial && ' (typing...)'}
                </span>
                <span className="whitespace-pre-wrap break-words">{msg.text}</span>
              </div>
            </div>
          );
      })}
    </div>
  );
}