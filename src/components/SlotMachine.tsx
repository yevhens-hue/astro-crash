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

            // 1. Sync User & Subtract Balance
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, balance')
                .eq('wallet_address', address)
                .single();

            if (userError || !userData) throw new Error("User not found");

            // Optimistic UI update
            if (onBalanceUpdate) onBalanceUpdate(prev => prev - cost);

            await supabase
                .from('users')
                .update({ balance: Number(userData.balance) - cost })
                .eq('id', userData.id);

            const spinResults = reels.map(() =>
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
            );

            const txHash = `slot_tx_${Date.now()}`;
            const isWin = spinResults.every(s => s === spinResults[0]);
            const winAmount = isWin ? 1.0 : 0;

            await supabase.from('slot_spins').insert({
                user_id: userData.id,
                wallet_address: address,
                amount: cost,
                result_symbols: spinResults,
                win_amount: winAmount,
                tx_hash: txHash,
                status: 'confirmed'
            });

            if (isWin) {
                await supabase
                    .from('users')
                    .update({ balance: Number(userData.balance) - cost + winAmount })
                    .eq('id', userData.id);
            }

            // Start animations
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
            setReels(spinResults);

            if (isWin) {
                if (onBalanceUpdate) onBalanceUpdate(prev => prev + winAmount);
                alert(`🎰 BIG WIN! You won ${winAmount} TON!`);
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
