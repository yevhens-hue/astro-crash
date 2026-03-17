'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, User, Gift, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface LeaderboardEntry {
    rank: number;
    user: string;
    profit: string;
    multiplier: string;
    isMe?: boolean;
}

interface RewardInfo {
    amount: number;
    type: string;
    period: string;
}

const REWARD_TIERS: Record<number, RewardInfo> = {
    1: { amount: 10, type: 'TON', period: 'daily' },
    2: { amount: 5, type: 'TON', period: 'daily' },
    3: { amount: 2, type: 'TON', period: 'daily' },
    4: { amount: 5, type: 'BONUS', period: 'daily' },
    5: { amount: 3, type: 'BONUS', period: 'daily' },
};

export default function Leaderboard() {
    const { t } = useI18n();
    const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchLeaderboard = async () => {
            try {
                // Fetch top 10 winners
                const { data: bets, error } = await supabase
                    .from('bets')
                    .select('win_amount, cashout_at, users(wallet_address, username)')
                    .eq('status', 'cashed')
                    .order('win_amount', { ascending: false })
                    .limit(10);

                if (error) throw error;

                if (!isMounted) return;

                const processed: LeaderboardEntry[] = (bets || []).map((b: any, i: number) => {
                    let displayName = 'Unknown';
                    const u = b.users;
                    if (u) {
                        if (u.username) {
                            displayName = u.username; // Already formatted with '@' in page.tsx if applicable
                        } else if (u.wallet_address) {
                            displayName = `@${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}`;
                        }
                    }

                    return {
                        rank: i + 1,
                        user: displayName,
                        profit: `${b.win_amount || 0} TON`,
                        multiplier: `${b.cashout_at || 0}x`,
                    };
                });

                setTopPlayers(processed);
            } catch (e) {
                console.error("Leaderboard fetch failed:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchLeaderboard();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bets',
                    filter: 'status=eq.cashed'
                },
                () => {
                    // Refetch totally on update to preserve accurate ordering/ranks
                    fetchLeaderboard();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // Future enhancement: Fetch the user's actual rank dynamically instead of placeholder
    useEffect(() => {
        setMyRank({ rank: 142, user: '@Bhavish_R', profit: '12.5 TON', multiplier: '2.1x', isMe: true });
    }, []);


    return (
        <div className="flex flex-col gap-4 h-full w-full max-w-sm">
            {/* Top 3 Podium Dynamic */}
            <div className="flex justify-center items-end gap-2 mb-2 h-32 pt-4">
                {topPlayers.length >= 2 ? (
                    <PodiumPlace rank={2} user={topPlayers[1].user} height="h-20" />
                ) : (
                    <PodiumPlace rank={2} user="---" height="h-20" />
                )}

                {topPlayers.length >= 1 ? (
                    <PodiumPlace rank={1} user={topPlayers[0].user} height="h-28" isCrown />
                ) : (
                    <PodiumPlace rank={1} user="---" height="h-28" isCrown />
                )}

                {topPlayers.length >= 3 ? (
                    <PodiumPlace rank={3} user={topPlayers[2].user} height="h-16" />
                ) : (
                    <PodiumPlace rank={3} user="---" height="h-16" />
                )}
            </div>

            {/* Leaderboard Header */}
            <div className="flex justify-between items-center px-4 mb-1">
                <h3 className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-gold" /> {t('top_bets')}
                </h3>
                <span className="text-[8px] text-white/20 uppercase font-black italic">Resets in 2d 14h</span>
            </div>

            {/* Players List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide min-h-[300px]">
                {loading ? (
                    <div className="text-center py-10 text-white/20 animate-pulse uppercase font-bold text-[10px]">{t('processing')}</div>
                ) : topPlayers.length === 0 ? (
                    <div className="text-center py-10 text-white/20 uppercase font-bold text-[10px]">No winners yet today</div>
                ) : (
                    topPlayers.map((player) => (
                        <LeaderboardRow key={player.rank} {...player} />
                    ))
                )}
            </div>

            {/* My Rank Sticky (Personalized placeholder) */}
            <div className="mt-auto pt-2">
                <div className="glass-card !bg-gold/10 border-gold/30 p-3 flex justify-between items-center shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gold">#--</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white uppercase tracking-tighter italic">@Bhavish_R</span>
                            <span className="text-[8px] text-gold/60 uppercase font-bold">{t('status')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PodiumPlace({ rank, user, height, isCrown }: { rank: number, user: string, height: string, isCrown?: boolean }) {
    const reward = REWARD_TIERS[rank];

    return (
        <div className={`flex flex-col items-center gap-1 w-20`}>
            {isCrown && <Crown className="w-4 h-4 text-gold fill-gold/20 animate-bounce mb-1" />}
            {!isCrown && <Medal className={`w-4 h-4 ${rank === 2 ? 'text-slate-300' : 'text-amber-600'} mb-1`} />}
            <div className={`w-full ${height} glass-card relative flex flex-col items-center justify-center border-white/10`}>
                <div className="absolute inset-0 bg-gold/5 blur-xl" />
                <span className="text-xs font-black text-white/80 truncate px-2 w-full text-center tracking-tighter">{user}</span>
                <span className="text-[10px] font-black italic text-gold">#{rank}</span>
                {reward && (
                    <div className="mt-1 flex items-center gap-1 bg-gold/20 px-2 py-0.5 rounded-full">
                        <Gift className="w-3 h-3 text-gold" />
                        <span className="text-[8px] font-black text-gold">{reward.amount} {reward.type}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function LeaderboardRow({ rank, user, profit, multiplier, isMe }: LeaderboardEntry) {
    const reward = REWARD_TIERS[rank];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`glass-card p-3 flex justify-between items-center transition-all ${isMe ? 'border-gold/30 bg-gold/5 shadow-gold/10' : 'border-white/5 bg-white/5 hover:border-gold/20 hover:bg-white/10'}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                    {rank <= 3 ? (
                        <Medal className={`w-4 h-4 ${rank === 1 ? 'text-gold' : rank === 2 ? 'text-slate-300' : 'text-amber-600'}`} />
                    ) : (
                        <span className="text-xs font-black text-white/20 italic">#{rank}</span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/90 truncate max-w-[100px]">{user}</span>
                    <span className="text-[8px] text-white/30 uppercase font-bold">{multiplier} Max X</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {reward && rank <= 5 && (
                    <div className="flex items-center gap-1 bg-purple-500/20 px-2 py-1 rounded-full">
                        <Gift className="w-3 h-3 text-purple-400" />
                        <span className="text-[8px] font-bold text-purple-400">{reward.amount}</span>
                    </div>
                )}
                <div className="text-right">
                    <span className="text-sm font-black gold-text italic tracking-tighter">{profit}</span>
                </div>
            </div>
        </motion.div>
    );
}
