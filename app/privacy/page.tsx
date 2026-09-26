import { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy \u2014 Syntax',
  description: 'Privacy Policy for Syntax, the voice-based coding tutor.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <header className="border-b border-terminal-border bg-terminal-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Logo size={28} />
          <Link
            href="/"
            className="text-sm font-mono text-terminal-muted hover:text-terminal-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-terminal-bg"
          >
            Back to Syntax
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <article className="w-full max-w-3xl space-y-8">
          <header className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-mono font-bold text-terminal-accent tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-lg text-terminal-muted">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">1. Introduction</h2>
            <p className="text-terminal-muted leading-relaxed">
              Syntax (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our voice-based coding tutor service (the &ldquo;Service&rdquo;).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">2. Information We Collect</h2>
            <h3 className="font-mono text-base font-semibold text-terminal-text">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li><strong>Account Information:</strong> Email address, password (hashed), and preferences when you create an account</li>
              <li><strong>Conversation Data:</strong> Voice transcripts, tool calls, and session metadata for authenticated users</li>
              <li><strong>Uploaded Content:</strong> Images, PDFs, and documents you choose to upload for analysis</li>
              <li><strong>Settings:</strong> Learning level, learning path, and theme preferences</li>
            </ul>
            <h3 className="font-mono text-base font-semibold text-terminal-text mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li><strong>Usage Data:</strong> Session duration, feature usage, and error logs</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and operating system</li>
              <li><strong>Audio Data:</strong> Voice input is processed in real-time and not stored permanently</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>Provide and maintain the Service, including voice tutoring sessions</li>
              <li>Process and respond to your voice queries using AI models</li>
              <li>Save and sync your conversation history (authenticated users only)</li>
              <li>Personalize your learning experience based on selected level and path</li>
              <li>Improve the Service through analytics and error monitoring</li>
              <li>Send service-related communications (security updates, policy changes)</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">4. Data Storage and Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li><strong>Account Data:</strong> Retained while your account is active. Deleted within 30 days of account deletion.</li>
              <li><strong>Conversation History:</strong> Retained for authenticated users until manually deleted or account deletion.</li>
              <li><strong>Guest Sessions:</strong> Not persisted. Ephemeral only.</li>
              <li><strong>Audio Data:</strong> Processed in real-time via WebSocket. Not recorded or stored on our servers.</li>
              <li><strong>Uploaded Files:</strong> Processed temporarily for analysis. Not stored permanently.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">5. Third-Party Services</h2>
            <p className="text-terminal-muted leading-relaxed">
              We use the following third-party services to operate the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li><strong>AssemblyAI:</strong> Voice Agent API for speech-to-text, LLM routing, text-to-speech, and tool calling</li>
              <li><strong>Upstash Redis:</strong> Distributed rate limiting, session management, and user account storage</li>
              <li><strong>Vercel:</strong> Hosting, edge functions, and analytics</li>
              <li><strong>GitHub:</strong> Optional Gist export (only with your explicit PAT)</li>
              <li><strong>OpenAI-compatible API:</strong> Vision model for image/PDF understanding (configured by operator)</li>
            </ul>
            <p className="text-terminal-muted leading-relaxed mt-2">
              These providers process data on our behalf under strict data processing agreements. We do not sell your data to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">6. Your Rights</h2>
            <p className="text-terminal-muted leading-relaxed">
              Depending on your jurisdiction, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>Access and obtain a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Request deletion of your data (right to be forgotten)</li>
              <li>Restrict or object to processing of your data</li>
              <li>Data portability \u2014 receive your data in a structured format</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-terminal-muted leading-relaxed mt-2">
              To exercise these rights, contact us at <a href="mailto:privacy@syntax.app" className="underline hover:text-terminal-accent">privacy@syntax.app</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">7. Security</h2>
            <p className="text-terminal-muted leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>Encryption in transit (TLS 1.2+) and at rest</li>
              <li>Passwords hashed with bcrypt (never stored in plaintext)</li>
              <li>Rate limiting and abuse prevention</li>
              <li>Regular security audits and dependency updates</li>
              <li>Minimal data collection principle</li>
            </ul>
            <p className="text-terminal-muted leading-relaxed mt-2">
              However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">8. Children\u2019s Privacy</h2>
            <p className="text-terminal-muted leading-relaxed">
              The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">9. International Transfers</h2>
            <p className="text-terminal-muted leading-relaxed">
              Your data may be processed in countries other than your own, including the United States. We ensure appropriate safeguards (such as Standard Contractual Clauses) are in place for such transfers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">10. Changes to This Policy</h2>
            <p className="text-terminal-muted leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. Continued use of the Service constitutes acceptance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">11. Contact Us</h2>
            <p className="text-terminal-muted leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>Email: <a href="mailto:privacy@syntax.app" className="underline hover:text-terminal-accent">privacy@syntax.app</a></li>
              <li>GitHub: <a href="https://github.com/sanmmie/voice-tutor-app" className="underline hover:text-terminal-accent" target="_blank" rel="noopener noreferrer">github.com/sanmmie/voice-tutor-app</a></li>
            </ul>
          </section>
        </article>
      </main>

      <footer className="border-t border-terminal-border bg-terminal-surface/50 py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-terminal-muted">
          <p>&copy; {new Date().getFullYear()} Syntax. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}