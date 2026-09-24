'use client';

import { useState } from 'react';
import { Logo } from './Logo';
import { AuthPanel } from './AuthPanel';

interface LandingPageProps {
  isGuest: boolean;
  onGuestSession: () => void;
  onAuthenticated: (user: { email: string; id: string; createdAt: string }) => void;
}

const EXAMPLE_PROMPTS = [
  'Explain how recursion works in Python',
  'Help me debug this JavaScript code',
  'What is a binary search tree?',
  'Calculate compound interest formula',
  'Show me a React useEffect example',
  'Explain Big O notation',
];

function SparklesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M5 21v-4M3 19h4M21 3v4m0-4h-4m4 16v4m0-4h-4M11 8a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export function LandingPage({ isGuest, onGuestSession, onAuthenticated }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);

  const handleStartSession = () => {
    if (isGuest) {
      onGuestSession();
    } else {
      setShowAuth(true);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - simplified for landing */}
      <aside className="hidden lg:flex lg:flex-col h-full w-72 bg-terminal-surface border-r border-terminal-border flex-shrink-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center p-4 border-b border-terminal-border">
            <Logo size={28} />
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              type="button"
              onClick={handleStartSession}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-mono text-terminal-text bg-terminal-bg rounded-lg border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors"
            >
              <span className="flex-1 text-left">New session</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <div className="pt-4 border-t border-terminal-border">
              <p className="text-xs font-mono text-terminal-muted mb-3">Examples</p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {EXAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={handleStartSession}
                    className="w-full px-3 py-2 text-xs font-mono text-terminal-muted bg-transparent rounded-lg hover:bg-terminal-bg hover:text-terminal-text transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </nav>
          <div className="p-4 border-t border-terminal-border">
            <button
              type="button"
              onClick={handleStartSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-terminal-accent text-terminal-bg font-mono text-sm font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Start Session</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Logo size={48} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-mono font-bold text-terminal-accent tracking-tight">
                Syntax
              </h1>
              <p className="text-lg sm:text-xl text-terminal-muted font-mono">
                learn to code, out loud
              </p>
              <p className="text-base text-terminal-muted max-w-md mx-auto">
                A voice-based coding tutor. Speak naturally, get spoken explanations. 
                Upload images or PDFs, choose your learning level, and export sessions.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FeatureCard 
                icon={<SparklesIcon className="h-6 w-6" />}
                title="Voice First"
                desc="Natural conversation with an AI tutor that explains concepts aloud"
              />
              <FeatureCard 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                title="Document Understanding"
                desc="Upload screenshots, code snippets, or PDFs — the tutor reads and explains them"
              />
              <FeatureCard 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                title="Adaptive Learning"
                desc="Choose your level (Entry to Advanced) and path (Python, Web, Algorithms, Math)"
              />
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleStartSession}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-terminal-accent text-terminal-bg font-mono text-base font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Start Voice Session</span>
              </button>
              <p className="mt-3 text-sm text-terminal-muted">
                {isGuest 
                  ? 'Guest session — conversations are not saved' 
                  : 'Sign in to save conversations, or continue as guest'}
              </p>
            </div>

            {/* Auth Modal */}
            {showAuth && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md">
                  <AuthPanel
                    onAuthenticated={(user) => {
                      onAuthenticated(user);
                      setShowAuth(false);
                    }}
                    onGuest={onGuestSession}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-5 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-terminal-bg border border-terminal-border mb-3 text-terminal-accent">
        {icon}
      </div>
      <h3 className="font-mono text-sm font-semibold text-terminal-text mb-1">{title}</h3>
      <p className="text-xs text-terminal-muted">{desc}</p>
    </div>
  );
}