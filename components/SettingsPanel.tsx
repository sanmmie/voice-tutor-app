'use client';

import { useState, useCallback } from 'react';
import { TranscriptMessage } from '@/lib/types';

interface SettingsPanelProps {
  learningLevel: 'entry' | 'basic' | 'intermediate' | 'advanced';
  learningPath: 'python' | 'web' | 'algorithms' | 'math' | 'general';
  onLevelChange: (level: 'entry' | 'basic' | 'intermediate' | 'advanced') => void;
  onPathChange: (path: 'python' | 'web' | 'algorithms' | 'math' | 'general') => void;
  userTranscripts?: TranscriptMessage[];
  agentTranscripts?: TranscriptMessage[];
}

const LEVELS = [
  { value: 'entry', label: 'Entry', desc: 'Complete beginner — no prior knowledge' },
  { value: 'basic', label: 'Basic', desc: 'Some familiarity with basics' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with fundamentals' },
  { value: 'advanced', label: 'Advanced', desc: 'Experienced — minimal hand-holding' },
] as const;

const PATHS = [
  { value: 'python', label: 'Python', desc: 'Python, data science, scripting' },
  { value: 'web', label: 'Web Dev', desc: 'HTML/CSS, JS/TS, React, Node.js' },
  { value: 'algorithms', label: 'Algorithms', desc: 'Data structures, complexity, problem-solving' },
  { value: 'math', label: 'Math', desc: 'Algebra, calculus, discrete math, stats' },
  { value: 'general', label: 'General', desc: 'Broad coding & math topics' },
] as const;

function GithubIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MessageIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CopyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 18h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8M8 16a2 2 0 01-2 2v8a2 2 0 002 2h8a2 2 0 012-2v-8a2 2 0 00-2-2H8z" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SettingsPanel({
  learningLevel,
  learningPath,
  onLevelChange,
  onPathChange,
  userTranscripts,
  agentTranscripts,
}: SettingsPanelProps) {
  const [githubToken, setGithubToken] = useState('');
  const [githubTokenSaved, setGithubTokenSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'whatsapp' | 'email' | 'github'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExportWhatsApp = () => {
    const summary = generateSessionSummary();
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setExportStatus({ type: 'whatsapp', message: 'Opened WhatsApp share' });
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportEmail = () => {
    const summary = generateSessionSummary();
    const subject = encodeURIComponent('Syntax Session Summary');
    const body = encodeURIComponent(summary);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = mailtoLink;
    setExportStatus({ type: 'email', message: 'Opened email client' });
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportGist = async () => {
    if (!githubToken.trim()) {
      setExportStatus({ type: 'github', message: 'Please enter a GitHub PAT first' });
      return;
    }

    setExportStatus({ type: 'github', message: 'Creating gist...' });

    try {
      const summary = generateSessionSummary();
      // eslint-disable-next-line react-hooks/purity
      const filename = `syntax-session-${Date.now()}.md`;
      const response = await fetch('/api/gist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          content: summary,
          filename,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create gist');
      }

      setExportStatus({ type: 'github', message: `Gist created: ${data.url}` });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setExportStatus({ type: 'github', message: err instanceof Error ? err.message : 'Failed to create gist' });
    }
  };

  const generateSessionSummary = useCallback(() => {
    const userMessages = userTranscripts?.filter(t => t.isFinal).map(t => `**You:** ${t.text}`).join('\n\n') || '*No user messages*';
    const agentMessages = agentTranscripts?.filter(t => t.isFinal).map(t => `**Tutor:** ${t.text}`).join('\n\n') || '*No tutor responses*';
    
    // Interleave messages by timestamp
    const allMessages = [
      ...(userTranscripts || []).filter(t => t.isFinal).map(t => ({ role: 'user' as const, text: t.text, timestamp: t.timestamp })),
      ...(agentTranscripts || []).filter(t => t.isFinal).map(t => ({ role: 'agent' as const, text: t.text, timestamp: t.timestamp })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    const conversation = allMessages.map(m => `**${m.role === 'user' ? 'You' : 'Tutor'}:** ${m.text}`).join('\n\n') || '*No conversation yet*';

    return `# Syntax Session Summary

**Date:** ${new Date().toLocaleString()}
**Level:** ${learningLevel.charAt(0).toUpperCase() + learningLevel.slice(1)}
**Path:** ${learningPath.charAt(0).toUpperCase() + learningPath.slice(1)}

## Conversation

${conversation}
`;
  }, [userTranscripts, agentTranscripts, learningLevel, learningPath]);

  const handleCopyGistUrl = () => {
    if (exportStatus?.message.includes('gist.github.com')) {
      const url = exportStatus.message.split(' ').find((s) => s.startsWith('https://'));
      if (url) {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="card p-3 space-y-4 animate-fade-in">
      {/* Learning Level */}
      <div>
        <label className="panel-title">Learning Level</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LEVELS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onLevelChange(value as any)}
              className={`p-3 text-left rounded-lg border transition-all ${
                learningLevel === value
                  ? 'border-terminal-accent bg-terminal-accent/10 text-terminal-accent'
                  : 'border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-text'
              }`}
            >
              <p className="font-mono text-sm font-semibold">{label}</p>
              <p className="text-xs mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Learning Path */}
      <div>
        <label className="panel-title">Learning Path</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PATHS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPathChange(value as any)}
              className={`p-3 text-left rounded-lg border transition-all ${
                learningPath === value
                  ? 'border-terminal-accent bg-terminal-accent/10 text-terminal-accent'
                  : 'border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-text'
              }`}
            >
              <p className="font-mono text-sm font-semibold">{label}</p>
              <p className="text-xs mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* GitHub PAT */}
      <div>
        <label className="panel-title">GitHub Personal Access Token</label>
        <p className="text-xs text-terminal-muted mt-1">
          Required for Gist export. Stored in session only.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            placeholder="ghp_..."
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="flex-1 rounded border border-terminal-border bg-terminal-bg px-3 py-2 text-terminal-text outline-none focus:border-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg text-sm font-mono"
            aria-label="GitHub Personal Access Token"
          />
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('syntax_github_token', githubToken);
              setGithubTokenSaved(true);
              setTimeout(() => setGithubTokenSaved(false), 2000);
            }}
            className="px-3 py-2 rounded-lg bg-terminal-accent text-terminal-bg font-mono text-sm font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
          >
            {githubTokenSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Export Actions */}
      <div className="pt-2 border-t border-terminal-border">
        <label className="panel-title">Export Session</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleExportWhatsApp}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-terminal-border bg-terminal-bg hover:border-green-500/50 hover:bg-green-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <MessageIcon className="h-5 w-5 text-green-400" />
            <span className="font-mono text-xs text-terminal-text">WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleExportEmail}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-terminal-border bg-terminal-bg hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <MailIcon className="h-5 w-5 text-blue-400" />
            <span className="font-mono text-xs text-terminal-text">Email</span>
          </button>
          <button
            type="button"
            onClick={handleExportGist}
            disabled={!githubToken.trim()}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-terminal-border bg-terminal-bg hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GithubIcon className="h-5 w-5 text-purple-400" />
            <span className="font-mono text-xs text-terminal-text">GitHub Gist</span>
          </button>
        </div>

        {exportStatus && (
          <div className={`mt-2 p-2 rounded-lg text-xs font-mono ${
            exportStatus.message.includes('Failed') || exportStatus.message.includes('Please')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}>
            {exportStatus.message}
            {copied && <span className="ml-2">✓ Copied</span>}
          </div>
        )}
      </div>
    </div>
  );
}