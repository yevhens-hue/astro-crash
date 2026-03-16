import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Astro Hub',
  description: 'Terms of Service for Astro Hub TON gaming platform',
};

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing or using Astro Hub ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Platform. We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.`,
    },
    {
      title: '2. Eligibility',
      content: `You must be at least 18 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use this Platform. By using the Platform, you represent and warrant that you meet this age requirement. We reserve the right to request age verification at any time.`,
    },
    {
      title: '3. Restricted Jurisdictions',
      content: `The Platform is NOT available to residents of: United States of America, United Kingdom, France, Netherlands, Spain, Singapore, Australia, South Africa, Hungary, Czech Republic, Poland, Romania, or any other jurisdiction where online gambling is prohibited. It is your responsibility to ensure that participating in gaming activities is legal in your jurisdiction.`,
    },
    {
      title: '4. Nature of the Platform',
      content: `Astro Hub is a blockchain-based gaming platform that uses TON cryptocurrency. All gaming outcomes are determined by a provably fair algorithm. The Platform does not guarantee any winnings. TON cryptocurrency has inherent volatility risk. You acknowledge that you may lose all funds deposited.`,
    },
    {
      title: '5. Provably Fair Gaming',
      content: `All game results are generated using a cryptographically verifiable algorithm. The server seed, client seed, and nonce are used to calculate outcomes. You can independently verify any game result. The house edge is transparently disclosed within each game.`,
    },
    {
      title: '6. Deposits and Withdrawals',
      content: `All transactions are conducted in TON cryptocurrency on the TON blockchain. Minimum deposit: 0.1 TON. Minimum withdrawal: 0.5 TON. Withdrawal processing time may vary based on network congestion. The Platform is not responsible for delays caused by blockchain network issues.`,
    },
    {
      title: '7. Responsible Gaming',
      content: `We are committed to responsible gaming. If you believe you have a gambling problem, please seek help immediately. You can self-exclude by contacting our support. We provide tools to set deposit limits and self-exclusion periods. Resources: GamCare (gamcare.org.uk), Gamblers Anonymous (gamblersanonymous.org).`,
    },
    {
      title: '8. Account Security',
      content: `Your account is linked to your TON wallet address and Telegram account. You are responsible for maintaining the security of your wallet. The Platform cannot recover funds sent to incorrect addresses. Never share your private keys or seed phrase with anyone, including Platform staff.`,
    },
    {
      title: '9. Prohibited Activities',
      content: `Prohibited activities include: attempting to exploit bugs or vulnerabilities; using automated scripts or bots; money laundering or fraud; creating multiple accounts to abuse bonuses; any activity that violates applicable law. Violation may result in immediate account suspension and forfeiture of funds.`,
    },
    {
      title: '10. Limitation of Liability',
      content: `To the maximum extent permitted by law, the Platform and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages. The Platform is provided "as is" without warranties of any kind, either express or implied.`,
    },
    {
      title: '11. Dispute Resolution',
      content: `Any disputes shall be resolved by contacting our support team first. We aim to resolve all disputes within 5 business days. All disputes are subject to the laws of the jurisdiction where the Platform operator is registered. By using the Platform, you waive the right to participate in class action lawsuits.`,
    },
    {
      title: '12. Contact',
      content: `For support, disputes, or questions about these Terms, contact us through the official Telegram bot. We respond to all inquiries within 48 hours on business days.`,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-block px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-black uppercase tracking-widest mb-4">
            Legal Document
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">
            Terms of Service
          </h1>
          <p className="text-white/40 text-sm">
            Astro Hub Gaming Platform · Last updated: March 2026
          </p>
        </div>

        {/* Warning */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">⚠️ Important</p>
          <p className="text-white/70 text-sm">
            This platform involves real cryptocurrency. You can lose all deposited funds. 
            Only play with money you can afford to lose. Must be 18+ to participate.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="border-b border-white/5 pb-6 last:border-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-gold mb-3">
                {section.title}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 flex gap-6 text-xs text-white/25 font-bold uppercase tracking-widest">
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
          <a href="/" className="hover:text-white/50 transition-colors">← Back to App</a>
        </div>
      </div>
    </div>
  );
}
