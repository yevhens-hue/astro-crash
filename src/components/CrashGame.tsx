'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Users, TrendingUp } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { SoundManager } from '@/lib/sounds';
import { FEATURE_FLAGS } from '@/lib/flags';
import ProvablyFairModal from '@/components/ProvablyFairModal';
import { useI18n } from '@/lib/i18n';

export default function CrashGame({
    balance = 0,
    bonus_balance = 0,
    onBalanceUpdate,
    onWageringUpdate,
    onBigWin,
    referralCode
}: {
    balance?: number,
    bonus_balance?: number,
    onBalanceUpdate?: (type: 'balance' | 'bonus', updater: (prev: number) => number) => void,
    onWageringUpdate?: (amount: number) => void,
    onBigWin?: (multiplier: number, amount: number) => void,
    referralCode?: string | null
}) {
    const { t } = useI18n();
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [multiplier, setMultiplier] = useState(1.00);
    const [isFlying, setIsFlying] = useState(false);
    const [isCrashed, setIsCrashed] = useState(false);
    const [betStatusA, setBetStatusA] = useState<'none' | 'betting' | 'cashed'>('none');
    const [lastWin, setLastWin] = useState<number | null>(null);
    const [currentSeed, setCurrentSeed] = useState<string>('hash_sha256_waiting...');
    const [isBetting, setIsBetting] = useState(false);
    const [squadSize, setSquadSize] = useState(1);
    const [isSquadActive, setIsSquadActive] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Auto-cashout visualization states
    const [autoCashoutTriggeredA, setAutoCashoutTriggeredA] = useState(false);
    const [autoCashoutTriggeredB, setAutoCashoutTriggeredB] = useState(false);
    const [showFlyingMoneyA, setShowFlyingMoneyA] = useState(false);
    const [showFlyingMoneyB, setShowFlyingMoneyB] = useState(false);
    const [autoCashoutCountdownA, setAutoCashoutCountdownA] = useState<number | null>(null);
    const [autoCashoutCountdownB, setAutoCashoutCountdownB] = useState<number | null>(null);

    const [betAmountA, setBetAmountA] = useState(0.5);
    const [autoCashoutA, setAutoCashoutA] = useState(2.0);
    const [isAutoCashA, setIsAutoCashA] = useState(false);
    const [isAutoBetA, setIsAutoBetA] = useState(false);

    const [betStatusB, setBetStatusB] = useState<'none' | 'betting' | 'cashed'>('none');
    const [betAmountB, setBetAmountB] = useState(5.0);
    const [autoCashoutB, setAutoCashoutB] = useState(1.5);
    const [isAutoCashB, setIsAutoCashB] = useState(false);
    const [isAutoBetB, setIsAutoBetB] = useState(false);

    const [recentMultipliers, setRecentMultipliers] = useState<{ multiplier: number, id: string, serverSeed?: string, clientSeed?: string, hash?: string, timestamp?: string }[]>([]);
    const [statsMultipliers, setStatsMultipliers] = useState<{ multiplier: number }[]>([]);
    const [selectedRound, setSelectedRound] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
    const [activePanel, setActivePanel] = useState<'A' | 'B'>('A');
    const [allBets, setAllBets] = useState<any[]>([]);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [topBets, setTopBets] = useState<any[]>([]);
    const [localMyBets, setLocalMyBets] = useState<any[]>([]); // Guest mode session history
    const [autoCashoutedBets, setAutoCashoutedBets] = useState<Set<string>>(new Set());

    const multiplierRef = useRef(1.00);
    const autoCashoutRefA = useRef<number>(2.00);
    const autoCashoutRefB = useRef<number>(2.00);
    const isAutoCashRefA = useRef(false);
    const isAutoCashRefB = useRef(false);
    const isAutoCashTriggeredRefA = useRef(false);
    const isAutoCashTriggeredRefB = useRef(false);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const betStatusRefA = useRef<'none' | 'betting' | 'cashed'>('none');
    const betStatusRefB = useRef<'none' | 'betting' | 'cashed'>('none');
    const currentBetIdRefA = useRef<string | null>(null);
    const currentBetIdRefB = useRef<string | null>(null);
    const betBalanceTypeA = useRef<'balance' | 'bonus'>('balance');
    const betBalanceTypeB = useRef<'balance' | 'bonus'>('balance');
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingCrashAtRef = useRef<number | null>(null);
    const currentRoundIdRef = useRef<string | null>(null);
    const currentCrashAtRef = useRef<number | null>(null);
    const latestCountdownRef = useRef<number | null>(null);
    const isFlyingRef = useRef(false);
    const isCrashedRef = useRef(true);

    // Initialize sound manager
    useEffect(() => {
        SoundManager.init();
    }, []);

    useEffect(() => {
        latestCountdownRef.current = countdown;
    }, [countdown]);

    useEffect(() => {
        // Initial fetch
        fetchRecentRounds();
        fetchStatsRounds();
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

    // Auto-Bet Logic
    useEffect(() => {
        if (countdown !== null && countdown > 2) {
            if (isAutoBetA && betStatusA === 'none' && !isBetting && !isFlyingRef.current) {
                handlePlaceBet('A').catch(e => {
                    console.error("Auto bet A failed", e);
                    setIsAutoBetA(false);
                });
            }
            if (isAutoBetB && betStatusB === 'none' && !isBetting && !isFlyingRef.current) {
                handlePlaceBet('B').catch(e => {
                    console.error("Auto bet B failed", e);
                    setIsAutoBetB(false);
                });
            }
        }
    }, [countdown, isAutoBetA, isAutoBetB, betStatusA, betStatusB, isBetting]);

    const fetchBets = async () => {
        // All bets
        const { data: all } = await supabase
            .from('bets')
            .select('*, users(wallet_address, username)')
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
            .select('*, users(wallet_address, username)')
            .eq('status', 'cashed')
            .order('win_amount', { ascending: false })
            .limit(10);
        if (top) setTopBets(top);
    };

    const fetchRecentRounds = async () => {
        const { data, error } = await supabase
            .from('rounds')
            .select('id, crash_point, server_seed, created_at')
            .not('crash_point', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setRecentMultipliers(data.map(r => {
                let seedObj = null;
                try {
                    seedObj = JSON.parse(r.server_seed);
                } catch (e) { }
                return {
                    multiplier: parseFloat(r.crash_point),
                    id: r.id,
                    serverSeed: seedObj?.serverSeed,
                    clientSeed: seedObj?.clientSeed,
                    hash: seedObj?.hash || r.server_seed,
                    timestamp: r.created_at
                };
            }));
        }
    };

    const fetchStatsRounds = async () => {
        const { data, error } = await supabase
            .from('rounds')
            .select('crash_point')
            .not('crash_point', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100);

        if (!error && data) {
            setStatsMultipliers(data.map(r => ({
                multiplier: parseFloat(r.crash_point)
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

        if (balance + bonus_balance < amount) {
            alert("Insufficient balance! Please deposit TON.");
            return;
        }

        const balanceType: 'balance' | 'bonus' = balance >= amount ? 'balance' : 'bonus';
        if (panel === 'A') betBalanceTypeA.current = balanceType;
        else betBalanceTypeB.current = balanceType;

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
                // Try to fetch round from server, fall back to local simulation if it fails
                try {
                    const { data: roundData, error: roundError } = await supabase.functions.invoke('generate-round');
                    if (roundError || !roundData) {
                        // Fall back to local simulation
                        console.warn('generate-round error:', roundError);
                        throw new Error(roundError?.message || 'Server unavailable, using local mode');
                    }
                    crashAt = parseFloat(roundData.crash_point);
                    roundId = roundData.id;
                    serverSeed = roundData.server_seed;
                } catch (serverError: any) {
                    // Fall back to local simulation
                    console.warn('Server round generation failed, using local mode:', serverError.message);
                    crashAt = Math.max(1.1, 0.99 / (1 - Math.random()));
                    roundId = `local_round_${Date.now()}`;
                    serverSeed = "local_simulation_seed";
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

            if (address !== 'guest_test_wallet' && !roundId.startsWith('mock_') && !roundId.startsWith('local_')) {
                // Call Secure Edge Function with fallback
                try {
                    const initData = (window as any).Telegram?.WebApp?.initData || '';
                    const { data, error } = await supabase.functions.invoke('place-bet', {
                        body: {
                            wallet_address: address,
                            round_id: roundId,
                            amount: amount,
                            is_bonus: balanceType === 'bonus'
                        },
                        headers: {
                            'x-telegram-init-data': initData,
                            'x-wallet-address': address!
                        }
                    });

                    if (error || !data?.success) {
                        console.warn('place-bet error:', error, data);
                        throw new Error(error?.message || data?.error || 'Failed to place bet');
                    }

                    dbBetId = data.bet_id;
                    if (typeof data.new_balance !== 'undefined' && onBalanceUpdate) {
                        onBalanceUpdate(balanceType, () => Number(data.new_balance));
                    }
                } catch (betError: any) {
                    console.warn('Server bet failed, using local mode:', betError.message);
                    // Continue with local mode - the bet will be tracked locally
                    dbBetId = null;
                }
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
                if (onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev - amount);
                startLaunchSequence(crashAt);
            } else {
                // COUNTDOWN mode -> Store it, wait for 0
                pendingCrashAtRef.current = crashAt;
                // Subtract immediately since it's "BET PLACED"
                if (onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev - amount);
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
            // Provide more helpful error message
            let errorMessage = e.message || 'Check connection';
            if (errorMessage.includes('Failed to send a request')) {
                errorMessage = 'Server unavailable. Game will continue in offline mode.';
                // Don't show alert for server errors - continue with local mode silently
                // Refund the balance if it was deducted
                if (onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev + amount);
                setIsBetting(false);

                // Reset bet status
                if (panel === 'A') {
                    setBetStatusA('none');
                    betStatusRefA.current = 'none';
                } else {
                    setBetStatusB('none');
                    betStatusRefB.current = 'none';
                }
                return;
            } else if (errorMessage.includes('NetworkError')) {
                errorMessage = 'Network error. Check your internet connection.';
            }
            alert(`Bet failed: ${errorMessage}`);
            // Reset status on failure (refund is handled by state reverting or simply not update)
            // But here we subtracted optimistically, so we should refund:
            if (onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev + amount);

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
        SoundManager.startEngine();

        // Reset auto-cashout triggered states
        setAutoCashoutTriggeredA(false);
        setAutoCashoutTriggeredB(false);
        isAutoCashTriggeredRefA.current = false;
        isAutoCashTriggeredRefB.current = false;
        setAutoCashoutCountdownA(null);
        setAutoCashoutCountdownB(null);
        // Keep auto-cashouted bets in history for reference, but clear on new round start if needed
        // setAutoCashoutedBets(new Set());

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

                SoundManager.updateEngine(newMultiplier);

                if (Math.floor(newMultiplier * 10) > Math.floor(oldM * 10)) {
                    SoundManager.playClimb(newMultiplier);
                }

                // Auto cashout checks
                if (isAutoCashRefA.current && betStatusRefA.current === 'betting' && newMultiplier >= autoCashoutRefA.current) {
                    if (!isAutoCashTriggeredRefA.current) {
                        cashOut('A', true);
                    }
                }
                if (isAutoCashRefB.current && betStatusRefB.current === 'betting' && newMultiplier >= autoCashoutRefB.current) {
                    if (!isAutoCashTriggeredRefB.current) {
                        cashOut('B', true);
                    }
                }

                // Update countdown to auto-cashout
                if (isAutoCashRefA.current && betStatusRefA.current === 'betting' && !isAutoCashTriggeredRefA.current) {
                    const timeToAuto = Math.log(newMultiplier / autoCashoutRefA.current) / Math.log(1.15);
                    setAutoCashoutCountdownA(Math.max(0, timeToAuto));
                } else {
                    setAutoCashoutCountdownA(null);
                }
                if (isAutoCashRefB.current && betStatusRefB.current === 'betting' && !isAutoCashTriggeredRefB.current) {
                    const timeToAuto = Math.log(newMultiplier / autoCashoutRefB.current) / Math.log(1.15);
                    setAutoCashoutCountdownB(Math.max(0, timeToAuto));
                } else {
                    setAutoCashoutCountdownB(null);
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
        setTimeout(() => {
            fetchRecentRounds();
            fetchStatsRounds();
        }, 1000);
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
            setBetAmountA(prev => Math.min(100, Math.max(0.5, parseFloat((prev + delta).toFixed(1)))));
        } else {
            setBetAmountB(prev => Math.min(100, Math.max(0.5, parseFloat((prev + delta).toFixed(1)))));
        }
    };

    const cashOut = (panel: 'A' | 'B', isAuto: boolean = false) => {
        const address = wallet?.account.address || (FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);
        const betStatusRef = panel === 'A' ? betStatusRefA : betStatusRefB;
        const currentBetIdRef = panel === 'A' ? currentBetIdRefA : currentBetIdRefB;
        const setBetStatus = panel === 'A' ? setBetStatusA : setBetStatusB;
        const amount = panel === 'A' ? betAmountA : betAmountB;

        if (betStatusRef.current !== 'betting' || !multiplierRef.current || !currentBetIdRef.current) return;

        // Auto-cashout visual and sound effects
        if (isAuto) {
            if (panel === 'A') {
                setAutoCashoutTriggeredA(true);
                setShowFlyingMoneyA(true);
                isAutoCashTriggeredRefA.current = true;
            } else {
                setAutoCashoutTriggeredB(true);
                setShowFlyingMoneyB(true);
                isAutoCashTriggeredRefB.current = true;
            }
            // Track auto-cashout bet for history display
            const currentBetId = panel === 'A' ? currentBetIdRefA.current : currentBetIdRefB.current;
            if (currentBetId) {
                setAutoCashoutedBets(prev => new Set(prev).add(currentBetId));
            }
            // Play special auto-cashout sound
            SoundManager.playAutoCashout();

            // Hide flying money animation after 1.5s
            setTimeout(() => {
                if (panel === 'A') setShowFlyingMoneyA(false);
                else setShowFlyingMoneyB(false);
            }, 1500);
        } else {
            SoundManager.playWin();
        }

        const winMult = multiplierRef.current;
        const balanceType = panel === 'A' ? betBalanceTypeA.current : betBalanceTypeB.current;
        const winAmount = amount * winMult;
        setLastWin(winMult);
        setBetStatus('cashed');
        betStatusRef.current = 'cashed';
        if (onBalanceUpdate) onBalanceUpdate(balanceType, prev => prev + winAmount);

        if (winMult >= 10 && onBigWin) {
            onBigWin(winMult, winAmount);
        }

        // Wagering update (Aviator style: turnover counts if odds >= 1.5x)
        if (winMult >= 1.5 && onWageringUpdate) {
            onWageringUpdate(amount);
        }

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

                // 1. Secure Cashout with Telegram Auth
                const initData = (window as any).Telegram?.WebApp?.initData || '';
                const { data: cashoutData, error: cashoutError } = await supabase.functions.invoke('cashout-bet', {
                    body: {
                        bet_id: betId,
                        cashout_at: winMult,
                        wallet_address: address
                    },
                    headers: {
                        'x-telegram-init-data': initData,
                        'x-wallet-address': address!
                    }
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
            SoundManager.stopEngine();
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm pb-20">
            <ProvablyFairModal
                isOpen={!!selectedRound}
                onClose={() => setSelectedRound(null)}
                roundData={selectedRound ? {
                    id: selectedRound.id,
                    crashPoint: selectedRound.multiplier.toFixed(2),
                    serverSeed: selectedRound.serverSeed || '',
                    clientSeed: selectedRound.clientSeed || '',
                    hash: selectedRound.hash || ''
                } : null}
            />
            {/* Recent Multipliers Ribbon */}
            <div className="w-full overflow-hidden relative group md:hidden">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 px-1">
                    {recentMultipliers.slice(0, 20).map((m, i) => {
                        const colorClass = m.multiplier >= 10 ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                            m.multiplier >= 2 ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30';
                        return (
                            <motion.button
                                key={m.id}
                                onClick={() => setSelectedRound(m)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold border hover:brightness-125 transition-all ${colorClass}`}
                            >
                                {m.multiplier.toFixed(2)}x
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Desktop Recent Multipliers - larger */}
            <div className="w-full overflow-hidden relative group hidden md:block">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 px-1">
                    {recentMultipliers.map((m, i) => {
                        const colorClass = m.multiplier >= 10 ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                            m.multiplier >= 2 ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30';
                        return (
                            <motion.button
                                key={m.id}
                                onClick={() => setSelectedRound(m)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border hover:brightness-125 transition-all ${colorClass}`}
                            >
                                {m.multiplier.toFixed(2)}x
                            </motion.button>
                        );
                    })}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
            </div>

            {/* Heat Map & Stats - hidden on small mobile */}
            <div className="w-full flex flex-col gap-3 hidden sm:block">
                {/* Stats Row - smaller on mobile */}
                <div className="flex gap-1 md:gap-2 justify-between">
                    <div className="flex-1 bg-black/40 rounded-lg md:rounded-xl p-1.5 md:p-2 border border-white/5">
                        <div className="text-[7px] md:text-[8px] uppercase font-bold text-white/30 tracking-widest text-center">Avg 20</div>
                        <div className="text-[10px] md:text-xs font-black text-center text-gold">{recentMultipliers.slice(0, 20).length > 0 ? (recentMultipliers.slice(0, 20).reduce((a, b) => a + b.multiplier, 0) / Math.min(recentMultipliers.length, 20)).toFixed(2) : '-'}x</div>
                    </div>
                    <div className="flex-1 bg-black/40 rounded-lg md:rounded-xl p-1.5 md:p-2 border border-white/5">
                        <div className="text-[7px] md:text-[8px] uppercase font-bold text-white/30 tracking-widest text-center">Avg 50</div>
                        <div className="text-[10px] md:text-xs font-black text-center text-gold">{recentMultipliers.length > 0 ? (recentMultipliers.reduce((a, b) => a + b.multiplier, 0) / Math.min(recentMultipliers.length, 50)).toFixed(2) : '-'}x</div>
                    </div>
                    <div className="flex-1 bg-black/40 rounded-lg md:rounded-xl p-1.5 md:p-2 border border-white/5 hidden sm:block">
                        <div className="text-[7px] md:text-[8px] uppercase font-bold text-white/30 tracking-widest text-center">Avg 100</div>
                        <div className="text-[10px] md:text-xs font-black text-center text-gold">{statsMultipliers.length > 0 ? (statsMultipliers.reduce((a, b) => a + b.multiplier, 0) / Math.min(statsMultipliers.length, 100)).toFixed(2) : '-'}x</div>
                    </div>
                    <div className="flex-1 bg-red-500/10 rounded-lg md:rounded-xl p-1.5 md:p-2 border border-red-500/20">
                        <div className="text-[7px] md:text-[8px] uppercase font-bold text-red-400/50 tracking-widest text-center">🔥 Streak</div>
                        <div className="text-[10px] md:text-xs font-black text-center text-red-400">
                            {(() => {
                                let streak = 0;
                                for (const m of recentMultipliers) {
                                    if (m.multiplier < 1.5) streak++;
                                    else break;
                                }
                                return streak;
                            })()}x
                        </div>
                    </div>
                </div>

                {/* Heat Map Grid - smaller on mobile */}
                <div className="bg-black/40 rounded-xl md:rounded-xl p-2 md:p-3 border border-white/5">
                    <div className="flex justify-between items-center mb-2 hidden md:flex">
                        <span className="text-[8px] uppercase font-bold text-white/30 tracking-widest">History Heat Map</span>
                        <div className="flex gap-2 text-[7px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/60" /> &lt;1.5x</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500/60" />1.5-2x</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/60" />&gt;2x</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-8 md:grid-cols-10 gap-0.5 md:gap-1">
                        {recentMultipliers.slice(0, 32).map((m, i) => {
                            const getHeatColor = (mult: number) => {
                                if (mult < 1.5) return 'bg-red-500/60 border-red-500/40';
                                if (mult < 2.0) return 'bg-yellow-500/60 border-yellow-500/40';
                                return 'bg-green-500/60 border-green-500/40';
                            };
                            const formatTime = (ts?: string) => {
                                if (!ts) return '';
                                const d = new Date(ts);
                                return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            };
                            return (
                                <div
                                    key={m.id || i}
                                    className={`relative group cursor-pointer ${getHeatColor(m.multiplier)} border rounded-sm h-5 md:h-6 hover:scale-110 hover:z-10 transition-all`}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-white/10 rounded-lg text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                                        <div className="font-bold text-gold">{m.multiplier.toFixed(2)}x</div>
                                        <div className="text-white/40">{formatTime(m.timestamp)}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 32 - recentMultipliers.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-white/5 border border-white/5 rounded-sm h-5 md:h-6" />
                        ))}
                    </div>
                </div>
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
                            className={`text-5xl font-black italic tracking-tighter ${isCrashed ? 'text-red-500' : 'gold-text'}`}
                        >
                            {multiplier.toFixed(2)}x
                        </motion.h3>
                        {isCrashed && <p className="text-red-500 text-sm font-bold uppercase tracking-widest mt-1 animate-bounce">{t('crashed')}</p>}

                        {countdown !== null && (
                            <div className="flex flex-col items-center mt-2">
                                <p className="text-gold/60 text-[10px] uppercase font-bold tracking-widest">{t('next_launch')}</p>
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
                                    {t('cash_out')}: {lastWin?.toFixed(2)}x
                                </motion.div>
                                <motion.button
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    onClick={() => setShowShareModal(true)}
                                    className="mt-4 text-[10px] uppercase font-bold text-gold/60 hover:text-gold flex items-center gap-2 border border-gold/20 px-3 py-1 rounded-full transition-colors"
                                >
                                    🚀 {t('share')}
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
                                    className="bg-[#1a1a1a] border border-gold/30 rounded-3xl p-5 w-[90%] max-w-[260px] shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col items-center gap-3 text-center max-h-[90vh] overflow-y-auto"
                                >
                                    <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center shrink-0">
                                        <Rocket className="w-6 h-6 text-gold" />
                                    </div>
                                    <h4 className="text-lg font-black italic gold-text tracking-tighter">ASTRO VICTORY!</h4>
                                    <div className="text-3xl font-black text-white italic leading-none">{lastWin?.toFixed(2)}x</div>
                                    <div className="w-full h-px bg-white/5 shrink-0" />
                                    <p className="text-[8px] text-white/40 uppercase font-bold px-1">Show off your Astro victory to the community!</p>
                                    <button
                                        onClick={() => {
                                            const shareText = `🚀 I just hit ${lastWin?.toFixed(2)}x on Astro Crash! Try to beat my score! Play now: @AstroCrashRobot_bot`;
                                            const playUrl = referralCode 
                                                ? `https://t.me/AstroCrashRobot_bot/play?startapp=${referralCode}`
                                                : 'https://t.me/AstroCrashRobot_bot/play';
                                            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(playUrl)}&text=${encodeURIComponent(shareText)}`;
                                            
                                            const tg = (window as any).Telegram?.WebApp;
                                            if (tg?.openTelegramLink) {
                                                tg.openTelegramLink(shareUrl);
                                            } else {
                                                window.open(shareUrl, '_blank');
                                            }
                                            
                                            setTimeout(() => setShowShareModal(false), 500);
                                        }}
                                        className="gold-button w-full py-2.5 text-xs shrink-0"
                                    >
                                        Share on Telegram
                                    </button>
                                    <button onClick={() => setShowShareModal(false)} className="text-[10px] text-white/20 uppercase font-bold hover:text-white/40 shrink-0">{t('close')}</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`absolute top-4 right-4 hidden md:flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-full transition-all ${isSquadActive ? 'scale-110 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'opacity-60'} pointer-events-none`}>
                        <Users className={`w-3 h-3 ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSquadActive ? 'text-purple-400' : 'text-white/40'}`}>
                            {isSquadActive ? `${t('squad_active')} (${squadSize})` : `Online: ${squadSize}`}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Provably Fair Info - hidden on mobile */}
            <div className="relative z-10 w-full px-2 mt-2 hidden md:flex justify-between items-center text-[8px] uppercase font-bold text-white/20 tracking-widest">
                <span>{t('provably_fair')} {t('active')}</span>
                <span className="truncate max-w-[150px]">Seed: {currentSeed}</span>
            </div>

            {/* Panel Tabs for Mobile */}
            <div className="md:hidden w-full flex gap-2 mb-2">
                <button
                    onClick={() => setActivePanel('A')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activePanel === 'A' ? 'bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)]' : 'bg-white/10 text-white/60'}`}
                >
                    Panel A
                </button>
                <button
                    onClick={() => setActivePanel('B')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activePanel === 'B' ? 'bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)]' : 'bg-white/10 text-white/60'}`}
                >
                    Panel B
                </button>
            </div>

            {/* Controls */}
            <div className="relative z-20 w-full flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                    {/* Desktop: show both panels, Mobile: show only active panel */}
                    <div className="hidden md:block">
                        <BettingPanel
                            panel="A"
                            status={betStatusA}
                            amount={betAmountA}
                            autoCashout={autoCashoutA}
                            isAutoCash={isAutoCashA}
                            isAutoBet={isAutoBetA}
                            onAdjust={(d) => adjustBet('A', d)}
                            onAutoCashoutChange={setAutoCashoutA}
                            onAutoCashToggle={() => setIsAutoCashA(!isAutoCashA)}
                            onAutoBetToggle={() => setIsAutoBetA(!isAutoBetA)}
                            onPlaceBet={() => handlePlaceBet('A')}
                            onCashOut={() => cashOut('A')}
                            isFlying={isFlying}
                            isBetting={isBetting}
                            autoCashoutTriggered={autoCashoutTriggeredA}
                            showFlyingMoney={showFlyingMoneyA}
                            autoCashoutCountdown={autoCashoutCountdownA}
                        />
                        <div className="my-2" />
                        <BettingPanel
                            panel="B"
                            status={betStatusB}
                            amount={betAmountB}
                            autoCashout={autoCashoutB}
                            isAutoCash={isAutoCashB}
                            isAutoBet={isAutoBetB}
                            onAdjust={(d) => adjustBet('B', d)}
                            onAutoCashoutChange={setAutoCashoutB}
                            onAutoCashToggle={() => setIsAutoCashB(!isAutoCashB)}
                            onAutoBetToggle={() => setIsAutoBetB(!isAutoBetB)}
                            onPlaceBet={() => handlePlaceBet('B')}
                            onCashOut={() => cashOut('B')}
                            isFlying={isFlying}
                            isBetting={isBetting}
                            autoCashoutTriggered={autoCashoutTriggeredB}
                            showFlyingMoney={showFlyingMoneyB}
                            autoCashoutCountdown={autoCashoutCountdownB}
                        />
                    </div>
                    {/* Mobile: show only active panel */}
                    <div className="md:hidden">
                        {activePanel === 'A' && (
                            <BettingPanel
                                panel="A"
                                status={betStatusA}
                                amount={betAmountA}
                                autoCashout={autoCashoutA}
                                isAutoCash={isAutoCashA}
                                isAutoBet={isAutoBetA}
                                onAdjust={(d) => adjustBet('A', d)}
                                onAutoCashoutChange={setAutoCashoutA}
                                onAutoCashToggle={() => setIsAutoCashA(!isAutoCashA)}
                                onAutoBetToggle={() => setIsAutoBetA(!isAutoBetA)}
                                onPlaceBet={() => handlePlaceBet('A')}
                                onCashOut={() => cashOut('A')}
                                isFlying={isFlying}
                                isBetting={isBetting}
                                autoCashoutTriggered={autoCashoutTriggeredA}
                                showFlyingMoney={showFlyingMoneyA}
                                autoCashoutCountdown={autoCashoutCountdownA}
                            />
                        )}
                        {activePanel === 'B' && (
                            <BettingPanel
                                panel="B"
                                status={betStatusB}
                                amount={betAmountB}
                                autoCashout={autoCashoutB}
                                isAutoCash={isAutoCashB}
                                isAutoBet={isAutoBetB}
                                onAdjust={(d) => adjustBet('B', d)}
                                onAutoCashoutChange={setAutoCashoutB}
                                onAutoCashToggle={() => setIsAutoCashB(!isAutoCashB)}
                                onAutoBetToggle={() => setIsAutoBetB(!isAutoBetB)}
                                onPlaceBet={() => handlePlaceBet('B')}
                                onCashOut={() => cashOut('B')}
                                isFlying={isFlying}
                                isBetting={isBetting}
                                autoCashoutTriggered={autoCashoutTriggeredB}
                                showFlyingMoney={showFlyingMoneyB}
                                autoCashoutCountdown={autoCashoutCountdownB}
                            />
                        )}
                    </div>
                </div>

                {!wallet && !FEATURE_FLAGS.GUEST_MODE && (
                    <div className="w-full mt-2">
                        <button
                            onClick={() => tonConnectUI.openModal()}
                            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-tight transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 group"
                        >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            {t('connect_wallet_first')}
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
                                {tab === 'all' ? t('all_bets') : tab === 'my' ? t('my_bets') : t('top_wins')}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 flex flex-col gap-2 min-h-[200px]">
                        {activeTab === 'all' && allBets.map((bet) => (
                            <LiveWinRow
                                key={bet.id}
                                user={bet.users?.username ? bet.users.username : (bet.users?.wallet_address ? `${bet.users.wallet_address.slice(0, 4)}...${bet.users.wallet_address.slice(-4)}` : 'Anonymous')}
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
                                isAutoCashout={autoCashoutedBets.has(bet.id)}
                            />
                        ))}
                        {activeTab === 'top' && topBets.map((bet) => (
                            <LiveWinRow
                                key={bet.id}
                                user={bet.users?.username ? bet.users.username : (bet.users?.wallet_address ? `${bet.users.wallet_address.slice(0, 4)}...${bet.users.wallet_address.slice(-4)}` : 'Anonymous')}
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
    panel, status, amount, autoCashout, isAutoCash, isAutoBet,
    onAdjust, onAutoCashoutChange, onAutoCashToggle, onAutoBetToggle,
    onPlaceBet, onCashOut, isFlying, isBetting,
    autoCashoutTriggered = false,
    showFlyingMoney = false,
    autoCashoutCountdown = null
}: {
    panel: 'A' | 'B',
    status: 'none' | 'betting' | 'cashed',
    amount: number,
    autoCashout: number,
    isAutoCash: boolean,
    isAutoBet: boolean,
    onAdjust: (d: number) => void,
    onAutoCashoutChange: (v: number) => void,
    onAutoCashToggle: () => void,
    onAutoBetToggle: () => void,
    onPlaceBet: () => void,
    onCashOut: () => void,
    isFlying: boolean,
    isBetting: boolean,
    autoCashoutTriggered?: boolean,
    showFlyingMoney?: boolean,
    autoCashoutCountdown?: number | null
}) {
    const { t } = useI18n();

    const quickAmounts = [0.5, 1, 2, 5, 10, 25, 50];
    const quickAutoCashouts = [2, 5, 10];
    const autoCashoutValue = autoCashout;

    return (
        <motion.div
            animate={{
                scale: status === 'cashed' ? 1.02 : 1,
                boxShadow: status === 'cashed' ? '0 0 40px rgba(34,197,94,0.2)' :
                    status === 'betting' ? '0 0 20px rgba(212,175,55,0.1)' : '0 10px 30px rgba(0,0,0,0.5)'
            }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            className={`glass-card p-3 md:p-5 relative overflow-hidden flex flex-col gap-3 md:gap-4 rounded-2xl md:rounded-[2rem] border transition-colors ${status === 'cashed' ? 'border-green-500/40 bg-green-500/5' : status === 'betting' ? 'border-gold/30 bg-gold/5' : 'border-white/5'}`}
        >
            {/* Background animated gradient for active states */}
            {status === 'betting' && (
                <div className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent opacity-50 pointer-events-none" />
            )}
            {status === 'cashed' && (
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent opacity-50 pointer-events-none" />
            )}

            <div className="flex gap-2 md:gap-3 relative z-10">
                <div className="flex-1 bg-black/40 rounded-xl md:rounded-2xl p-2 md:p-3 flex flex-col gap-2 border border-white/5">
                    <span className="text-[8px] md:text-[9px] uppercase font-bold text-white/40 tracking-widest">{t('bet')}</span>
                    <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base font-black text-gold tracking-tight">{amount.toFixed(1)} <span className="text-[9px] md:text-[10px] opacity-50">TON</span></span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => onAdjust(-0.1)}
                                className="w-10 h-10 md:w-8 md:h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-white/20 active:scale-90 transition-all shadow-lg min-h-[44px]"
                            >
                                -
                            </button>
                            <button
                                onClick={() => onAdjust(0.1)}
                                className="w-10 h-10 md:w-8 md:h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-white/20 active:scale-90 transition-all shadow-lg min-h-[44px]"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    {/* Range Slider */}
                    <div className="mt-1 md:mt-2">
                        <input
                            type="range"
                            min="0.5"
                            max="100"
                            step="0.1"
                            value={amount}
                            onChange={(e) => onAdjust(parseFloat(e.target.value) - amount)}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold hover:accent-gold/80 transition-all"
                            style={{
                                background: `linear-gradient(to right, #d4af55 0%, #d4af55 ${((amount - 0.1) / 99.9) * 100}%, rgba(255,255,255,0.1) ${((amount - 0.1) / 99.9) * 100}%, rgba(255,255,255,0.1) 100%)`
                            }}
                        />
                    </div>
                    {/* Quick Amount Buttons - larger on mobile */}
                    <div className="flex flex-wrap gap-1 mt-1 md:mt-2">
                        {quickAmounts.map((quickAmount) => (
                            <button
                                key={quickAmount}
                                onClick={() => {
                                    const diff = quickAmount - amount;
                                    onAdjust(diff);
                                }}
                                className={`flex-1 min-w-[calc(25%-2px)] py-2 md:py-1.5 text-[10px] md:text-[9px] font-bold rounded-lg transition-all min-h-[44px] md:min-h-0 ${Math.abs(amount - quickAmount) < 0.01
                                    ? 'bg-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                    }`}
                            >
                                {quickAmount}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-black/40 rounded-xl md:rounded-2xl p-2 md:p-3 flex flex-col gap-2 border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1 md:pb-2">
                        <span className="text-[8px] md:text-[9px] uppercase font-bold text-white/40 tracking-widest">{t('auto_bet')}</span>
                        <button
                            onClick={onAutoBetToggle}
                            className={`text-[8px] md:text-[9px] font-black px-2 py-1.5 md:py-1 rounded-lg flex items-center gap-1 min-h-[36px] ${isAutoBet ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10 text-white/40 hover:bg-white/20'} transition-all`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isAutoBet ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
                            AUTO
                        </button>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-[8px] md:text-[9px] uppercase font-bold text-white/40 tracking-widest">{t('auto_cashout')}</span>
                        <button
                            onClick={onAutoCashToggle}
                            className={`text-[8px] md:text-[9px] font-black px-2 py-1.5 md:py-1 rounded-lg min-h-[36px] ${isAutoCash ? 'bg-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-white/10 text-white/40 hover:bg-white/20'} transition-all`}
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
                            className="bg-transparent border-none outline-none text-sm md:text-base font-black text-gold w-12"
                        />
                        <span className="text-[9px] md:text-[10px] font-black text-white/20 italic">x</span>
                    </div>
                    {/* Quick Auto-Cashout Buttons - larger on mobile */}
                    <div className="flex gap-1 mt-1">
                        {quickAutoCashouts.map((quickAuto) => (
                            <button
                                key={quickAuto}
                                onClick={() => {
                                    onAutoCashoutChange(quickAuto);
                                    if (!isAutoCash) onAutoCashToggle();
                                }}
                                className={`flex-1 py-2 md:py-1 text-[9px] md:text-[8px] font-bold rounded-lg transition-all min-h-[44px] md:min-h-0 ${Math.abs(autoCashout - quickAuto) < 0.01 && isAutoCash
                                    ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                    : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white'
                                    }`}
                            >
                                {quickAuto}x
                            </button>
                        ))}
                    </div>
                    {/* Auto-cashout indicator and countdown */}
                    {isAutoCash && (
                        <div className="flex items-center justify-between mt-1 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                            <span className="text-[7px] md:text-[8px] font-bold text-green-400">Auto: {autoCashout.toFixed(2)}x</span>
                            {autoCashoutCountdown !== null && status === 'betting' && isFlying && (
                                <span className="text-[7px] md:text-[8px] font-bold text-green-400 animate-pulse">
                                    ~{autoCashoutCountdown.toFixed(1)}s
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {status === 'betting' && isFlying ? (
                <>
                    <AnimatePresence>
                        {showFlyingMoney && (
                            <motion.div
                                initial={{ x: -50, y: 0, opacity: 0 }}
                                animate={{ x: 100, y: -30, opacity: [1, 1, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute pointer-events-none left-0 right-0 flex justify-center"
                            >
                                <div className="flex gap-1">
                                    {[...Array(8)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0, rotate: 0 }}
                                            animate={{ scale: 1, rotate: 360, x: [0, 20 + i * 5], y: [0, -20 - i * 3] }}
                                            transition={{ duration: 1.5, delay: i * 0.1 }}
                                            className="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={onCashOut}
                        className={`gold-button w-full py-4 md:py-4 text-lg md:text-xl shadow-[0_10px_25px_rgba(212,175,55,0.4)] active:scale-95 transition-all animate-pulse rounded-2xl font-black italic relative overflow-hidden min-h-[56px] ${autoCashoutTriggered ? 'bg-green-500 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : ''
                            }`}
                    >
                        {autoCashoutTriggered ? (
                            <span className="flex items-center justify-center gap-2">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-lg md:text-xl">🎉</motion.span>
                                {t('cash_out')} {autoCashout?.toFixed(2)}x
                            </span>
                        ) : (
                            t('cash_out')
                        )}
                    </button>
                </>
            ) : status === 'cashed' ? (
                <div className="w-full py-3 md:py-4 text-center rounded-2xl bg-green-500/20 text-green-400 border border-green-500/40 text-lg md:text-xl font-black italic shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                    {t('won')}
                </div>
            ) : (
                <button
                    onClick={onPlaceBet}
                    disabled={isFlying || isBetting || status === 'betting'}
                    className={`gold-button w-full py-4 md:py-4 text-lg md:text-xl shadow-[0_10px_25px_rgba(212,175,55,0.4)] rounded-2xl font-black italic min-h-[56px] ${(isFlying || isBetting || status === 'betting') ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95 transition-all'}`}
                >
                    {isBetting ? t('wait') : status === 'betting' ? t('bet_placed') : `${t('bet')} ${amount.toFixed(1)}`}
                </button>
            )}
        </motion.div>
    );
}

function LiveWinRow({ user, x, win, status, isAutoCashout = false }: { user: string, x: string, win: string, status?: string, isAutoCashout?: boolean }) {
    const isWin = status === 'cashed' || status === 'paid';
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex justify-between items-center bg-white/5 p-2 rounded-lg border transition-all hover:bg-white/10 ${isWin ? 'border-green-500/20 bg-green-500/10' : 'border-white/5'} ${isAutoCashout ? 'border-green-400/40 bg-green-500/15' : ''}`}
        >
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/60">{user}</span>
                {isAutoCashout && (
                    <span className="text-[8px] px-1 py-0.5 bg-green-500/30 text-green-400 rounded font-bold">AUTO</span>
                )}
            </div>
            <div className="flex gap-3">
                <span className="text-xs font-bold text-gold">{x}</span>
                <span className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-white/40'}`}>{win}</span>
            </div>
        </motion.div>
    );
}
