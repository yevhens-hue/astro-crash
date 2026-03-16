'use client';

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';

const AGE_GATE_KEY = 'astro_hub_age_verified';

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(AGE_GATE_KEY);
    setVerified(stored === 'true');
  }, []);

  // Still loading from localStorage
  if (verified === null) return null;

  if (declined) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 text-center z-[200]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white uppercase mb-2">Access Denied</h1>
        <p className="text-white/50 text-sm">
          You must be 18 or older to access this platform.
        </p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[200]"
           style={{ background: 'radial-gradient(ellipse at top, #0a0a1a 0%, #000 100%)' }}>
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center max-w-sm gap-5">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.3)] rotate-3">
            <Shield className="w-10 h-10 text-black" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black uppercase italic text-white tracking-tight">
              Age Verification
            </h1>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
              Astro Hub — TON Gaming Platform
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left w-full">
            <p className="text-white/80 text-sm leading-relaxed">
              This platform contains <span className="text-gold font-bold">real-money gaming</span> content
              using TON cryptocurrency. By continuing, you confirm that:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                'You are 18 years of age or older',
                'Online gaming is legal in your jurisdiction',
                'You agree to our Terms of Service',
                'You understand the risks of crypto gaming',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="text-gold mt-0.5 text-base leading-none">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setDeclined(true)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm font-bold hover:bg-white/5 transition-colors"
            >
              I&apos;m Under 18
            </button>
            <button
              onClick={() => {
                localStorage.setItem(AGE_GATE_KEY, 'true');
                setVerified(true);
              }}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-gold to-amber-500 text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(255,215,0,0.3)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.5)] transition-all active:scale-95"
            >
              I&apos;m 18+ — Enter
            </button>
          </div>

          <div className="flex gap-4 text-[10px] text-white/25 font-bold uppercase tracking-widest">
            <a href="/terms" className="hover:text-white/50 transition-colors flex items-center gap-1">
              Terms <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a href="/privacy" className="hover:text-white/50 transition-colors flex items-center gap-1">
              Privacy <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <p className="text-[9px] text-white/15 leading-relaxed text-center">
            ⚠️ Gambling can be addictive. Play responsibly. Not available in the US, UK, France, Netherlands, Spain, or other restricted jurisdictions.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
