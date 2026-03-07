'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Users, TrendingUp } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { SoundManager } from '@/lib/sounds';

export default function CrashGame() {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    // House Wallet Address
    const HOUSE_WALLET = "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";

    const [multiplier, setMultiplier] = useState(1.00);
    const [isFlying, setIsFlying] = useState(false);
    const [isCrashed, setIsCrashed] = useState(false);
    const [betStatus, setBetStatus] = useState<'none' | 'betting' | 'cashed'>('none');
    const [lastWin, setLastWin] = useState<number | null>(null);
    const [currentSeed, setCurrentSeed] = useState<string>('hash_sha256_waiting...');
    const [autoCashout, setAutoCashout] = useState<number>(2.00);
    const [isBetting, setIsBetting] = useState(false);
    const [squadSize, setSquadSize] = useState(1);
    const [isSquadActive, setIsSquadActive] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const multiplierRef = useRef(1.00);
    const autoCashoutRef = useRef<number>(2.00);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const betStatusRef = useRef<'none' | 'betting' | 'cashed'>('none');
    const currentBetIdRef = useRef<string | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Simulate online users changing
        const interval = setInterval(() => {
            const size = Math.floor(Math.random() * 20) + 1;
            setSquadSize(size);
            setIsSquadActive(size > 5);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const startNewRound = async () => {
        if (!wallet) {
            alert("Please connect your wallet first!");
            return;
        }

        try {
            setIsBetting(true);
            // 1. Fetch or create a synchronized round from backend
            const { data: roundData, error: roundError } = await supabase.functions.invoke('generate-round');
            if (roundError || !roundData) throw new Error("Failed to sync round with server");

            const crashAt = parseFloat(roundData.crash_point);
            setCurrentSeed(roundData.server_seed);

            // 2. Original transaction logic...
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [
                    {
                        address: HOUSE_WALLET,
                        amount: "100000000", // 0.1 TON
                    },
                ],
            };

            const sentTx = await tonConnectUI.sendTransaction(transaction);

            if (sentTx && wallet) {
                const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
                const telegramId = tgUser?.id;

                const { data: userData } = await supabase
                    .from('users')
                    .upsert({
                        wallet_address: wallet.account.address,
                        telegram_id: telegramId
                    }, { onConflict: 'wallet_address' })
                    .select()
                    .single();

                if (userData) {
                    const { data: bData } = await supabase.from('bets').insert({
                        round_id: roundData.id,
                        user_id: userData.id,
                        amount: 0.1,
                        status: 'placed',
                        tx_hash: sentTx.boc
                    }).select().single();

                    if (bData) currentBetIdRef.current = bData.id;
                }
            }

            setIsFlying(true);
            setIsCrashed(false);
            setBetStatus('betting');
            betStatusRef.current = 'betting';
            setMultiplier(1.00);
            multiplierRef.current = 1.00;
            startTimeRef.current = Date.now();
            autoCashoutRef.current = autoCashout;
            SoundManager.playStart();

            const update = () => {
                const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
                let newMultiplier = Math.pow(1.15, elapsed);

                if (isSquadActive) {
                    newMultiplier += 0.1;
                }

                if (newMultiplier >= crashAt) {
                    crash();
                } else {
                    const oldM = multiplierRef.current;
                    setMultiplier(newMultiplier);
                    multiplierRef.current = newMultiplier;

                    if (Math.floor(newMultiplier * 10) > Math.floor(oldM * 10)) {
                        SoundManager.playClimb(newMultiplier);
                    }

                    if (betStatusRef.current === 'betting' && newMultiplier >= autoCashoutRef.current) {
                        cashOut();
                    }

                    requestRef.current = requestAnimationFrame(update);
                }
            };

            requestRef.current = requestAnimationFrame(update);
        } catch (e) {
            console.error("Bet failed:", e);
        } finally {
            setIsBetting(false);
        }
    };

    const crash = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        SoundManager.playCrash();
        setIsFlying(false);
        setIsCrashed(true);
        setBetStatus('none');
        betStatusRef.current = 'none';

        // Start countdown to next round
        startCountdown(10);
    };

    const startCountdown = (seconds: number) => {
        setCountdown(seconds);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    startNewRound();
                    return null;
                }
                return prev !== null ? prev - 1 : null;
            });
        }, 1000);
    };

    const cashOut = async () => {
        if (betStatusRef.current !== 'betting' || !multiplierRef.current || !currentBetIdRef.current) return;
        SoundManager.playWin();
        const winMult = multiplierRef.current;
        const winAmount = 0.1 * winMult;

        setLastWin(winMult);
        setBetStatus('cashed');
        betStatusRef.current = 'cashed';

        // Update bet in DB
        const { data: betData } = await supabase
            .from('bets')
            .update({
                status: 'cashed',
                cashout_at: winMult,
                win_amount: winAmount
            })
            .eq('id', currentBetIdRef.current)
            .select()
            .single();

        if (betData) {
            // Trigger payout edge function (which also sends TG notification)
            await supabase.functions.invoke('process-payout', {
                body: { bet_id: betData.id }
            });
        }

        currentBetIdRef.current = null;
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* Game Screen */}
            <motion.div
                animate={isFlying ? {
                    x: [0, -1, 1, -1, 1, 0],
                    y: [0, 1, -1, 1, -1, 0]
                } : {}}
                transition={{
                    repeat: Infinity,
                    duration: Math.max(0.05, 0.2 / multiplier),
                    ease: "linear"
                }}
                className="relative w-full aspect-video bg-black/40 rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center p-8 group"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--gold-glow)_0%,_transparent_70%)] opacity-20" />

                <div className="absolute inset-0 overflow-hidden opacity-10">
                    <div className="w-full h-full bg-[linear-gradient(to_right,_transparent_0%,_#fff_50%,_transparent_100%)] bg-[length:200%_1px] animate-[pulse_2s_infinite]" />
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <motion.h3
                        key={isCrashed ? 'crashed' : 'flying'}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-6xl font-black italic tracking-tighter ${isCrashed ? 'text-red-500' : 'gold-text'}`}
                    >
                        {multiplier.toFixed(2)}x
                    </motion.h3>
                    {isCrashed && <p className="text-red-500 font-bold uppercase tracking-widest mt-2 animate-bounce">Crashed!</p>}

                    {countdown !== null && (
                        <div className="flex flex-col items-center mt-2">
                            <p className="text-gold/60 text-[10px] uppercase font-bold tracking-widest">Next Launch in</p>
                            <span className="text-4xl font-black gold-text italic">{countdown}s</span>
                        </div>
                    )}

                    {betStatus === 'cashed' && (
                        <div className="flex flex-col items-center">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="mt-2 bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-sm font-bold border border-green-500/30"
                            >
                                Cashed Out: {lastWin?.toFixed(2)}x
                            </motion.div>
                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                onClick={() => setShowShareModal(true)}
                                className="mt-4 text-[10px] uppercase font-bold text-gold/60 hover:text-gold flex items-center gap-2 border border-gold/20 px-3 py-1 rounded-full transition-colors"
                            >
                                🚀 Share to Stories
                            </motion.button>
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {isFlying && (
                        <motion.div
                            initial={{ x: -100, y: 100, rotate: 45 }}
                            animate={{
                                x: 100, y: -100, rotate: 45,
                                transition: { duration: 10, ease: "linear" }
                            }}
                            exit={{ scale: 2, opacity: 0, transition: { duration: 0.2 } }}
                            className="absolute pointer-events-none"
                        >
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0.8, scale: 1, y: 0 }}
                                        animate={{ opacity: 0, scale: 0, y: 40, x: (Math.random() - 0.5) * 20 }}
                                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                        className="w-2 h-2 bg-gold/60 rounded-full blur-[2px]"
                                    />
                                ))}
                            </div>
                            <Rocket className="text-gold w-12 h-12 fill-gold/20" />
                            <div className="absolute top-12 left-0 w-4 h-12 bg-gradient-to-t from-gold/40 to-transparent blur-md rotate-180" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showShareModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="bg-[#1a1a1a] border border-gold/30 rounded-3xl p-6 w-full max-w-[280px] shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col items-center gap-4 text-center"
                            >
                                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center">
                                    <Rocket className="w-8 h-8 text-gold" />
                                </div>
                                <h4 className="text-xl font-black italic gold-text tracking-tighter">ASTRO VICTORY!</h4>
                                <div className="text-4xl font-black text-white italic">{lastWin?.toFixed(2)}x</div>
                                <div className="w-full h-px bg-white/5" />
                                <p className="text-[8px] text-white/40 uppercase font-bold px-2">Share on Telegram Stories for 5% Bonus!</p>
                                <button onClick={() => setShowShareModal(false)} className="gold-button w-full py-3 text-sm">Download Card</button>
                                <button onClick={() => setShowShareModal(false)} className="text-[10px] text-white/20 uppercase font-bold hover:text-white/40">Later</button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={`absolute top-4 right-4 flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-full transition-all ${isSquadActive ? 'scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'opacity-60'}`}>
                    <Users className={`w-3 h-3 ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`}>
                        {isSquadActive ? `Squad 1.1x Active (${squadSize})` : `Online: ${squadSize}`}
                    </span>
                </div>
            </motion.div>

            {/* Provably Fair Info */}
            <div className="w-full px-2 mt-2 flex justify-between items-center text-[8px] uppercase font-bold text-white/20 tracking-widest">
                <span>Provably Fair Active</span>
                <span className="truncate max-w-[150px]">Seed: {currentSeed}</span>
            </div>

            {/* Controls */}
            <div className="w-full flex flex-col gap-4">
                <div className="flex gap-2">
                    <div className="flex-1 glass-card p-3 border-white/5 flex flex-col gap-1">
                        <span className="text-[8px] uppercase font-bold text-white/40">Bet Amount</span>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gold">10 TON</span>
                            <div className="flex gap-1">
                                <button className="w-5 h-5 bg-white/5 rounded flex items-center justify-center text-[10px]">-</button>
                                <button className="w-5 h-5 bg-white/5 rounded flex items-center justify-center text-[10px]">+</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 glass-card p-3 border-white/5 flex flex-col gap-1">
                        <span className="text-[8px] uppercase font-bold text-white/40">Auto Cash Out</span>
                        <div className="flex items-center justify-between">
                            <input
                                type="number"
                                step="0.1"
                                min="1.1"
                                value={autoCashout}
                                onChange={(e) => setAutoCashout(parseFloat(e.target.value) || 1.1)}
                                className="bg-transparent border-none outline-none text-sm font-bold text-gold w-12"
                            />
                            <span className="text-[10px] font-bold text-white/20">x</span>
                        </div>
                    </div>
                </div>

                {betStatus === 'betting' && isFlying ? (
                    <button onClick={cashOut} className="gold-button w-full text-2xl py-6 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.6)]">Cash Out</button>
                ) : (
                    <button
                        onClick={startNewRound}
                        disabled={isFlying || isBetting}
                        className={`gold-button w-full text-2xl py-6 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.6)] ${isFlying || isBetting ? 'opacity-50 grayscale' : ''}`}
                    >
                        {isBetting ? 'Processing...' : isFlying ? 'Waiting...' : 'Place Bet (0.1 TON)'}
                    </button>
                )}

                {!wallet && (
                    <p className="text-[10px] text-center text-red-400/60 uppercase font-bold tracking-widest animate-pulse">
                        Please Connect Wallet to Play
                    </p>
                )}

                <div className="glass-card p-4 w-full">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Live Wins
                        </h4>
                        <span className="text-[10px] text-gold font-bold">142 Playing</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <LiveWinRow user="@starry_rider" x="2.14x" win="+21.4 TON" />
                        <LiveWinRow user="@crypto_king" x="1.85x" win="+185 TON" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function LiveWinRow({ user, x, win }: { user: string, x: string, win: string }) {
    return (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 transition-all hover:bg-white/10">
            <span className="text-xs font-medium text-white/60">{user}</span>
            <div className="flex gap-3">
                <span className="text-xs font-bold text-gold">{x}</span>
                <span className="text-xs font-bold text-green-400">{win}</span>
            </div>
        </div>
    );
}
