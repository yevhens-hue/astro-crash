'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Gamepad2, TrendingUp, TrendingDown, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface SessionStats {
    totalSessions: number;
    totalBets: number;
    totalWins: number;
    totalGames: number;
    totalDuration: number;
    avgDuration: number;
    winRate: number;
}

interface SessionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

export default function SessionHistoryModal({ isOpen, onClose, walletAddress }: SessionHistoryModalProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && walletAddress) {
            fetchData();
        }
    }, [isOpen, walletAddress]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch sessions
        const { data: sessionsData } = await supabase
            .from('sessions')
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('started_at', { ascending: false })
            .limit(20);

        // Fetch stats
        const { data: allSessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('wallet_address', walletAddress);

        if (allSessions && allSessions.length > 0) {
            const totalSessions = allSessions.length;
            const totalBets = allSessions.reduce((sum, s) => Number(s.total_bets) + sum, 0);
            const totalWins = allSessions.reduce((sum, s) => Number(s.total_wins) + sum, 0);
            const totalGames = allSessions.reduce((sum, s) => s.games_played + sum, 0);
            const totalDuration = allSessions.reduce((sum, s) => (s.duration_seconds || 0) + sum, 0);
            const avgDuration = totalDuration / totalSessions;

            setStats({
                totalSessions,
                totalBets,
                totalWins,
                totalGames,
                totalDuration,
                avgDuration,
                winRate: totalBets > 0 ? (totalWins / totalBets) * 100 : 0,
            });
        }

        setSessions(sessionsData || []);
        setLoading(false);
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl max-h-[80vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">Session History</h3>
                                    <p className="text-xs text-white/40">Your playing sessions</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        {/* Stats */}
                        {stats && (
                            <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/5">
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-lg font-black text-white">{stats.totalSessions}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-bold">Sessions</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-lg font-black text-green-400">{formatNumber(stats.totalGames)}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-bold">Games</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-lg font-black text-blue-400">{formatDuration(Math.round(stats.avgDuration))}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-bold">Avg Time</div>
                                </div>
                            </div>
                        )}

                        {/* Session List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loading ? (
                                <div className="text-center py-8 text-white/40">Loading...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-8 text-white/40">
                                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No sessions yet
                                </div>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={`p-3 rounded-xl border ${session.is_active
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-white/40" />
                                                <span className="text-xs text-white/60">{formatDate(session.started_at)}</span>
                                            </div>
                                            {session.is_active && (
                                                <span className="text-[10px] font-bold text-green-400 uppercase">Active</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-1">
                                                <Gamepad2 className="w-3 h-3 text-purple-400" />
                                                <span className="text-white/60">{session.games_played} games</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-blue-400" />
                                                <span className="text-white/60">{formatDuration(session.duration_seconds)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {Number(session.total_wins) >= Number(session.total_bets) ? (
                                                    <TrendingUp className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                )}
                                                <span className={Number(session.total_wins) >= Number(session.total_bets) ? 'text-green-400' : 'text-red-400'}>
                                                    {formatNumber(Number(session.total_wins) - Number(session.total_bets))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
