'use client';

import { ReactNode } from 'react';
import { ToolCallUI } from '@/lib/types';

interface ToolCallCardProps {
  call: ToolCallUI;
}

export function ToolCallCard({ call }: ToolCallCardProps) {
  const statusIcons: Record<string, ReactNode> = {
    pending: (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="visually-hidden">Pending</span>
      </>
    ),
    success: (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15.75 9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="visually-hidden">Success</span>
      </>
    ),
    error: (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="visually-hidden">Error</span>
      </>
    ),
  };

  const statusColors = {
    pending: 'text-yellow-400 border-yellow-400/30',
    success: 'text-terminal-accent border-terminal-accent/30',
    error: 'text-red-400 border-red-400/30',
  };

  const argsStr = Object.entries(call.args)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
    .join(', ');

  return (
    <div
      className={`font-mono text-xs border rounded-lg p-3 bg-terminal-surface/50 ${statusColors[call.status]}`}
    >
      <div className="flex items-center gap-2">
        <span>{statusIcons[call.status]}</span>
        <span className="font-semibold">{call.name}</span>
        <span className="text-terminal-muted">({argsStr})</span>
      </div>
      {call.result && call.status === 'success' && (
        <div className="mt-1 text-terminal-text whitespace-pre-wrap break-all">
          → {typeof call.result === 'object' ? JSON.stringify(call.result, null, 2) : String(call.result)}
        </div>
      )}
      {call.status === 'error' && call.result?.error && (
        <div className="mt-1 text-red-400">{call.result.error}</div>
      )}
    </div>
  );
}