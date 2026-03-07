"use client";

import { useState, useEffect } from 'react';
import { useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import { Home, Trophy, Menu, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CrashGame from '@/components/CrashGame';
import ReferralSystem from '@/components/ReferralSystem';
import LiveChat from '@/components/LiveChat';
import Leaderboard from '@/components/Leaderboard';

export default function Page() {
  const [balance, setBalance] = useState<number>(0);
  const wallet = useTonWallet();
  const [activeTab, setActiveTab] = useState<'home' | 'referral' | 'leaderboard' | 'chat'>('home');

  useEffect(() => {
    if (wallet?.account.address) {
      const fetchBalance = async () => {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = tgUser?.id;

        const { data, error } = await supabase
          .from('users')
          .select('balance')
          .eq('wallet_address', wallet.account.address)
          .single();

        if (data) {
          setBalance(Number(data.balance));
          // Update telegram_id if it's missing
          if (telegramId) {
            await supabase
              .from('users')
              .update({ telegram_id: telegramId })
              .eq('wallet_address', wallet.account.address);
          }
        } else if (error && error.code === 'PGRST116') {
          // User doesn't exist yet, create them
          await supabase
            .from('users')
            .insert({
              wallet_address: wallet.account.address,
              balance: 0,
              telegram_id: telegramId
            });
          setBalance(0);
        }
      };

      fetchBalance();

      // Real-time subscription for balance updates
      const channel = supabase
        .channel('user_balance')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `wallet_address=eq.${wallet.account.address}`
        }, (payload: any) => {
          if (payload.new && typeof payload.new.balance !== 'undefined') {
            setBalance(Number(payload.new.balance));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setBalance(0);
    }
  }, [wallet]);

  return (
    <main className="flex-1 flex flex-col p-4 gap-6">
      {/* Header */}
      <header className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center shadow-gold">
            {activeTab === 'home' ? (
              <TrendingUp className="text-black w-6 h-6" />
            ) : activeTab === 'referral' ? (
              <Users className="text-black w-6 h-6" />
            ) : activeTab === 'chat' ? (
              <MessageSquare className="text-black w-6 h-6" />
            ) : (
              <Trophy className="text-black w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tighter">
              {activeTab === 'home' ? 'Astro Crash' : activeTab === 'referral' ? 'Referral' : activeTab === 'chat' ? 'Global Chat' : 'Leaderboard'}
            </h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="p-2 glass-card border-none hover:bg-white/10 transition-colors">
            <Menu className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <section className="glass-card p-6 flex flex-col items-center gap-2 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-3xl -mr-12 -mt-12" />
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Digital Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black gold-text tracking-tight">
            {balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xl font-bold text-gold">TON</span>
        </div>
        <div className="mt-4">
          <TonConnectButton />
        </div>
      </section>

      {/* Content Area */}
      <section className="flex-1 flex flex-col items-center justify-center relative">
        {activeTab === 'home' ? (
          <div className="w-full h-full glass-card p-4 flex flex-col items-center justify-center border-gold/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold-glow)_0%,_transparent_70%)] opacity-10" />
            <CrashGame />
          </div>
        ) : activeTab === 'referral' ? (
          <ReferralSystem />
        ) : activeTab === 'chat' ? (
          <LiveChat />
        ) : (
          <Leaderboard />
        )}
      </section>

      {/* Navigation */}
      <nav className="glass-card mb-4 flex justify-around p-3">
        <NavItem
          icon={<Home />}
          label="Home"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <NavItem
          icon={<Users />}
          label="Referral"
          active={activeTab === 'referral'}
          onClick={() => setActiveTab('referral')}
        />
        <NavItem
          icon={<MessageSquare />}
          label="Chat"
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
        />
        <NavItem
          icon={<Trophy />}
          label="Ranking"
          active={activeTab === 'leaderboard'}
          onClick={() => setActiveTab('leaderboard')}
        />
      </nav>
    </main>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-gold scale-110' : 'text-white/40 hover:text-white/60'}`}
    >
      <div className={active ? 'text-gold' : 'text-white/40'}>
        {icon}
      </div>
      <span className="text-[10px] uppercase font-bold tracking-tighter">{label}</span>
    </button>
  );
}
