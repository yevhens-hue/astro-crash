"use client";

import { useState, useEffect } from 'react';
import { useTonWallet, TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { Home, Trophy, Menu, TrendingUp, Users, MessageSquare, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/flags';
import { supabase } from '@/lib/supabase';
import CrashGame from '@/components/CrashGame';
import SlotMachine from '@/components/SlotMachine';
import ReferralSystem from '@/components/ReferralSystem';
import LiveChat from '@/components/LiveChat';
import Leaderboard from '@/components/Leaderboard';

export default function Page() {
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'home' | 'referral' | 'leaderboard' | 'chat'>('home');
  const [activeGame, setActiveGame] = useState<'crash' | 'slots'>('crash');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tonConnectUI] = useTonConnectUI();

  // Mock local state for testing
  const FEATURE_FLAGS = { GUEST_MODE: true, HOUSE_WALLET: 'UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA', DEBUG_MODE: true };
  const wallet = null;
  const address = "guest_test_wallet";

  useEffect(() => {
    const fetchBalance = async (userAddress: string) => {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id;

      const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('wallet_address', userAddress)
        .single();

      if (data) {
        setBalance(Number(data.balance));
        if (telegramId) {
          await supabase
            .from('users')
            .update({ telegram_id: telegramId })
            .eq('wallet_address', userAddress);
        }
      } else if (error && error.code === 'PGRST116') {
        const initialBalance = FEATURE_FLAGS.GUEST_MODE ? 10.0 : 0.1;
        await supabase
          .from('users')
          .insert({
            wallet_address: userAddress,
            balance: initialBalance,
            telegram_id: telegramId
          });
        setBalance(initialBalance);
      }
    };

    if (address) {
      fetchBalance(address);

      const channel = supabase
        .channel('user_balance')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `wallet_address=eq.${address}`
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
  }, [wallet, address]);

  const handleDeposit = async () => {
    if (!wallet && !FEATURE_FLAGS.GUEST_MODE) {
      alert("Please connect your wallet first!");
      return;
    }

    const amount = prompt("Enter amount to deposit (TON):", "1.0");
    if (!amount || isNaN(parseFloat(amount))) return;

    if (FEATURE_FLAGS.GUEST_MODE) {
      // Optimistic update for guest mode
      setBalance(prev => prev + parseFloat(amount));
      alert("Guest Deposit Success! (Test Mode)");
      return;
    }

    try {
      const amountInNano = (parseFloat(amount) * 1e9).toString();
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [{ address: FEATURE_FLAGS.HOUSE_WALLET, amount: amountInNano }],
      };

      const sentTx = await tonConnectUI.sendTransaction(transaction);
      if (sentTx) {
        alert("Deposit transaction sent! Balance will update.");
      }
    } catch (e) {
      console.error("Deposit failed:", e);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet && !FEATURE_FLAGS.GUEST_MODE) {
      alert("Please connect your wallet first!");
      return;
    }

    const amount = prompt("Enter amount to withdraw (TON):", "1.0");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) > balance) {
      alert("Invalid amount or insufficient balance");
      return;
    }

    if (FEATURE_FLAGS.GUEST_MODE) {
      setBalance(prev => prev - parseFloat(amount));
      alert("Guest Withdrawal Success! (Test Mode)");
      return;
    }

    try {
      const response = await supabase.functions.invoke('process-withdrawal', {
        body: { amount: parseFloat(amount), wallet_address: (wallet as any)?.account?.address || address }
      });

      if (response.data?.success) {
        alert(`Withdrawal of ${amount} TON initiated!`);
      } else {
        alert(`Withdrawal failed: ${response.error?.message || "Internal error"}`);
      }
    } catch (e) {
      console.error("Withdrawal failed:", e);
    }
  };

  return (
    <main className="flex-1 flex flex-col px-3 pt-3 pb-4 gap-4 min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center shadow-gold">
            <TrendingUp className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tighter text-blue-400">Local Testing</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 glass-card border-none hover:bg-white/10 transition-colors relative z-50"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Burger Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-right-10 duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold gold-text italic">ASTRO MENU</h2>
            <button onClick={() => setIsMenuOpen(false)} className="text-white/60 uppercase text-xs font-bold border border-white/10 px-3 py-1 rounded-full">Close</button>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            {['Profile', 'Settings', 'Transactions', 'Support', 'Fairness'].map(item => (
              <button key={item} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <span className="text-sm font-bold uppercase tracking-wider group-hover:text-gold">{item}</span>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-gold" />
              </button>
            ))}
          </div>
          <div className="mt-auto pb-10 text-center">
            <span className="text-[10px] text-white/20 uppercase font-black tracking-[0.3em]">Astro Hub v1.0.2</span>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div className="glass-card p-6 flex flex-col items-center gap-2 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em]">Digital Balance</span>
        <div className="flex items-baseline gap-2">
          <h2 className="text-5xl font-black italic gold-text tracking-tighter">
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',')}
          </h2>
          <span className="text-xl font-black text-gold/40 italic">TON</span>
        </div>

        {/* Wallet Display */}
        {address ? (
          <div className="flex items-center gap-2 mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-bold text-white/60 tracking-wider">
              {address.slice(0, 4)}...{address.slice(-4)}
            </span>
            <ArrowUpRight className="w-3 h-3 text-white/20" />
          </div>
        ) : (
          <div className="mt-4">
            <TonConnectButton />
          </div>
        )}

        {/* Action Buttons */}
        {address && (
          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={handleDeposit}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
            >
              <ArrowDownLeft className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold uppercase">Deposit</span>
            </button>
            <button
              onClick={handleWithdraw}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
            >
              <ArrowUpRight className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold uppercase">Withdraw</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
        {['home', 'referral', 'leaderboard', 'chat'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all min-w-0 ${activeTab === tab ? 'bg-gold text-black shadow-gold' : 'text-white/40 hover:text-white/60'}`}
          >
            {tab === 'home' && <Home className="w-4 h-4 shrink-0" />}
            {tab === 'referral' && <Users className="w-4 h-4 shrink-0" />}
            {tab === 'leaderboard' && <Trophy className="w-4 h-4 shrink-0" />}
            {tab === 'chat' && <MessageSquare className="w-4 h-4 shrink-0" />}
            <span className="text-[7px] uppercase font-black truncate w-full text-center leading-none px-0.5">
              {tab === 'leaderboard' ? 'Top' : tab}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 pb-24">
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            {/* Game Selector */}
            <div className="flex gap-4">
              <button
                onClick={() => setActiveGame('crash')}
                className={`flex-1 p-4 rounded-3xl border transition-all flex flex-col gap-3 relative overflow-hidden group ${activeGame === 'crash' ? 'bg-gold/10 border-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${activeGame === 'crash' ? 'bg-gold text-black' : 'bg-white/10 text-white/40'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black gold-text italic">LIVE</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black italic tracking-tight uppercase">Astro Crash</span>
                  <span className="text-[9px] font-bold text-white/40 uppercase">High Multipliers</span>
                </div>
                {activeGame === 'crash' && <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-gold/20 blur-2xl rounded-full" />}
              </button>
              |
              <button
                onClick={() => setActiveGame('slots')}
                className={`flex-1 p-4 rounded-3xl border transition-all flex flex-col gap-3 relative overflow-hidden group ${activeGame === 'slots' ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${activeGame === 'slots' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-purple-400 italic">NEW</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black italic tracking-tight uppercase">Galaxy Slots</span>
                  <span className="text-[9px] font-bold text-white/40 uppercase">Jackpot 500x</span>
                </div>
                {activeGame === 'slots' && <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-purple-500/20 blur-2xl rounded-full" />}
              </button>
            </div>

            {FEATURE_FLAGS.GUEST_MODE && !wallet && (
              <div className="w-full bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Guest Testing Mode</span>
                </div>
                <span className="text-[8px] font-bold text-white/20 uppercase">No Wallet Required</span>
              </div>
            )}

            {/* Active Game Display */}
            <div className="w-full flex justify-center">
              {activeGame === 'crash' ? (
                <CrashGame balance={balance} onBalanceUpdate={setBalance} />
              ) : (
                <SlotMachine balance={balance} onBalanceUpdate={setBalance} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'referral' && <ReferralSystem />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'chat' && <LiveChat />}
      </div>
    </main>
  );
}
