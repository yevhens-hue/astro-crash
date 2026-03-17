'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FEATURE_FLAGS } from '@/lib/flags';

interface Session {
    id: string;
    wallet_address: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    total_bets: number;
    total_wins: number;
    total_deposits: number;
    total_withdrawals: number;
    games_played: number;
    is_active: boolean;
}

export function useSession(walletAddress: string | null) {
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Start session on mount
    useEffect(() => {
        const address = walletAddress || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) return;

        const startSession = async () => {
            try {
                const { data, error } = await supabase.from('sessions').insert([{
                    wallet_address: address,
                    is_active: true,
                    total_bets: 0,
                    total_wins: 0,
                    total_deposits: 0,
                    total_withdrawals: 0,
                    games_played: 0,
                }]).select().single();

                if (data && !error) {
                    setCurrentSession(data);
                    sessionIdRef.current = data.id;
                }
            } catch (e) {
                console.error('Failed to start session:', e);
            }
        };

        startSession();

        // End session on unmount
        return () => {
            if (sessionIdRef.current) {
                endSession();
            }
        };
    }, [walletAddress]);

    // Update session stats
    const updateSession = async (stats: {
        betAmount?: number;
        winAmount?: number;
        depositAmount?: number;
        withdrawalAmount?: number;
        gamePlayed?: boolean;
    }) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) return;

        // Throttle updates to once per 10 seconds
        const now = Date.now();
        if (now - lastUpdateRef.current < 10000) return;
        lastUpdateRef.current = now;

        try {
            const updates: any = {};
            
            if (stats.betAmount !== undefined) {
                updates.total_bets = currentSession ? Number(currentSession.total_bets) + stats.betAmount : stats.betAmount;
            }
            if (stats.winAmount !== undefined) {
                updates.total_wins = currentSession ? Number(currentSession.total_wins) + stats.winAmount : stats.winAmount;
            }
            if (stats.depositAmount !== undefined) {
                updates.total_deposits = currentSession ? Number(currentSession.total_deposits) + stats.depositAmount : stats.depositAmount;
            }
            if (stats.withdrawalAmount !== undefined) {
                updates.total_withdrawals = currentSession ? Number(currentSession.total_withdrawals) + stats.withdrawalAmount : stats.withdrawalAmount;
            }
            if (stats.gamePlayed) {
                updates.games_played = currentSession ? currentSession.games_played + 1 : 1;
            }

            const { data } = await supabase
                .from('sessions')
                .update(updates)
                .eq('id', sessionId)
                .select()
                .single();

            if (data) {
                setCurrentSession(data);
            }
        } catch (e) {
            console.error('Failed to update session:', e);
        }
    };

    // End current session
    const endSession = async () => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) return;

        try {
            const { data } = await supabase
                .from('sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                })
                .eq('id', sessionId)
                .select()
                .single();

            if (data) {
                // Calculate duration
                const started = new Date(data.started_at).getTime();
                const ended = new Date(data.ended_at).getTime();
                const duration = Math.floor((ended - started) / 1000);
                
                await supabase
                    .from('sessions')
                    .update({ duration_seconds: duration })
                    .eq('id', sessionId);
            }
        } catch (e) {
            console.error('Failed to end session:', e);
        }

        sessionIdRef.current = null;
        setCurrentSession(null);
    };

    // Get session history
    const getSessionHistory = async (limit = 10): Promise<Session[]> => {
        const address = walletAddress || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) return [];

        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('wallet_address', address)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to fetch session history:', error);
            return [];
        }

        return data || [];
    };

    // Get session stats
    const getSessionStats = async () => {
        const address = walletAddress || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) return null;

        const { data } = await supabase
            .from('sessions')
            .select('*')
            .eq('wallet_address', address);

        if (!data || data.length === 0) return null;

        const totalSessions = data.length;
        const totalBets = data.reduce((sum, s) => Number(s.total_bets) + sum, 0);
        const totalWins = data.reduce((sum, s) => Number(s.total_wins) + sum, 0);
        const totalGames = data.reduce((sum, s) => s.games_played + sum, 0);
        const totalDuration = data.reduce((sum, s) => (s.duration_seconds || 0) + sum, 0);
        const avgDuration = totalDuration / totalSessions;

        return {
            totalSessions,
            totalBets,
            totalWins,
            totalGames,
            totalDuration,
            avgDuration,
            winRate: totalBets > 0 ? (totalWins / totalBets) * 100 : 0,
        };
    };

    return {
        currentSession,
        updateSession,
        endSession,
        getSessionHistory,
        getSessionStats,
    };
}
