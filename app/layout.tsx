import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: 'DeltaOS Core — Voice Tutor',
  description: 'A voice-based coding and math tutor powered by DeltaOS Core and AssemblyAI.',
  // Tell browsers to render the chrome in dark mode to match the UI.
  other: {
    'color-scheme': 'dark',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-terminal-bg text-terminal-text antialiased font-mono">
        {/* Skip-to-content link for keyboard users (WCAG 2.4.1). */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <main id="main-content" className="flex-1 min-h-screen w-full">
          {children}
        </main>
      </body>
    </html>
  );
}