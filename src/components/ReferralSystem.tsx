'use client';

import { useState } from 'react';
import { Share2, Users, Gift, Copy, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReferralSystem() {
    const [copied, setCopied] = useState(false);
    const referralLink = "https://t.me/AstroCrashGame_bot?start=ref12345";

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                        <h3 className="text-sm font-bold uppercase tracking-tight">Invite & Earn</h3>
                        <p className="text-[10px] text-white/40 uppercase">3-Level MLM Program</p>
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

                <button className="gold-button w-full flex items-center justify-center gap-2 py-3 !text-sm">
                    <Share2 className="w-4 h-4" /> Share with Friends
                </button>
            </div>

            {/* MLM Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Lvl 1 (10%)" value="12" icon={<Users className="w-3 h-3 text-gold" />} />
                <StatCard label="Lvl 2 (3%)" value="45" icon={<Users className="w-3 h-3 text-purple-400" />} />
                <StatCard label="Lvl 3 (1%)" value="128" icon={<Users className="w-3 h-3 text-blue-400" />} />
            </div>

            {/* Referral Rewards */}
            <div className="glass-card p-4">
                <h4 className="text-[10px] font-bold uppercase text-white/40 mb-3 flex items-center gap-2">
                    <Gift className="w-3 h-3" /> Recent Rewards
                </h4>
                <div className="flex flex-col gap-2">
                    <RewardRow user="@raj_123" amount="+0.45 TON" level="Lvl 1" />
                    <RewardRow user="@crypto_king" amount="+0.12 TON" level="Lvl 2" />
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
