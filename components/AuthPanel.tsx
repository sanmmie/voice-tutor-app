'use client';

import { FormEvent, useState } from 'react';

interface AuthPanelProps {
  onAuthenticated: (user: { email: string }) => void;
}

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      onAuthenticated(data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-surface/50 p-6">
      <h1 className="text-2xl font-mono font-bold text-terminal-accent">Voice Tutor</h1>
      <p className="mt-2 text-sm text-terminal-muted">Sign in to start a private tutoring session.</p>
      <div className="mt-6 flex border-b border-terminal-border">
        {(['login', 'register'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { setMode(option); setError(null); }}
            className={`px-4 py-2 text-sm font-mono capitalize ${mode === option ? 'border-b-2 border-terminal-accent text-terminal-accent' : 'text-terminal-muted'}`}
          >
            {option}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm text-terminal-text">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 text-terminal-text outline-none focus:border-terminal-accent"
          />
        </label>
        <label className="block text-sm text-terminal-text">
          Password
          <input
            required
            minLength={12}
            maxLength={128}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 text-terminal-text outline-none focus:border-terminal-accent"
          />
        </label>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-terminal-accent px-4 py-3 font-mono text-sm font-semibold text-terminal-bg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </main>
  );
}