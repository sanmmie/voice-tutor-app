'use client';

import { ToolCallUI } from '@/lib/types';

interface ToolCallCardProps {
  call: ToolCallUI;
}

export function ToolCallCard({ call }: ToolCallCardProps) {
  const statusIcons = {
    pending: '⏳',
    success: '✅',
    error: '❌',
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