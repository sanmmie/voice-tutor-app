import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: 'Syntax — learn to code, out loud',
  description: 'A voice-based coding tutor. Speak naturally, learn by voice. Upload images/PDFs, select your level, and export sessions.',
  openGraph: {
    title: 'Syntax — learn to code, out loud',
    description: 'A voice-based coding tutor. Speak naturally, learn by voice.',
    type: 'website',
  },
  other: {
    'color-scheme': 'dark light',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
        <ThemeProvider>
          <main id="main-content" className="flex-1 min-h-screen w-full">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}