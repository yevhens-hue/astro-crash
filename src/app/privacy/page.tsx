import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Astro Hub',
  description: 'Privacy Policy for Astro Hub TON gaming platform',
};

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Data We Collect',
      content: `We collect the following information when you use the Platform:
      
• Telegram User ID and username (if provided by Telegram)
• TON wallet address you connect
• Game session data (bets, wins, losses, timestamps)
• Transaction history on the TON blockchain
• Device information (browser type, operating system) for security purposes
• IP address for geo-restriction enforcement

We do NOT collect: passwords, private keys, seed phrases, email addresses, or any financial information beyond what is publicly visible on the TON blockchain.`,
    },
    {
      title: '2. How We Use Your Data',
      content: `Your data is used for the following purposes:

• Operating the gaming platform and processing transactions
• Displaying your game history and balance
• Calculating and distributing referral rewards
• Enforcing geographic restrictions as required by law
• Preventing fraud, cheating, and money laundering
• Communicating important platform updates
• Complying with legal obligations

We do not use your data for advertising purposes or sell it to third parties.`,
    },
    {
      title: '3. Data Storage and Security',
      content: `Your data is stored securely using Supabase (PostgreSQL) with Row Level Security (RLS) policies. All database connections use TLS encryption. We implement rate limiting, input validation, and parameterized queries to prevent attacks. Blockchain transactions are publicly visible on the TON blockchain and cannot be deleted.`,
    },
    {
      title: '4. Telegram Data',
      content: `When you access our Platform via Telegram, Telegram provides us with your Telegram ID, username, and display name. This data is governed by Telegram's own Privacy Policy (telegram.org/privacy). We use this data solely to identify your account and display your username in leaderboards.`,
    },
    {
      title: '5. TON Blockchain Data',
      content: `All TON transactions are permanently recorded on the public blockchain. This includes deposits, withdrawals, and game payouts. This data cannot be deleted or modified. By using the Platform, you acknowledge that your wallet activity is publicly visible on the TON blockchain.`,
    },
    {
      title: '6. Cookies and Local Storage',
      content: `We use browser localStorage to store:
• Age verification confirmation
• Sound and notification preferences  
• Session state for game continuity

We do not use tracking cookies, advertising cookies, or fingerprinting technologies.`,
    },
    {
      title: '7. Data Sharing',
      content: `We share your data only in these circumstances:
• With Supabase (our database provider) under a Data Processing Agreement
• With authorities when legally required (court orders, law enforcement)
• On the public TON blockchain (transaction data)

We do NOT sell, rent, or share your personal data with third parties for marketing.`,
    },
    {
      title: '8. Your Rights (GDPR)',
      content: `If you are in the European Economic Area, you have the right to:
• Access your personal data
• Correct inaccurate data
• Request deletion of your data (note: blockchain data cannot be deleted)
• Object to processing
• Data portability

To exercise these rights, contact us through our Telegram support channel.`,
    },
    {
      title: '9. Responsible Gaming Data',
      content: `If you use self-exclusion or deposit limit features, we retain this data even if you request account deletion — to protect your wellbeing and prevent circumvention of responsible gaming tools.`,
    },
    {
      title: '10. Children\'s Privacy',
      content: `Our Platform is strictly for users 18 and older. We do not knowingly collect data from anyone under 18. If we discover that a user is underage, we will immediately suspend their account and delete their personal data. If you believe a minor has used our Platform, please contact us immediately.`,
    },
    {
      title: '11. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of significant changes through the Platform interface. Your continued use of the Platform after changes constitutes acceptance of the new policy.`,
    },
    {
      title: '12. Contact Us',
      content: `For privacy-related inquiries, data requests, or to report privacy concerns, please contact us through our official Telegram support channel. We respond to all privacy requests within 30 days as required by GDPR.`,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest mb-4">
            Legal Document
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">
            Privacy Policy
          </h1>
          <p className="text-white/40 text-sm">
            Astro Hub Gaming Platform · Last updated: March 2026
          </p>
        </div>

        {/* GDPR Badge */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">🔒 GDPR Compliant</p>
          <p className="text-white/70 text-sm">
            We take your privacy seriously. We only collect data necessary for operating the platform 
            and never sell your personal information to third parties.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="border-b border-white/5 pb-6 last:border-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-3">
                {section.title}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 flex gap-6 text-xs text-white/25 font-bold uppercase tracking-widest">
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</a>
          <a href="/" className="hover:text-white/50 transition-colors">← Back to App</a>
        </div>
      </div>
    </div>
  );
}
