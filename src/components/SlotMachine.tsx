'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
// Note: wallet is accessed via userAddress prop
import { supabase } from '@/lib/supabase';
import { FEATURE_FLAGS } from '@/lib/flags';
import { useI18n } from '@/lib/i18n';
import { SoundManager } from '@/lib/sounds';

const SYMBOLS = ['💎', '🎭', '👑', '777', '🍒', '🔔', '🍋'];
const REEL_COUNT = 3;

interface JackpotData {
    current_amount: number;
    last_win_amount: number | null;
    last_winner_address: string | null;
    last_win_at: string | null;
}

interface JackpotWin {
    winner_address: string;
    win_amount: number;
    win_type: string;
    percentage: number;
    created_at: string;
}

export default function SlotMachine({
    balance = 0,
    bonus_balance = 0,
    onBalanceUpdate,
    onWageringUpdate,
    onBigWin,
    userAddress
}: {
    balance?: number,
    bonus_balance?: number,
    onBalanceUpdate?: (type: 'balance' | 'bonus', updater: (prev: number) => number) => void,
    onWageringUpdate?: (amount: number) => void,
    onBigWin?: (multiplier: number, amount: number) => void,
    userAddress?: string | null
}) {
    const { t } = useI18n();
    // Note: wallet is now accessed via userAddress prop instead of direct TonConnect
    const address = userAddress;
    const [reels, setReels] = useState(Array(REEL_COUNT).fill(SYMBOLS[0]));
    const [isSpinning, setIsSpinning] = useState(false);
    const [jackpot, setJackpot] = useState<JackpotData>({ current_amount: 10, last_win_amount: null, last_winner_address: null, last_win_at: null });
    const [jackpotHistory, setJackpotHistory] = useState<JackpotWin[]>([]);
    const [showJackpotWin, setShowJackpotWin] = useState(false);
    const [jackpotWinAmount, setJackpotWinAmount] = useState(0);
    const [jackpotWinType, setJackpotWinType] = useState('');
    const [jackpotGlow, setJackpotGlow] = useState(false);
    const controls = [useAnimation(), useAnimation(), useAnimation()];

    // Fetch jackpot data on mount and set up real-time subscription
    useEffect(() => {
        const fetchJackpot = async () => {
            const { data, error } = await supabase.rpc('get_current_jackpot');
            if (!error && data?.[0]) {
                setJackpot(data[0]);
            }
        };

        const fetchJackpotHistory = async () => {
            const { data, error } = await supabase
                .from('slot_jackpot_wins')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (!error && data) {
                setJackpotHistory(data);
            }
        };

        fetchJackpot();
        fetchJackpotHistory();

        // Real-time subscription for jackpot updates
        const channel = supabase
            .channel('jackpot-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'slot_jackpots'
            }, (payload) => {
                if (payload.new) {
                    setJackpot(prev => ({ ...prev, ...payload.new as JackpotData }));
                    setJackpotGlow(true);
                    setTimeout(() => setJackpotGlow(false), 2000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Animated jackpot counter
    const [displayedJackpot, setDisplayedJackpot] = useState(10);
    useEffect(() => {
        const target = jackpot.current_amount;
        if (displayedJackpot !== target) {
            const diff = target - displayedJackpot;
            const step = diff / 20;
            const timer = setTimeout(() => {
                setDisplayedJackpot(prev => prev + step);
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [jackpot.current_amount, displayedJackpot]);

    const spin = async () => {
        if (isSpinning) return;

        if (!address && !FEATURE_FLAGS.DEBUG_MODE) {
            alert(t('connect_wallet_first'));
            return;
        }

        const cost = 0.1;
        if (balance + bonus_balance < cost) {
            alert(t('insufficient_balance'));
            return;
        }

        const balanceType: 'balance' | 'bonus' = balance >= cost ? 'balance' : 'bonus';

        let balanceDeducted = false;

        try {
            setIsSpinning(true);

            let finalSymbols: string[] = [];
            let finalWinAmount = 0;
            let jackpotWin = 0;
            let jackpotType: string | null = null;

            let serverSpinSuccess = false;
            
            if (address !== 'guest_test_wallet' || !FEATURE_FLAGS.GUEST_MODE) {
                // Call Secure Edge Function with security headers
                const initData = (window as any).Telegram?.WebApp?.initData || '';
                const { data, error } = await supabase.functions.invoke('spin-slot', {
                    body: {
                        wallet_address: address,
                        is_bonus: balanceType === 'bonus'
                    },
                    headers: {
                        'x-telegram-init-data': initData,
                        'x-wallet-address': address!
                    }
                });

                if (error || !data?.success) {
                    const errorMsg = error?.message || data?.error || 'Failed to spin';
                    console.error('[SlotMachine] Server spin failed:', errorMsg);
                    throw new Error(errorMsg);
                } else {
                    finalSymbols = data.spinResults;
                    finalWinAmount = data.winAmount;
                    jackpotWin = data.jackpotWin || 0;
                    jackpotType = data.jackpotType;

                    // Update jackpot from server response
                    if (data.currentJackpot) {
                        setJackpot(prev => ({ ...prev, current_amount: data.currentJackpot }));
                    }

                    if (onBalanceUpdate) {
                        if (typeof data.new_balance !== 'undefined') onBalanceUpdate('balance', () => Number(data.new_balance));
                        if (typeof data.new_bonus !== 'undefined') onBalanceUpdate('bonus', () => Number(data.new_bonus));
                    }
                    serverSpinSuccess = true;
                }
            }
            
            if (!serverSpinSuccess) {
                // Local simulation: deduct cost first
                if (onBalanceUpdate) {
                    onBalanceUpdate(balanceType, prev => prev - cost);
                    balanceDeducted = true;
                }
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

            const totalWin = finalWinAmount + jackpotWin;

            if (totalWin > 0) {
                if (address === 'guest_test_wallet' && onBalanceUpdate) {
                    onBalanceUpdate(balanceType, prev => prev + totalWin);
                }

                // Show jackpot win animation
                if (jackpotWin > 0) {
                    // Play jackpot sound
                    SoundManager.playJackpot();
                    setJackpotWinAmount(jackpotWin);
                    setJackpotWinType(jackpotType || '');
                    setShowJackpotWin(true);
                    setTimeout(() => setShowJackpotWin(false), 5000);
                }

                alert(`${t('slot_win').replace('{amount}', totalWin.toFixed(1))}`);

                // Wagering update (Slot style: count as turnover if win >= 1.5x cost)
                if (totalWin >= cost * 1.5 && onWageringUpdate) {
                    onWageringUpdate(cost);
                }

                // Viral sharing (Slot: 10x cost is a big win)
                if (totalWin >= cost * 10 && onBigWin) {
                    onBigWin(totalWin / cost, totalWin);
                }
            }

        } catch (e: any) {
            console.error("Spin failed:", e);
            if (balanceDeducted && onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev + cost); // Refund on failure only if deducted locally
            alert(`${t('spin_failed') || 'Spin failed'}: ${e.message || 'Check connection. Please reload the game.'}`);
        } finally {
            setIsSpinning(false);
        }
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return addr.slice(0, 6) + '...' + addr.slice(-4);
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full px-4">
            {/* Jackpot Display */}
            <div className={`relative w-full max-w-md p-6 glass-card bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 border-2 ${jackpotGlow ? 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)]' : 'border-purple-500/30'} rounded-3xl overflow-hidden`}>
                {/* Animated background particles */}
                {jackpotGlow && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent animate-pulse" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎰</span>
                        <span className="text-sm font-bold text-purple-300 uppercase tracking-widest">
                            {t('jackpot')}
                        </span>
                        <span className="text-2xl">🎰</span>
                    </div>

                    <motion.div
                        className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]"
                        animate={{
                            scale: jackpotGlow ? [1, 1.05, 1] : 1,
                        }}
                        transition={{ duration: 0.5 }}
                    >
                        {displayedJackpot.toFixed(2)} TON
                    </motion.div>

                    {/* Last winner info */}
                    {jackpot.last_winner_address && (
                        <div className="mt-3 text-xs text-purple-300/70">
                            <span>Last win: </span>
                            <span className="text-yellow-400 font-bold">
                                {jackpot.last_win_amount?.toFixed(2)} TON
                            </span>
                            <span> by </span>
                            <span className="font-mono">{formatAddress(jackpot.last_winner_address)}</span>
                        </div>
                    )}
                </div>

                {/* Jackpot win animation overlay */}
                <AnimatePresence>
                    {showJackpotWin && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
                        >
                            <div className="text-center">
                                <motion.div
                                    initial={{ y: -50 }}
                                    animate={{ y: 0 }}
                                    className="text-4xl mb-2"
                                >
                                    {jackpotWinType === '777' ? '🏆' : jackpotWinType === '💎' ? '💎' : '👑'}
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.5, repeat: 2 }}
                                    className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]"
                                >
                                    +{jackpotWinAmount.toFixed(2)} TON!
                                </motion.div>
                                <div className="text-sm text-purple-300 mt-2">
                                    {jackpotWinType === '777' ? 'JACKPOT!' : jackpotWinType === '💎' ? 'MAJOR WIN!' : 'MINOR WIN!'}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Slot Machine */}
            <div className="flex flex-col items-center gap-10 w-full">
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
                    {isSpinning ? t('spinning') : t('spin_now')}
                    <div className="text-xs opacity-60 font-bold mt-1 tracking-widest not-italic">{t('cost')}: {0.1} TON</div>
                </button>

                {/* Jackpot contribution info */}
                <div className="text-center text-xs text-gray-500">
                    <span>0.5% of each bet goes to jackpot</span>
                </div>
            </div>

            {/* Jackpot History */}
            {jackpotHistory.length > 0 && (
                <div className="w-full max-w-md mt-4 p-4 glass-card bg-black/40 border-purple-500/20 rounded-2xl">
                    <h3 className="text-sm font-bold text-purple-300 mb-3 uppercase tracking-wider">
                        {t('recent_jackpot_wins')}
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {jackpotHistory.map((win, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-purple-900/20 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span>{win.win_type === '777' ? '🏆' : win.win_type === '💎' ? '💎' : '👑'}</span>
                                    <span className="text-gray-300 font-mono">{formatAddress(win.winner_address)}</span>
                                </div>
                                <span className="text-yellow-400 font-bold">{win.win_amount.toFixed(2)} TON</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {FEATURE_FLAGS.GUEST_MODE && !address && (
                <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full">
                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] animate-pulse">
                        {t('guest_mode_active')}
                    </p>
                </div>
            )}
        </div>
    );
}
