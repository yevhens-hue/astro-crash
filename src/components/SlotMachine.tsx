'use client';

import { useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useTonWallet } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { FEATURE_FLAGS } from '@/lib/flags';

const SYMBOLS = ['💎', '🎭', '👑', '777', '🍒', '🔔', '🍋'];
const REEL_COUNT = 3;

export default function SlotMachine({
    balance = 0,
    onBalanceUpdate
}: {
    balance?: number,
    onBalanceUpdate?: (updater: (prev: number) => number) => void
}) {
    const wallet = useTonWallet();
    const address = wallet?.account.address || (FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);
    const [reels, setReels] = useState(Array(REEL_COUNT).fill(SYMBOLS[0]));
    const [isSpinning, setIsSpinning] = useState(false);
    const controls = [useAnimation(), useAnimation(), useAnimation()];

    const spin = async () => {
        if (isSpinning) return;

        if (!address && !FEATURE_FLAGS.DEBUG_MODE) {
            alert("Please connect your wallet first!");
            return;
        }

        const cost = 0.1;
        if (balance < cost) {
            alert("Insufficient balance!");
            return;
        }

        try {
            setIsSpinning(true);

            // Optimistic UI update
            if (onBalanceUpdate) onBalanceUpdate(prev => prev - cost);

            let finalSymbols: string[];
            let finalWinAmount = 0;

            if (address !== 'guest_test_wallet' || !FEATURE_FLAGS.GUEST_MODE) {
                // Call Secure Edge Function
                const { data, error } = await supabase.functions.invoke('spin-slot', {
                    body: { wallet_address: address }
                });

                if (error || !data?.success) {
                    throw new Error(error?.message || data?.error || 'Failed to spin');
                }

                finalSymbols = data.spinResults;
                finalWinAmount = data.winAmount;
            } else {
                // Local simulation for purely guest/debug mode without a DB account
                finalSymbols = reels.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
                const isWin = finalSymbols.every(s => s === finalSymbols[0]);
                if (isWin) {
                    if (finalSymbols[0] === '777') finalWinAmount = 100.0;
                    else if (finalSymbols[0] === '💎') finalWinAmount = 50.0;
                    else if (finalSymbols[0] === '👑') finalWinAmount = 20.0;
                    else finalWinAmount = 5.0;
                }
            }

            // Start animations while we have the result
            const animations = controls.map((control, i) => {
                return control.start({
                    y: [0, -500, 0],
                    transition: {
                        duration: 1.5 + i * 0.5,
                        ease: "easeInOut"
                    }
                });
            });

            await Promise.all(animations);
            setReels(finalSymbols);

            if (finalWinAmount > 0) {
                if (onBalanceUpdate) onBalanceUpdate(prev => prev + finalWinAmount);
                alert(`🎰 BIG WIN! You won ${finalWinAmount} TON!`);
            }

        } catch (e: any) {
            console.error("Spin failed:", e);
            if (onBalanceUpdate) onBalanceUpdate(prev => prev + cost); // Refund on failure
            alert(`Spin failed: ${e.message || 'Check connection'}`);
        } finally {
            setIsSpinning(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-10 w-full px-4">
            <div className="flex gap-4 p-6 glass-card bg-black/60 border-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.2)] rounded-[2.5rem]">
                {reels.map((symbol, i) => (
                    <div key={i} className="slot-reel flex items-center justify-center text-5xl bg-gradient-to-b from-black via-zinc-900 to-black overflow-hidden h-24 w-24 rounded-3xl border border-white/5 shadow-inner">
                        <motion.div
                            animate={controls[i]}
                            className="flex flex-col items-center justify-center"
                        >
                            <span>{symbol}</span>
                        </motion.div>
                    </div>
                ))}
            </div>

            <button
                onClick={spin}
                disabled={isSpinning}
                className={`gold-button w-full text-3xl py-8 shadow-[0_15px_35px_-10px_rgba(212,175,55,0.6)] rounded-[2rem] font-black italic tracking-tighter active:scale-95 transition-all ${isSpinning ? 'opacity-50 grayscale' : ''}`}
            >
                {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
                <div className="text-xs opacity-60 font-bold mt-1 tracking-widest not-italic">COST: {0.1} TON</div>
            </button>

            {FEATURE_FLAGS.GUEST_MODE && !wallet && (
                <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full">
                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] animate-pulse">
                        Guest Testing Mode Active
                    </p>
                </div>
            )}
        </div>
    );
}
