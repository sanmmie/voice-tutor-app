import type { Metadata } from 'next';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Voice Tutor — AssemblyAI LabLab',
  description: 'A voice-based coding and math tutor powered by AssemblyAI Voice Agent API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg text-terminal-text antialiased font-mono">
        <main className="w-full min-h-screen flex items-center justify-center p-4">
          {children}
        </main>
      </body>
    </html>
  );
}