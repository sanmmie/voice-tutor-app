'use client';

import { useState } from 'react';
import { Logo } from './Logo';
import { AuthPanel } from './AuthPanel';

interface LandingPageProps {
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

export function LandingPage({ onGuestSession, onAuthenticated }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      {/* Top bar - minimal, just sign in link */}
      <header className="border-b border-terminal-border bg-terminal-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo size={28} />
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="text-sm font-mono text-terminal-muted hover:text-terminal-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-terminal-bg"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="w-full max-w-3xl text-center space-y-10">
          {/* Logo & Title */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Logo size={56} />
            </div>
            <h1 className="text-5xl sm:text-6xl font-mono font-bold text-terminal-accent tracking-tight">
              Syntax
            </h1>
            <p className="text-xl sm:text-2xl text-terminal-muted font-mono max-w-2xl mx-auto">
              learn to code, out loud
            </p>
          </div>

          {/* Description */}
          <p className="text-base sm:text-lg text-terminal-muted max-w-2xl mx-auto leading-relaxed">
            A voice-based coding tutor. Speak naturally, get spoken explanations. 
            Upload images or PDFs, choose your learning level, and export sessions.
          </p>

          {/* Primary CTA - Start Voice Session (Guest) */}
          <div className="space-y-3 pt-4">
            <button
              type="button"
              onClick={onGuestSession}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-terminal-accent text-terminal-bg font-mono text-lg font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg w-full sm:w-auto"
            >
              <SparklesIcon className="h-6 w-6" />
              <span>Start Voice Session</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <p className="text-sm text-terminal-muted">
              No account needed — start instantly as a guest
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
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

          {/* Example prompts */}
          <div className="border-t border-terminal-border pt-8">
            <p className="text-sm font-mono text-terminal-muted mb-4">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={onGuestSession}
                  className="px-4 py-2 text-sm font-mono text-terminal-muted bg-terminal-surface/50 border border-terminal-border rounded-lg hover:border-terminal-accent hover:text-terminal-text hover:bg-terminal-bg transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border bg-terminal-surface/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-terminal-muted">
          <p>By continuing, you agree to our <a href="/terms" className="underline hover:text-terminal-accent">Terms</a> and <a href="/privacy" className="underline hover:text-terminal-accent">Privacy Policy</a>.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up">
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
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-terminal-bg border border-terminal-border mb-4 text-terminal-accent">
        {icon}
      </div>
      <h3 className="font-mono text-base font-semibold text-terminal-text mb-2">{title}</h3>
      <p className="text-sm text-terminal-muted">{desc}</p>
    </div>
  );
}