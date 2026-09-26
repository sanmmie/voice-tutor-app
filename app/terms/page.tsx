import { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service \u2014 Syntax',
  description: 'Terms of Service for Syntax, the voice-based coding tutor.',
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-lg text-terminal-muted">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">1. Acceptance of Terms</h2>
            <p className="text-terminal-muted leading-relaxed">
              By accessing and using Syntax (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you disagree with any part of these Terms, you may not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">2. Description of Service</h2>
            <p className="text-terminal-muted leading-relaxed">
              Syntax is a voice-based coding tutor that uses AI to help you learn programming concepts, debug code, solve math problems, and understand technical documentation through natural spoken conversation.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>You may use Syntax as a guest without creating an account. Guest sessions are not persisted.</li>
              <li>To save conversation history and access personalized features, you must create an account with a valid email address.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must be at least 13 years old to create an account.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">4. Acceptable Use</h2>
            <p className="text-terminal-muted leading-relaxed">
              You agree not to use the Service for any unlawful or prohibited purpose, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>Violating any applicable laws or regulations</li>
              <li>Attempting to reverse engineer, decompile, or extract the underlying AI models</li>
              <li>Generating harmful, illegal, or offensive content</li>
              <li>Interfering with the Service\u2019s operation or security</li>
              <li>Using the Service for commercial purposes without explicit permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">5. Intellectual Property</h2>
            <p className="text-terminal-muted leading-relaxed">
              The Service and its original content, features, and functionality are owned by Syntax and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-terminal-muted leading-relaxed">
              You retain ownership of any code or content you create while using the Service. By using the Service, you grant us a license to process your inputs solely for the purpose of providing the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">6. Privacy</h2>
            <p className="text-terminal-muted leading-relaxed">
              Your use of the Service is also governed by our <Link href="/privacy" className="underline hover:text-terminal-accent">Privacy Policy</Link>. Please review it to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">7. Disclaimers</h2>
            <p className="text-terminal-muted leading-relaxed">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind. Syntax does not guarantee that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-terminal-muted leading-relaxed">
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li>The AI-generated responses will be accurate, complete, or suitable for any particular purpose</li>
              <li>Any errors in the Service will be corrected</li>
            </ul>
            <p className="text-terminal-muted leading-relaxed mt-2">
              You acknowledge that AI-generated content may contain inaccuracies and should not be relied upon for critical decisions without independent verification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">8. Limitation of Liability</h2>
            <p className="text-terminal-muted leading-relaxed">
              To the maximum extent permitted by law, Syntax shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">9. Termination</h2>
            <p className="text-terminal-muted leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">10. Changes to Terms</h2>
            <p className="text-terminal-muted leading-relaxed">
              We may modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">11. Governing Law</h2>
            <p className="text-terminal-muted leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Syntax operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-xl font-semibold text-terminal-text">12. Contact</h2>
            <p className="text-terminal-muted leading-relaxed">
              If you have any questions about these Terms, please contact us at <a href="mailto:legal@syntax.app" className="underline hover:text-terminal-accent">legal@syntax.app</a>.
            </p>
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