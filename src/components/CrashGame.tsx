'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Users, TrendingUp } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { SoundManager } from '@/lib/sounds';
import { FEATURE_FLAGS } from '@/lib/flags';

export default function CrashGame({
    balance = 0,
    onBalanceUpdate
}: {
    balance?: number,
    onBalanceUpdate?: (updater: (prev: number) => number) => void
}) {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [multiplier, setMultiplier] = useState(1.00);
    const [isFlying, setIsFlying] = useState(false);
    const [isCrashed, setIsCrashed] = useState(false);
    const [betStatusA, setBetStatusA] = useState<'none' | 'betting' | 'cashed'>('none');
    const [betStatusB, setBetStatusB] = useState<'none' | 'betting' | 'cashed'>('none');
    const [lastWin, setLastWin] = useState<number | null>(null);
    const [currentSeed, setCurrentSeed] = useState<string>('hash_sha256_waiting...');
    const [autoCashoutA, setAutoCashoutA] = useState<number>(2.00);
    const [autoCashoutB, setAutoCashoutB] = useState<number>(2.00);
    const [isBetting, setIsBetting] = useState(false);
    const [squadSize, setSquadSize] = useState(1);
    const [isSquadActive, setIsSquadActive] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [betAmountA, setBetAmountA] = useState<number>(0.1);
    const [betAmountB, setBetAmountB] = useState<number>(0.1);
    const [isAutoCashA, setIsAutoCashA] = useState(false);
    const [isAutoCashB, setIsAutoCashB] = useState(false);
    const [recentMultipliers, setRecentMultipliers] = useState<{ multiplier: number, id: string }[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
    const [allBets, setAllBets] = useState<any[]>([]);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [topBets, setTopBets] = useState<any[]>([]);
    const [localMyBets, setLocalMyBets] = useState<any[]>([]); // Guest mode session history

    const multiplierRef = useRef(1.00);
    const autoCashoutRefA = useRef<number>(2.00);
    const autoCashoutRefB = useRef<number>(2.00);
    const isAutoCashRefA = useRef(false);
    const isAutoCashRefB = useRef(false);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const betStatusRefA = useRef<'none' | 'betting' | 'cashed'>('none');
    const betStatusRefB = useRef<'none' | 'betting' | 'cashed'>('none');
    const currentBetIdRefA = useRef<string | null>(null);
    const currentBetIdRefB = useRef<string | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingCrashAtRef = useRef<number | null>(null);
    const currentRoundIdRef = useRef<string | null>(null);
    const currentCrashAtRef = useRef<number | null>(null);
    const latestCountdownRef = useRef<number | null>(null);
    const isFlyingRef = useRef(false);
    const isCrashedRef = useRef(true);

    useEffect(() => {
        latestCountdownRef.current = countdown;
    }, [countdown]);

    useEffect(() => {
        // Initial fetch
        fetchRecentRounds();
        fetchBets();

        // Subscribe to real-time bets
        const channel = supabase
            .channel('public:bets')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, (payload) => {
                setAllBets(prev => [payload.new, ...prev].slice(0, 10));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bets' }, (payload) => {
                setAllBets(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
            })
            .subscribe();

        // Simulate online users changing
        const interval = setInterval(() => {
            const size = Math.floor(Math.random() * 20) + 1;
            setSquadSize(size);
            setIsSquadActive(size > 5);
        }, 5000);

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [wallet]);

    useEffect(() => {
        isAutoCashRefA.current = isAutoCashA;
        isAutoCashRefB.current = isAutoCashB;
    }, [isAutoCashA, isAutoCashB]);

    const fetchBets = async () => {
        // All bets
        const { data: all } = await supabase
            .from('bets')
            .select('*, users(wallet_address)')
            .order('created_at', { ascending: false })
            .limit(10);
        if (all) setAllBets(all);

        // My bets
        if (wallet) {
            const { data: myUser } = await supabase
                .from('users')
                .select('id')
                .eq('wallet_address', wallet.account.address)
                .single();

            if (myUser) {
                const { data: my } = await supabase
                    .from('bets')
                    .select('*')
                    .eq('user_id', myUser.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (my) setMyBets(my);
            }
        }

        // Top bets
        const { data: top } = await supabase
            .from('bets')
            .select('*, users(wallet_address)')
            .eq('status', 'paid')
            .order('win_amount', { ascending: false })
            .limit(10);
        if (top) setTopBets(top);
    };

    const fetchRecentRounds = async () => {
        const { data, error } = await supabase
            .from('rounds')
            .select('id, crash_point')
            .not('crash_point', 'is', null)
            .order('created_at', { ascending: false })
            .limit(15);

        if (!error && data) {
            setRecentMultipliers(data.map(r => ({
                multiplier: parseFloat(r.crash_point),
                id: r.id
            })));
        }
    };

    const handlePlaceBet = async (panel: 'A' | 'B') => {
        const address = wallet?.account.address || (FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);

        if (!address && !FEATURE_FLAGS.DEBUG_MODE) {
            alert("Please connect your wallet first!");
            return;
        }

        const amount = panel === 'A' ? betAmountA : betAmountB;
        const auto = panel === 'A' ? autoCashoutA : autoCashoutB;

        if (balance < amount) {
            alert("Insufficient balance! Please deposit TON.");
            return;
        }

        try {
            console.log(`Starting bet for panel ${panel}... Amount:`, amount);
            setIsBetting(true);

            let crashAt: number;
            let roundId: string;
            let serverSeed: string;

            // 1. Fetch or simulate round ONLY if we haven't already generated one for this launch
            if (currentRoundIdRef.current && currentCrashAtRef.current) {
                roundId = currentRoundIdRef.current;
                crashAt = currentCrashAtRef.current;
                serverSeed = currentSeed || ""; // reused
            } else {
                if (address === 'guest_test_wallet' || FEATURE_FLAGS.DEBUG_MODE) {
                    crashAt = Math.max(1.1, 0.99 / (1 - Math.random()));
                    roundId = `mock_round_${Date.now()}`;
                    serverSeed = "local_simulation_seed";
                } else {
                    const { data: roundData, error: roundError } = await supabase.functions.invoke('generate-round');
                    if (roundError || !roundData) throw new Error(roundError?.message || "Failed to sync round");
                    crashAt = parseFloat(roundData.crash_point);
                    roundId = roundData.id;
                    serverSeed = roundData.server_seed;
                }

                currentRoundIdRef.current = roundId;
                currentCrashAtRef.current = crashAt;
            }

            setCurrentSeed(serverSeed);
            const txHash = `internal_tx_${Date.now()}`;

            // 2. Sync User (only if real supabase)
            let userId = "guest_id";
            let currentUserBalance = balance;
            let dbBetId: string | null = null;

            if (address !== 'guest_test_wallet' && !roundId.startsWith('mock_round')) {
                // Call Secure Edge Function
                const { data, error } = await supabase.functions.invoke('place-bet', {
                    body: {
                        wallet_address: address,
                        round_id: roundId,
                        amount: amount
                    }
                });

                if (error || !data?.success) {
                    throw new Error(error?.message || data?.error || 'Failed to place bet securely on server');
                }

                userId = data.bet.user_id;
                dbBetId = data.bet.id;
            }

            // Update local state
            if (panel === 'A') {
                currentBetIdRefA.current = dbBetId || `bet_a_${Date.now()}`;
                setBetStatusA('betting');
                betStatusRefA.current = 'betting';
                autoCashoutRefA.current = auto;
            } else {
                currentBetIdRefB.current = dbBetId || `bet_b_${Date.now()}`;
                setBetStatusB('betting');
                betStatusRefB.current = 'betting';
                autoCashoutRefB.current = auto;
            }

            // Game Logic: If already flying, we throw (though UI disables the button)
            if (isFlyingRef.current) {
                throw new Error("Round already flying, cannot bet now!");
            }

            if (latestCountdownRef.current === null || latestCountdownRef.current === 0) {
                // IDLE mode -> Start immediately
                if (onBalanceUpdate) onBalanceUpdate(prev => prev - amount);
                startLaunchSequence(crashAt);
            } else {
                // COUNTDOWN mode -> Store it, wait for 0
                pendingCrashAtRef.current = crashAt;
                // Subtract immediately since it's "BET PLACED"
                if (onBalanceUpdate) onBalanceUpdate(prev => prev - amount);
            }

            // Move this after balance subtraction to ensure UI shows bet from both panels
            if (address === 'guest_test_wallet') {
                const guestBet = {
                    id: panel === 'A' ? currentBetIdRefA.current : currentBetIdRefB.current,
                    user_id: userId,
                    amount: amount,
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                    users: { wallet_address: "Guest Explorer" }
                };
                setAllBets(prev => [guestBet, ...prev].slice(0, 10));
                setLocalMyBets(prev => [guestBet, ...prev].slice(0, 10));
            }
        } catch (e: any) {
            console.error("Bet failed:", e);
            alert(`Bet failed: ${e.message || 'Check connection'}`);
            // Reset status on failure
            if (panel === 'A') {
                setBetStatusA('none');
                betStatusRefA.current = 'none';
            } else {
                setBetStatusB('none');
                betStatusRefB.current = 'none';
            }
        } finally {
            setIsBetting(false);
        }
    };

    const startLaunchSequence = (crashAt: number) => {
        setIsFlying(true);
        isFlyingRef.current = true;
        setIsCrashed(false);
        isCrashedRef.current = false;
        setMultiplier(1.00);
        multiplierRef.current = 1.00;
        startTimeRef.current = Date.now();
        SoundManager.playStart();

        // Reset bet statuses for new round
        if (betStatusRefA.current === 'cashed') {
            setBetStatusA('none');
            betStatusRefA.current = 'none';
        }
        if (betStatusRefB.current === 'cashed') {
            setBetStatusB('none');
            betStatusRefB.current = 'none';
        }

        const update = () => {
            const elapsed = (Date.now() - (startTimeRef.current || 0)) / 1000;
            let newMultiplier = Math.pow(1.15, elapsed);

            if (newMultiplier >= crashAt) {
                crash();
            } else {
                const oldM = multiplierRef.current;
                setMultiplier(newMultiplier);
                multiplierRef.current = newMultiplier;

                if (Math.floor(newMultiplier * 10) > Math.floor(oldM * 10)) {
                    SoundManager.playClimb(newMultiplier);
                }

                // Auto cashout checks
                if (isAutoCashRefA.current && betStatusRefA.current === 'betting' && newMultiplier >= autoCashoutRefA.current) {
                    cashOut('A');
                }
                if (isAutoCashRefB.current && betStatusRefB.current === 'betting' && newMultiplier >= autoCashoutRefB.current) {
                    cashOut('B');
                }

                requestRef.current = requestAnimationFrame(update);
            }
        };

        requestRef.current = requestAnimationFrame(update);
    };

    const crash = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        SoundManager.playCrash();
        setIsFlying(false);
        isFlyingRef.current = false;
        setIsCrashed(true);
        isCrashedRef.current = true;
        currentRoundIdRef.current = null;
        currentCrashAtRef.current = null;

        // ONLY reset status if they haven't cashed out yet
        // In Debug mode, they stay 'cashed' until next launch sequence
        if (betStatusRefA.current === 'betting') {
            setBetStatusA('none');
            betStatusRefA.current = 'none';
        }
        if (betStatusRefB.current === 'betting') {
            setBetStatusB('none');
            betStatusRefB.current = 'none';
        }

        // Start countdown to next round
        startCountdown(10);

        // Refresh history
        setTimeout(fetchRecentRounds, 1000);
    };

    const autoStartRound = useCallback(() => {
        // Generate a fresh local round when no bet was placed
        const crashAt = Math.max(1.05, 0.99 / (1 - Math.random()));
        startLaunchSequence(crashAt);
    }, []);

    const startCountdown = (seconds: number) => {
        setCountdown(seconds);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    // Use 0 as sentinel so the effect below can detect "just finished"
                    return 0;
                }
                return prev !== null ? prev - 1 : null;
            });
        }, 1000);
    };

    const adjustBet = (panel: 'A' | 'B', delta: number) => {
        if (panel === 'A') {
            setBetAmountA(prev => Math.max(0.1, parseFloat((prev + delta).toFixed(1))));
        } else {
            setBetAmountB(prev => Math.max(0.1, parseFloat((prev + delta).toFixed(1))));
        }
    };

    const cashOut = (panel: 'A' | 'B') => {
        const address = wallet?.account.address || (FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);
        const betStatusRef = panel === 'A' ? betStatusRefA : betStatusRefB;
        const currentBetIdRef = panel === 'A' ? currentBetIdRefA : currentBetIdRefB;
        const setBetStatus = panel === 'A' ? setBetStatusA : setBetStatusB;
        const amount = panel === 'A' ? betAmountA : betAmountB;

        if (betStatusRef.current !== 'betting' || !multiplierRef.current || !currentBetIdRef.current) return;

        // Immediately update UI (synchronous — no awaits, no INP block)
        SoundManager.playWin();
        const winMult = multiplierRef.current;
        const winAmount = amount * winMult;
        setLastWin(winMult);
        setBetStatus('cashed');
        betStatusRef.current = 'cashed';
        if (onBalanceUpdate) onBalanceUpdate(prev => prev + winAmount);

        const betId = currentBetIdRef.current;
        currentBetIdRef.current = null;

        setLocalMyBets(prev => prev.map(b =>
            b.id === betId
                ? { ...b, status: 'cashed', cashout_at: winMult, win_amount: winAmount }
                : b
        ));

        // Also update allBets feed for immediate UI feedback in guest/debug mode
        setAllBets(prev => prev.map(b =>
            b.id === betId
                ? { ...b, status: 'cashed', cashout_at: winMult, win_amount: winAmount }
                : b
        ));

        // All DB operations deferred — won't block UI thread
        setTimeout(async () => {
            try {
                if (address === 'guest_test_wallet' || !betId) return; // skip DB for guest

                // 1. Secure Cashout
                const { data: cashoutData, error: cashoutError } = await supabase.functions.invoke('cashout-bet', {
                    body: { bet_id: betId, cashout_at: winMult }
                });

                if (cashoutError || !cashoutData?.success) {
                    console.error("Cashout securely failed:", cashoutError || cashoutData);
                    return; // Reverting optimistic UI on failure could be implemented here
                }

                // 2. Trigger Blockchain Payout
                supabase.functions.invoke('process-payout', { body: { bet_id: betId } })
                    .catch(e => console.error("Payout trigger error:", e));

            } catch (error: any) {
                console.error("Cash out DB sync error:", error);
            }
        }, 0);
    };

    useEffect(() => {
        if (countdown !== 0) return;

        // countdown just hit 0
        setCountdown(null);
        if (pendingCrashAtRef.current !== null) {
            startLaunchSequence(pendingCrashAtRef.current);
            pendingCrashAtRef.current = null;
        } else {
            // Stop automatic demo rounds as requested
            console.log("Countdown ended, no bets placed. Waiting for manual bet.");
        }
    }, [countdown]);

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm pb-20">
            {/* Recent Multipliers Ribbon */}
            <div className="w-full overflow-hidden relative group">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 px-1">
                    {recentMultipliers.map((m, i) => {
                        const colorClass = m.multiplier >= 10 ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                            m.multiplier >= 2 ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30';
                        return (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border ${colorClass}`}
                            >
                                {m.multiplier.toFixed(2)}x
                            </motion.div>
                        );
                    })}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>

            {/* Game Screen */}
            {/* Game Screen Container */}
            <div className="relative z-0 w-full aspect-video">
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
                    className="relative w-full h-full bg-black/40 rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center p-8 group"
                >
                    {/* ... (rest of the game screen content remains same) */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--gold-glow)_0%,_transparent_70%)] opacity-20 pointer-events-none" />

                    <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
                        <div className="w-full h-full bg-[linear-gradient(to_right,_transparent_0%,_#fff_50%,_transparent_100%)] bg-[length:200%_1px] animate-[pulse_2s_infinite]" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center pointer-events-none">
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

                        {(betStatusA === 'cashed' || betStatusB === 'cashed') && (
                            <div className="flex flex-col items-center pointer-events-auto">
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
                                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-auto"
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
                                    <p className="text-[8px] text-white/40 uppercase font-bold px-2">Show off your Astro victory to the community!</p>
                                    <button
                                        onClick={() => {
                                            const text = `🚀 I just hit ${lastWin?.toFixed(2)}x on Astro Crash! Try to beat my score! Play now: https://t.me/AstroCrashGame_bot`;
                                            window.open(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/AstroCrashGame_bot')}&text=${encodeURIComponent(text)}`, '_blank');
                                            setShowShareModal(false);
                                        }}
                                        className="gold-button w-full py-3 text-sm"
                                    >
                                        Share on Telegram
                                    </button>
                                    <button onClick={() => setShowShareModal(false)} className="text-[10px] text-white/20 uppercase font-bold hover:text-white/40">Later</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`absolute top-4 right-4 flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-full transition-all ${isSquadActive ? 'scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'opacity-60'} pointer-events-none`}>
                        <Users className={`w-3 h-3 ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`}>
                            {isSquadActive ? `Squad 1.1x Active (${squadSize})` : `Online: ${squadSize}`}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Provably Fair Info */}
            <div className="relative z-10 w-full px-2 mt-2 flex justify-between items-center text-[8px] uppercase font-bold text-white/20 tracking-widest">
                <span>Provably Fair Active</span>
                <span className="truncate max-w-[150px]">Seed: {currentSeed}</span>
            </div>

            {/* Controls */}
            <div className="relative z-20 w-full flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                    <BettingPanel
                        panel="A"
                        status={betStatusA}
                        amount={betAmountA}
                        autoCashout={autoCashoutA}
                        isAutoCash={isAutoCashA}
                        onAdjust={(d) => adjustBet('A', d)}
                        onAutoCashoutChange={setAutoCashoutA}
                        onAutoCashToggle={() => setIsAutoCashA(!isAutoCashA)}
                        onPlaceBet={() => handlePlaceBet('A')}
                        onCashOut={() => cashOut('A')}
                        isFlying={isFlying}
                        isBetting={isBetting}
                    />
                    <BettingPanel
                        panel="B"
                        status={betStatusB}
                        amount={betAmountB}
                        autoCashout={autoCashoutB}
                        isAutoCash={isAutoCashB}
                        onAdjust={(d) => adjustBet('B', d)}
                        onAutoCashoutChange={setAutoCashoutB}
                        onAutoCashToggle={() => setIsAutoCashB(!isAutoCashB)}
                        onPlaceBet={() => handlePlaceBet('B')}
                        onCashOut={() => cashOut('B')}
                        isFlying={isFlying}
                        isBetting={isBetting}
                    />
                </div>

                {!wallet && !FEATURE_FLAGS.GUEST_MODE && (
                    <div className="w-full mt-2">
                        <button
                            onClick={() => tonConnectUI.openModal()}
                            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-tight transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 group"
                        >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            Connect Wallet to Play
                        </button>
                    </div>
                )}

                <div className="glass-card w-full overflow-hidden flex flex-col">
                    <div className="flex border-b border-white/5">
                        {['all', 'my', 'top'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === tab ? 'text-gold bg-white/5 border-b-2 border-gold' : 'text-white/20'}`}
                            >
                                {tab === 'all' ? 'All Bets' : tab === 'my' ? 'My Bets' : 'Top Wins'}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 flex flex-col gap-2 min-h-[200px]">
                        {activeTab === 'all' && allBets.map((bet) => (
                            <LiveWinRow
                                key={bet.id}
                                user={bet.users?.wallet_address ? `${bet.users.wallet_address.slice(0, 4)}...${bet.users.wallet_address.slice(-4)}` : 'Anonymous'}
                                x={bet.cashout_at ? `${bet.cashout_at.toFixed(2)}x` : '-'}
                                win={bet.win_amount ? `+${bet.win_amount.toFixed(2)} TON` : `${bet.amount} TON`}
                                status={bet.status}
                            />
                        ))}
                        {activeTab === 'my' && [...localMyBets, ...myBets].slice(0, 10).map((bet) => (
                            <LiveWinRow
                                key={bet.id}
                                user="Me"
                                x={bet.cashout_at ? `${parseFloat(bet.cashout_at).toFixed(2)}x` : '-'}
                                win={bet.win_amount ? `+${parseFloat(bet.win_amount).toFixed(2)} TON` : `${bet.amount} TON`}
                                status={bet.status}
                            />
                        ))}
                        {activeTab === 'top' && topBets.map((bet) => (
                            <LiveWinRow
                                key={bet.id}
                                user={bet.users?.wallet_address ? `${bet.users.wallet_address.slice(0, 4)}...${bet.users.wallet_address.slice(-4)}` : 'Anonymous'}
                                x={bet.cashout_at ? `${bet.cashout_at.toFixed(2)}x` : '-'}
                                win={`+${bet.win_amount.toFixed(2)} TON`}
                                status={bet.status}
                            />
                        ))}
                        {((activeTab === 'all' && allBets.length === 0) ||
                            (activeTab === 'my' && myBets.length === 0 && localMyBets.length === 0) ||
                            (activeTab === 'top' && topBets.length === 0)) && (
                                <div className="flex-1 flex flex-center justify-center items-center opacity-20 text-[10px] uppercase font-bold tracking-widest py-10 text-center">
                                    No data available
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BettingPanel({
    panel, status, amount, autoCashout, isAutoCash,
    onAdjust, onAutoCashoutChange, onAutoCashToggle,
    onPlaceBet, onCashOut, isFlying, isBetting
}: {
    panel: 'A' | 'B',
    status: 'none' | 'betting' | 'cashed',
    amount: number,
    autoCashout: number,
    isAutoCash: boolean,
    onAdjust: (d: number) => void,
    onAutoCashoutChange: (v: number) => void,
    onAutoCashToggle: () => void,
    onPlaceBet: () => void,
    onCashOut: () => void,
    isFlying: boolean,
    isBetting: boolean
}) {
    return (
        <div className="glass-card p-5 border-white/5 flex flex-col gap-4 shadow-xl rounded-[2rem]">
            <div className="flex gap-2">
                <div className="flex-1 bg-black/40 rounded-2xl p-3 flex flex-col gap-2 border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Bet Amount</span>
                    <div className="flex items-center justify-between">
                        <span className="text-base font-black text-gold tracking-tight">{amount.toFixed(1)} <span className="text-[10px] opacity-50">TON</span></span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => onAdjust(-0.1)}
                                className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-white/20 active:scale-90 transition-all shadow-lg"
                            >
                                -
                            </button>
                            <button
                                onClick={() => onAdjust(0.1)}
                                className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-white/20 active:scale-90 transition-all shadow-lg"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 bg-black/40 rounded-2xl p-3 flex flex-col gap-2 border border-white/5">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Auto Cash</span>
                        <button
                            onClick={onAutoCashToggle}
                            className={`text-[9px] font-black px-2 py-1 rounded-lg ${isAutoCash ? 'bg-gold text-black shadow-gold' : 'bg-white/10 text-white/40'} transition-all`}
                        >
                            AUTO
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            step="0.1"
                            min="1.1"
                            value={autoCashout}
                            onChange={(e) => onAutoCashoutChange(parseFloat(e.target.value) || 1.1)}
                            className="bg-transparent border-none outline-none text-base font-black text-gold w-12"
                        />
                        <span className="text-[10px] font-black text-white/20 italic">x</span>
                    </div>
                </div>
            </div>

            {status === 'betting' && isFlying ? (
                <button
                    onClick={onCashOut}
                    className="gold-button w-full py-4 text-xl shadow-[0_10px_25px_rgba(212,175,55,0.4)] active:scale-95 transition-all animate-pulse rounded-2xl font-black italic"
                >
                    CASH OUT
                </button>
            ) : status === 'cashed' ? (
                <div className="w-full py-4 text-center rounded-2xl bg-green-500/20 text-green-400 border border-green-500/40 text-xl font-black italic shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                    WON!
                </div>
            ) : (
                <button
                    onClick={onPlaceBet}
                    disabled={isFlying || isBetting || status === 'betting'}
                    className={`gold-button w-full py-4 text-xl shadow-[0_10px_25px_rgba(212,175,55,0.4)] rounded-2xl font-black italic ${(isFlying || isBetting || status === 'betting') ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95 transition-all'}`}
                >
                    {isBetting ? 'WAIT...' : status === 'betting' ? 'BET PLACED' : `BET ${amount.toFixed(1)}`}
                </button>
            )}
        </div>
    );
}

function LiveWinRow({ user, x, win, status }: { user: string, x: string, win: string, status?: string }) {
    const isWin = status === 'cashed' || status === 'paid';
    return (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 transition-all hover:bg-white/10">
            <span className="text-xs font-medium text-white/60">{user}</span>
            <div className="flex gap-3">
                <span className="text-xs font-bold text-gold">{x}</span>
                <span className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-white/40'}`}>{win}</span>
            </div>
        </div>
    );
}
