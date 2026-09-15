'use client';

import { FormEvent, useState } from 'react';

interface AuthPanelProps {
  onAuthenticated: (user: { email: string; id: string; createdAt: string }) => void;
  onGuest?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function evaluatePassword(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: 'bg-terminal-border' };
  if (password.length < 8) return { score: 0, label: 'Too short', color: 'bg-red-500' };

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  let score: 0 | 1 | 2 | 3 | 4 = 1;
  if (password.length >= 12) score = 2;
  if (password.length >= 16) score = 3;

  if (variety >= 3) {
    score = (Math.max(score, 2) as 0 | 1 | 2 | 3 | 4);
    if (password.length >= 12 && variety === 4) score = 4;
    if (password.length >= 16 && variety >= 3) score = 4;
  }

  if (password.length < 12 && variety < 3) score = 1;

  switch (score) {
    case 1:
      return { score, label: 'Weak', color: 'bg-red-500' };
    case 2:
      return { score, label: 'Fair', color: 'bg-amber-500' };
    case 3:
      return { score, label: 'Strong', color: 'bg-emerald-500' };
    case 4:
      return { score, label: 'Very strong', color: 'bg-delta-blue-500' };
    default:
      return { score: 0, label: 'Too short', color: 'bg-red-500' };
  }
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 5.75c-2.5 0-4.75.9-6.5 2.4M9 9a3 3 0 116 0M5.25 7.25A10.05 10.05 0 0112 4.5c7.5 0 10.5 7.5 10.5 7.5a1.3 1.3 0 01-.2.45M15 12a3 3 0 01-6 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c7.5 0 10.5 7.5 10.5 7.5a1.3 1.3 0 01-.2.45M9 9a3 3 0 116 0M5.25 7.25A10.05 10.05 0 0112 4.5c2.5 0 4.75.9 6.5 2.4" />
    </svg>
  );
}

export function AuthPanel({ onAuthenticated, onGuest }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';
  const strength = isRegister ? evaluatePassword(password) : null;

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && !loading) {
      event.preventDefault();
      submit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  return (
    <main className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-surface/50 p-6">
      <h1 className="text-2xl font-mono font-bold text-terminal-accent">Voice Tutor</h1>
      <p className="mt-2 text-sm text-terminal-muted">Sign in to start a private tutoring session.</p>
      <div role="tablist" aria-label="Authentication mode" className="mt-6 flex border-b border-terminal-border">
        {(['login', 'register'] as const).map((option) => (
          <button
            key={option}
            id={`tab-${option}`}
            type="button"
            role="tab"
            aria-selected={mode === option}
            aria-controls="auth-panel"
            onClick={() => {
              setMode(option);
              setError(null);
              if (option === 'login') {
                setConfirmPassword('');
                setConfirmError(null);
              }
            }}
            className={`px-4 py-2 text-sm font-mono capitalize focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg ${mode === option ? 'border-b-2 border-terminal-accent text-terminal-accent' : 'text-terminal-muted'}`}
          >
            {option}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="auth-panel"
        aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'}
        className="mt-5"
      >
        <form onSubmit={submit} onKeyDown={handleKeyDown} className="space-y-4">
          <label className="block text-sm text-terminal-text">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                const value = event.target.value;
                setEmail(value);
                if (isRegister && value && !EMAIL_REGEX.test(value)) {
                  setEmailError('Enter a valid email address');
                } else if (isRegister && value) {
                  setEmailError(null);
                }
              }}
              className="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 text-terminal-text outline-none focus:border-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
            />
            {isRegister && emailError && (
              <span className="mt-1 block text-xs text-red-400">{emailError}</span>
            )}
          </label>
          <label className="block text-sm text-terminal-text">
            Password
            <div className="relative">
              <input
                required
                minLength={12}
                maxLength={128}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 pr-10 text-terminal-text outline-none focus:border-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
              />
              <button
                type="button"
                id="toggle-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-2 flex items-center justify-center rounded p-1.5 text-terminal-muted hover:text-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {isRegister && strength && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-terminal-border">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="mt-1 block text-xs text-terminal-muted">
                  Strength: <span className="text-terminal-text">{strength.label}</span>
                </span>
              </div>
            )}
          </label>
          {isRegister && (
            <label className="block text-sm text-terminal-text">
              Confirm password
              <div className="relative">
                <input
                  required
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    const value = event.target.value;
                    setConfirmPassword(value);
                    if (value && value !== password) {
                      setConfirmError('Passwords do not match');
                    } else {
                      setConfirmError(null);
                    }
                  }}
                  className="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-3 py-2 pr-10 text-terminal-text outline-none focus:border-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
                />
                <button
                  type="button"
                  id="toggle-confirm-password"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-2 top-2 flex items-center justify-center rounded p-1.5 text-terminal-muted hover:text-terminal-accent focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirmError && <span className="mt-1 block text-xs text-red-400">{confirmError}</span>}
            </label>
          )}
{error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-terminal-accent px-4 py-3 font-mono text-sm font-semibold text-terminal-bg focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Working...
              </span>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          {onGuest && (
            <button
              type="button"
              onClick={onGuest}
              disabled={loading}
              className="w-full rounded border border-delta-blue-500/40 bg-delta-blue-500/5 px-4 py-3 font-mono text-sm font-semibold text-delta-blue-300 transition-colors hover:bg-delta-blue-500/15 hover:border-delta-blue-400 focus-visible:ring-2 focus-visible:ring-delta-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue as Guest
            </button>
          )}
        </form>
      </div>
    </main>
  );
}