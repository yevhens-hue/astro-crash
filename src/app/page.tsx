"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTonWallet, TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { Home, Trophy, Menu, TrendingUp, Users, MessageSquare, ArrowUpRight, ArrowDownLeft, X, Loader2, Shield, Send, Volume2, VolumeX } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/flags';
import { supabase } from '@/lib/supabase';
import CrashGame from '@/components/CrashGame';
import SlotMachine from '@/components/SlotMachine';
import ReferralSystem from '@/components/ReferralSystem';
import LiveChat from '@/components/LiveChat';
import Leaderboard from '@/components/Leaderboard';
import BalanceHistoryModal from '@/components/BalanceHistoryModal';

// ─── Modal Component ──────────────────────────────────────────────────────────
function TxModal({
  type,
  balance,
  onClose,
  onConfirm,
  defaultAddress,
}: {
  type: 'deposit' | 'withdraw';
  balance: number;
  onClose: () => void;
  onConfirm: (amount: number, address?: string) => Promise<void>;
  defaultAddress?: string;
}) {
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState(defaultAddress || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDeposit = type === 'deposit';
  const presets = isDeposit ? [0.5, 1, 2, 5] : [0.5, 1, Math.min(2, balance), Math.min(5, balance)].filter((v, i, a) => a.indexOf(v) === i);

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Enter a valid amount'); return; }
    if (!isDeposit && val > balance) { setError('Insufficient balance'); return; }
    if (val < 0.1) { setError('Minimum 0.1 TON'); return; }
    if (!isDeposit && !recipientAddress) { setError('Enter recipient address'); return; }
    
    setError('');
    setLoading(true);
    try {
      await onConfirm(val, recipientAddress);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-t-[2rem] p-6 pb-10 flex flex-col gap-5 animate-[slideUp_0.25s_ease]">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDeposit ? 'bg-green-500/20' : 'bg-gold/20'}`}>
              {isDeposit
                ? <ArrowDownLeft className="w-5 h-5 text-green-400" />
                : <ArrowUpRight className="w-5 h-5 text-gold" />
              }
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                {isDeposit ? 'Deposit TON' : 'Withdraw TON'}
              </h3>
              {!isDeposit && (
                <p className="text-[10px] text-white/40 font-bold">
                  Available: {balance.toFixed(2)} TON
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Amount Input */}
        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Amount (TON)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="flex-1 bg-transparent text-3xl font-black text-white outline-none placeholder:text-white/20"
              autoFocus
            />
            <span className="text-sm font-black text-white/30">TON</span>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p.toString()); setError(''); }}
              className="flex-1 py-2 text-[11px] font-black uppercase rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/60"
            >
              {p} TON
            </button>
          ))}
        </div>

        {/* Recipient Address (Only for Withdraw) */}
        {!isDeposit && (
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Recipient Address</span>
            <input
              type="text"
              placeholder="UQ..."
              value={recipientAddress}
              onChange={(e) => { setRecipientAddress(e.target.value); setError(''); }}
              className="bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/20 break-all"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-[11px] font-bold text-red-400 text-center">{error}</p>
        )}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={loading || !amount}
          className={`gold-button w-full py-4 text-base rounded-2xl flex items-center justify-center gap-2 ${(loading || !amount) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Processing...' : isDeposit ? 'Deposit' : 'Withdraw'}
        </button>

        {isDeposit && (
          <p className="text-[9px] text-white/20 text-center font-bold uppercase tracking-widest">
            TON will be credited after blockchain confirmation
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Burger Menu Component ──────────────────────────────────────────────────
function BurgerMenu({
  isOpen,
  onClose,
  balance,
  address,
}: {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  address: string | null;
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showProvablyTooltip, setShowProvablyTooltip] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  return (
    <>
      <BalanceHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} walletAddress={address || ''} />
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[70] w-full max-w-[280px] bg-[#0a0a0a] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase italic gold-text">Menu</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-6 h-6 text-white/40" />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="glass-card p-4 mb-6 border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-black font-bold">
                {address ? address.slice(2, 4).toUpperCase() : 'G'}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Status</span>
                <span className="text-xs font-black text-white italic">Elite Explorer</span>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Balance</span>
                <span className="text-base font-black gold-text leading-none">{balance.toFixed(2)} TON</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={() => setShowProvablyTooltip(!showProvablyTooltip)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left relative"
            >
              <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">Provably Fair</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">What is this?</span>
              </div>
            </button>

            {showProvablyTooltip && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-200/80 mx-2 animate-in fade-in slide-in-from-top-2">
                Every game round result is generated using a secure SHA-256 hash before bets are placed. This guarantees the server cannot secretly change the result after you bet.
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">Balance History</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">View Transactions</span>
              </div>
            </button>

            <button
              onClick={() => {
                const newSoundEnabled = !soundEnabled;
                setSoundEnabled(newSoundEnabled);
                // Assume SoundManager global toggle exists or map accordingly
                import('@/lib/sounds').then(m => m.SoundManager.init(newSoundEnabled));
              }}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                {soundEnabled ? <Volume2 className="w-5 h-5 text-purple-400" /> : <VolumeX className="w-5 h-5 text-white/40" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">Audio Effects</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </div>
            </button>
          </div>

          {/* Bottom Footer */}
          <div className="mt-auto pt-6 border-t border-white/5">
            {!address?.includes('guest') && <TonConnectButton />}
            <p className="text-[8px] text-white/20 text-center mt-4 uppercase font-bold tracking-[0.3em]">
              Astro Hub v1.0.4
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [balance, setBalance] = useState<number>(0);
  const wallet = useTonWallet();
  const [activeTab, setActiveTab] = useState<'home' | 'referral' | 'leaderboard' | 'chat'>('home');
  const [activeGame, setActiveGame] = useState<'crash' | 'slots'>('crash');
  const [tonConnectUI] = useTonConnectUI();
  const [txModal, setTxModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const address = wallet?.account.address || (FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);

  useEffect(() => {
    const fetchBalance = async (userAddress: string) => {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id;
      const tgUsername = tgUser?.username
        ? `@${tgUser.username}`
        : (tgUser?.first_name || null);

      const { data, error } = await supabase
        .from('users')
        .select('id, balance, username')
        .eq('wallet_address', userAddress)
        .single();

      if (data) {
        setBalance(Number(data.balance));
        // Update username or ID if missing/changed
        if (telegramId || (tgUsername && data.username !== tgUsername)) {
          await supabase
            .from('users')
            .update({
              ...(telegramId ? { telegram_id: telegramId } : {}),
              ...(tgUsername ? { username: tgUsername } : {})
            })
            .eq('id', data.id);
        }
        setBalance(Number(data.balance));
        if (data.username || tgUsername) setUsername(data.username || tgUsername);
        // Auto-recover any stuck deposits quietly in the background
        if (!FEATURE_FLAGS.GUEST_MODE) {
          supabase.functions.invoke('ton-webhook', {
            body: { sender: userAddress, type: 'deposit' } // No amount specified, forces full sweep
          }).then(res => {
            if (res.data?.success && res.data?.processed > 0) {
              console.log(`Auto-recovered ${res.data.processed} stuck deposits!`);
            }
          }).catch(console.error);
        }
      } else if (error && error.code === 'PGRST116') {
        // Enforce balance=0 in production to pass RLS, otherwise grant 10.0 for guest testing
        const initialBalance = FEATURE_FLAGS.GUEST_MODE ? 10.0 : 0.0;
        const { data: newData } = await supabase
          .from('users')
          .insert({
            wallet_address: address,
            balance: initialBalance,
            telegram_id: telegramId,
            username: tgUsername
          })
          .select()
          .single();

        setBalance(initialBalance);
        if (tgUsername) setUsername(tgUsername);
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
  }, [address]);

  const handleDeposit = useCallback(async (amount: number) => {
    if (!wallet) throw new Error("Please connect your wallet first");

    const amountInNano = (amount * 1e9).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [{ address: FEATURE_FLAGS.HOUSE_WALLET, amount: amountInNano }],
    };

    const sentTx = await tonConnectUI.sendTransaction(transaction);
    if (sentTx) {
      if (FEATURE_FLAGS.GUEST_MODE && address) {
        // Optimistic balance update for guest/demo mode
        const { data: userData } = await supabase
          .from('users')
          .select('id, balance')
          .eq('wallet_address', address)
          .single();
        if (userData) {
          await supabase
            .from('users')
            .update({ balance: Number(userData.balance) + amount })
            .eq('id', userData.id);
        }
      } else if (address) {
        // Production: Poll backend to verify transaction via TonCenter
        let attempts = 0;
        const pollVerification = async () => {
          if (attempts >= 10) {
            alert('Network is busy. Your deposit is still confirming on the blockchain and will appear in your balance automatically soon.');
            return;
          }
          attempts++;
          try {
            const res = await supabase.functions.invoke('ton-webhook', {
              body: { sender: address, amount: amount, type: 'deposit' }
            });
            if (res.data?.success) {
              alert(`Deposit Confirmed! +${amount} TON added to your balance.`);
            } else {
              setTimeout(pollVerification, 10000); // Retry in 10s if not found yet
            }
          } catch (e) {
            setTimeout(pollVerification, 10000);
          }
        };
        // Wait 10s for the first block confirmation before checking
        setTimeout(pollVerification, 10000);
      }
    }
  }, [wallet, tonConnectUI, address]);

  const handleWithdraw = useCallback(async (amount: number, customAddress?: string) => {
    if (!wallet) throw new Error("Please connect your wallet first");
    if (amount > balance) throw new Error("Insufficient balance");
    
    const targetAddress = customAddress || wallet.account.address;
    if (!targetAddress) throw new Error("Recipient address is required");

    // Optimistically update the UI to feel instant
    setBalance(prev => prev - amount);

    try {
      const response = await supabase.functions.invoke('process-withdrawal', {
        body: { amount, wallet_address: targetAddress }
      });

      if (!response.data?.success) {
        throw new Error(response.error?.message || response.data?.error || "Withdrawal failed");
      }

      alert(`Withdrawal of ${amount} TON initiated successfully! Your funds will arrive in your wallet shortly.`);
    } catch (err: any) {
      // Revert optimistic update on failure
      setBalance(prev => prev + amount);
      throw err;
    }
  }, [wallet, balance]);

  return (
    <main className="flex-1 flex flex-col p-4 gap-6 min-h-screen bg-black text-white">
      {/* Deposit / Withdraw Modal */}
      {txModal && (
        <TxModal
          type={txModal}
          balance={balance}
          onClose={() => setTxModal(null)}
          onConfirm={txModal === 'deposit' ? handleDeposit : handleWithdraw}
          defaultAddress={wallet?.account.address}
        />
      )}

      {/* Burger Menu drawer */}
      <BurgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        balance={balance}
        address={address}
      />

      {/* Header */}
      <header className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center shadow-gold">
            <TrendingUp className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tighter">Astro Hub</h1>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 glass-card border-none hover:bg-white/10 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

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
              onClick={() => setTxModal('deposit')}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5 active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold uppercase">Deposit</span>
            </button>
            <button
              onClick={() => setTxModal('withdraw')}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5 active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold uppercase">Withdraw</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
        {(['home', 'referral', 'leaderboard', 'chat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'bg-gold text-black shadow-gold' : 'text-white/40 hover:text-white/60'}`}
          >
            {tab === 'home' && <Home className="w-5 h-5" />}
            {tab === 'referral' && <Users className="w-5 h-5" />}
            {tab === 'leaderboard' && <Trophy className="w-5 h-5" />}
            {tab === 'chat' && <MessageSquare className="w-5 h-5" />}
            <span className="text-[8px] uppercase font-black tracking-widest">{tab}</span>
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

              {/* <button
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
              </button> */}
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
              {activeGame === 'crash' ? <CrashGame balance={balance} onBalanceUpdate={setBalance} /> : <SlotMachine balance={balance} onBalanceUpdate={setBalance} />}
            </div>
          </div>
        )}

        {activeTab === 'referral' && <ReferralSystem />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'chat' && <LiveChat currentUsername={username} />}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
