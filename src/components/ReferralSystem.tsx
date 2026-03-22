import { useEffect, useState } from 'react';
import { Share2, Users, Gift, Copy, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface ReferralSystemProps {
    referralCode: string | null;
    userId: string | null;
}

interface Stats {
    l1: number;
    l2: number;
    l3: number;
}

interface Reward {
    id: string;
    level: number;
    amount: number;
    created_at: string;
    referrer_id: string;
    referred_user: {
        username: string;
    };
}

export default function ReferralSystem({ referralCode, userId }: ReferralSystemProps) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState<Stats>({ l1: 0, l2: 0, l3: 0 });
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    const referralLink = referralCode 
        ? `https://t.me/AstroCrashRobot_bot/play?startapp=${referralCode}`
        : "https://t.me/AstroCrashRobot_bot/play";

    useEffect(() => {
        if (userId) {
            fetchStats();
            fetchRewards();
        }
    }, [userId]);

    const fetchStats = async () => {
        try {
            // Level 1 count
            const { count: l1Count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('referrer_id', userId);

            // Level 2 count (simplified for now, ideally via RPC or Recursive CTE)
            const { data: l1Users } = await supabase
                .from('users')
                .select('id')
                .eq('referrer_id', userId);
            
            let l2Count = 0;
            let l3Count = 0;

            if (l1Users && l1Users.length > 0) {
                const l1Ids = l1Users.map(u => u.id);
                const { count: l2 } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .in('referrer_id', l1Ids);
                l2Count = l2 || 0;

                const { data: l2Users } = await supabase
                    .from('users')
                    .select('id')
                    .in('referrer_id', l1Ids);

                if (l2Users && l2Users.length > 0) {
                    const l2Ids = l2Users.map(u => u.id);
                    const { count: l3 } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .in('referrer_id', l2Ids);
                    l3Count = l3 || 0;
                }
            }

            setStats({ l1: l1Count || 0, l2: l2Count, l3: l3Count });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchRewards = async () => {
        try {
            const { data, error } = await supabase
                .from('referral_rewards')
                .select(`
                    id,
                    level,
                    reward_amount,
                    created_at,
                    referred_user_id (
                        username
                    )
                `)
                .eq('referrer_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                // @ts-ignore
                setRewards(data.map(r => ({
                    id: r.id,
                    level: r.level,
                    amount: r.reward_amount,
                    created_at: r.created_at,
                    referred_user: r.referred_user_id 
                })));
            }
        } catch (error) {
            console.error('Error fetching rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const text = encodeURIComponent("🚀 Play AstroCrash and earn together! Join my team:");
        const url = encodeURIComponent(referralLink);
        const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
        
        try {
            const tg = (window as any).Telegram?.WebApp;
            if (tg && typeof tg.openTelegramLink === 'function') {
                tg.openTelegramLink(shareUrl);
            } else {
                window.open(shareUrl, '_blank');
            }
        } catch (e) {
            window.open(shareUrl, '_blank');
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm">
            {/* Referral Link Card */}
            <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Share2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-tight">{t('referral_title')}</h3>
                        <p className="text-[10px] text-white/40 uppercase">{t('referral_desc')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                    <code className="flex-1 text-[10px] text-white/60 truncate">{referralLink}</code>
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-purple-400" />}
                    </button>
                </div>

                <button 
                    onClick={handleShare}
                    className="gold-button w-full flex items-center justify-center gap-2 py-3 !text-sm"
                >
                    <Share2 className="w-4 h-4" /> {t('share')}
                </button>
            </div>

            {/* How it works */}
            <div className="glass-card p-4 bg-purple-500/5 border-purple-500/20">
                <h4 className="text-[10px] font-bold uppercase text-purple-400 mb-2 flex items-center gap-2">
                    <HelpCircle className="w-3 h-3" /> {t('referral_how_it_works')}
                </h4>
                <div className="space-y-1">
                    <p className="text-[10px] text-white/60 font-medium tracking-tight">• {t('referral_l1_desc')}</p>
                    <p className="text-[10px] text-white/60 font-medium tracking-tight">• {t('referral_l2_desc')}</p>
                    <p className="text-[10px] text-white/60 font-medium tracking-tight">• {t('referral_l3_desc')}</p>
                </div>
                <p className="text-[8px] text-white/30 uppercase mt-2 font-black italic tracking-widest">{t('referral_note')}</p>
            </div>

            {/* MLM Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Lvl 1 (10%)" value={stats.l1.toString()} icon={<Users className="w-3 h-3 text-gold" />} />
                <StatCard label="Lvl 2 (3%)" value={stats.l2.toString()} icon={<Users className="w-3 h-3 text-purple-400" />} />
                <StatCard label="Lvl 3 (1%)" value={stats.l3.toString()} icon={<Users className="w-3 h-3 text-blue-400" />} />
            </div>

            {/* Referral Rewards */}
            <div className="glass-card p-4">
                <h4 className="text-[10px] font-bold uppercase text-white/40 mb-3 flex items-center gap-2">
                    <Gift className="w-3 h-3" /> {t('balance_history')}
                </h4>
                <div className="flex flex-col gap-2">
                    {rewards.length > 0 ? (
                        rewards.map(reward => (
                            <RewardRow 
                                key={reward.id}
                                user={reward.referred_user?.username || 'Player'} 
                                amount={`+${reward.amount.toFixed(2)} TON`} 
                                level={`Lvl ${reward.level}`} 
                            />
                        ))
                    ) : (
                        <p className="text-[10px] text-center text-white/20 py-4 uppercase">No rewards yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="glass-card p-3 flex flex-col items-center gap-1 border-white/5">
            {icon}
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">{label}</span>
            <span className="text-sm font-black text-white">{value}</span>
        </div>
    );
}

function RewardRow({ user, amount, level }: { user: string, amount: string, level: string }) {
    return (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
            <div className="flex flex-col">
                <span className="text-[10px] font-medium text-white/60">{user}</span>
                <span className="text-[8px] uppercase font-bold text-purple-400">{level} Bonus</span>
            </div>
            <span className="text-xs font-bold text-green-400">{amount}</span>
        </div>
    );
}
