import type { Metadata } from 'next';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'DeltaOS Core — Voice Tutor',
  description: 'A voice-based coding and math tutor powered by DeltaOS Core and AssemblyAI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg text-terminal-text antialiased font-mono">
        {children}
      </body>
    </html>
  );
}