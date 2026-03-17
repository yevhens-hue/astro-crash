import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Restricted — Astro Hub',
  description: 'This service is not available in your region',
};

export default function BlockedPage({
  searchParams,
}: {
  searchParams: { country?: string; region?: string }
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <div className="text-6xl mb-6">🌍</div>
        <h1 className="text-3xl font-black uppercase italic text-white tracking-tight mb-3">
          Not Available
          <br />
          <span className="text-white/40">In Your Region</span>
        </h1>
        {searchParams?.country && (
          <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-white/80 text-sm font-bold tracking-widest uppercase mb-6 border border-white/20">
            Detected: {searchParams.country} {searchParams.region ? `(${searchParams.region})` : ''}
          </div>
        )}
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Astro Hub is not available in your region due to local gambling regulations.
          We comply with applicable laws and restrict access to users in jurisdictions
          where online gaming is prohibited.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2">Restricted Regions Include:</p>
          <p className="text-white/50 text-xs leading-relaxed">
            United States, United Kingdom, France, Netherlands, Spain, Singapore, 
            Australia, South Korea, China, and other jurisdictions with online 
            gambling restrictions.
          </p>
        </div>
        <div className="mt-6 flex gap-4 justify-center text-xs text-white/25 font-bold uppercase tracking-widest">
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
        </div>
      </div>
    </div>
  );
}
