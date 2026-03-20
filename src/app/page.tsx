"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useTonWallet, TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Home, Trophy, Menu, TrendingUp, Users, MessageSquare, ArrowUpRight, ArrowDownLeft, X, Loader2, Shield, Send, Volume2, VolumeX, Gift, Bell, BellOff, Settings, Palette } from 'lucide-react';
import TxModal from '@/components/TxModal';
import { FEATURE_FLAGS } from '@/lib/flags';
import { useI18n } from '@/lib/i18n';
import { SoundManager } from '@/lib/sounds';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import CrashGame from '@/components/CrashGame';
import SlotMachine from '@/components/SlotMachine';
import ReferralSystem from '@/components/ReferralSystem';
import LiveChat from '@/components/LiveChat';
import Leaderboard from '@/components/Leaderboard';
import BalanceHistoryModal from '@/components/BalanceHistoryModal';
import BigWinCard from '@/components/BigWinCard';
import VIPStatus from '@/components/VIPStatus';
import SoundSettingsModal from '@/components/SoundSettingsModal';
import ThemeSelector from '@/components/ThemeSelector';
import SessionHistoryModal from '@/components/SessionHistoryModal';

// ─── Welcome Bonus Modal ───────────────────────────────────────────────────
function WelcomeBonusModal({
  amount,
  onClose,
}: {
  amount: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#111] border-2 border-gold/50 rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-6 animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_50px_rgba(255,215,0,0.2)]">
        <div className="relative">
          <div className="absolute inset-0 bg-gold blur-2xl opacity-20 animate-pulse" />
          <div className="w-24 h-24 bg-gradient-to-br from-gold to-gold-dark rounded-3xl flex items-center justify-center shadow-gold transform rotate-12">
            <Gift className="w-12 h-12 text-black" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-3xl font-black uppercase italic gold-text tracking-tighter">{t('welcome_title')}</h3>
          <p className="text-white/60 text-sm font-bold uppercase tracking-widest">{t('welcome_subtitle')}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 w-full flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-gold/60 tracking-[0.3em]">{t('bonus_credited')}</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white">{amount}</span>
            <span className="text-xl font-black gold-text italic">TON</span>
          </div>
        </div>

        <div className="text-xs text-white/50 px-4">
          {t('welcome_bonus_desc')}
        </div>

        <button
          onClick={onClose}
          className="gold-button w-full py-5 text-lg rounded-2xl font-black uppercase italic tracking-wider active:scale-95 transition-transform"
        >
          {t('lets_play')}
        </button>
      </div>
    </div>
  );
}



// ─── Burger Menu Component ──────────────────────────────────────────────────
function BurgerMenu({
  isOpen,
  onClose,
  balance,
  bonusBalance,
  wageringRequirement,
  wageringTotal,
  address,
  onToggleNotifications,
  notificationsEnabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  bonusBalance: number;
  wageringRequirement: number;
  wageringTotal: number;
  address: string | null;
  onToggleNotifications: (enabled: boolean) => void;
  notificationsEnabled: boolean;
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showProvablyTooltip, setShowProvablyTooltip] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSessionHistoryModal, setShowSessionHistoryModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <BalanceHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} walletAddress={address || ''} />
      <SessionHistoryModal isOpen={showSessionHistoryModal} onClose={() => setShowSessionHistoryModal(false)} walletAddress={address || ''} />
      <SoundSettingsModal isOpen={showSoundSettings} onClose={() => setShowSoundSettings(false)} />
      <ThemeSelector isOpen={showThemeSelector} onClose={() => setShowThemeSelector(false)} />
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[70] w-full max-w-[280px] bg-[var(--custom-bg,#0a0a0a)] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out transform flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-6 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase italic gold-text">{t('menu')}</h3>
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
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{t('status')}</span>
                <span className="text-xs font-black text-white italic">{t('elite_explorer')}</span>
              </div>
            </div>
            <div className="flex justify-between items-end gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('main_balance')}</span>
                <span className="text-base font-black gold-text leading-none">{(balance || 0).toFixed(2)} TON</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 text-right">{t('bonus_balance')}</span>
                <span className="text-base font-black text-white/80 leading-none">{(bonusBalance || 0).toFixed(2)} TON</span>
              </div>
            </div>

            {wageringTotal > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                  <span className="text-white/40">{t('wagering_progress')}</span>
                  <span className="gold-text">{(wageringTotal > 0 ? Math.max(0, 100 - (wageringRequirement / wageringTotal * 100)) : 0).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-dark transition-all duration-500"
                    style={{ width: `${Math.max(0, 100 - (wageringRequirement / wageringTotal * 100))}%` }}
                  />
                </div>
                <span className="text-[7px] text-white/20 text-center font-bold uppercase">
                  {(wageringRequirement || 0).toFixed(2)} TON {t('wagering_left')}
                </span>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto pb-8 scrollbar-hide">
            <button
              onClick={() => setShowProvablyTooltip(!showProvablyTooltip)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left relative"
            >
              <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('provably_fair')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{t('what_is_this')}</span>
              </div>
            </button>

            {showProvablyTooltip && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-200/80 mx-2 animate-in fade-in slide-in-from-top-2">
                {t('provably_fair_desc')}
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
                <span className="text-sm font-bold text-white/80">{t('balance_history')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{t('view_transactions')}</span>
              </div>
            </button>

            <button
              onClick={() => setShowSessionHistoryModal(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-teal-500/10 rounded-xl group-hover:bg-teal-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('session_history' as any)}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{t('your_play_sessions' as any)}</span>
              </div>
            </button>

            <button
              onClick={() => setShowThemeSelector(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">Theme</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">Customize colors</span>
              </div>
            </button>

            <a
              href="https://luckybetvip.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-gold/10 rounded-xl group-hover:bg-gold/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('aviator_strategies')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">LuckyBetVIP PBN</span>
              </div>
            </a>

            <a
              href="https://game-income.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                <Trophy className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('best_bonuses')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">Games-Income.com</span>
              </div>
            </a>



            <button
              onClick={() => onToggleNotifications(!notificationsEnabled)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className={`p-2 ${notificationsEnabled ? 'bg-orange-500/10' : 'bg-white/5'} rounded-xl transition-colors`}>
                {notificationsEnabled ? <Bell className="w-5 h-5 text-orange-400" /> : <BellOff className="w-5 h-5 text-white/40" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('push_notifications')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{notificationsEnabled ? t('active') : t('disabled')}</span>
              </div>
            </button>

            <button
              onClick={() => {
                const isEnabled = SoundManager.toggleMute();
                setSoundEnabled(isEnabled);
              }}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                {soundEnabled ? <Volume2 className="w-5 h-5 text-purple-400" /> : <VolumeX className="w-5 h-5 text-white/40" />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">{t('audio_effects')}</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">{soundEnabled ? t('enabled') : t('muted')}</span>
              </div>
            </button>

            <button
              onClick={() => setShowSoundSettings(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group text-left"
            >
              <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/80">Sound Settings</span>
                <span className="text-[10px] text-white/30 uppercase font-bold">Customize</span>
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
  const { t } = useI18n();
  const [balance, setBalance] = useState<number>(0);
  const wallet = useTonWallet();
  const rawAddress = wallet?.account.address;
  const friendlyAddress = useTonAddress();

  // Calculate a reliable friendly address
  const displayAddress = React.useMemo(() => {
    if (friendlyAddress) return friendlyAddress;
    if (rawAddress) {
      try {
        const { Address } = require('@ton/core');
        return Address.parseRaw(rawAddress).toString({ bounceable: false });
      } catch (e) {
        return rawAddress;
      }
    }
    return '';
  }, [friendlyAddress, rawAddress]);

  const [activeTab, setActiveTab] = useState<'home' | 'referral' | 'leaderboard' | 'chat'>('home');
  const [activeGame, setActiveGame] = useState<'crash' | 'slots'>('crash');
  const [tonConnectUI] = useTonConnectUI();
  const [txModal, setTxModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [wageringRequirement, setWageringRequirement] = useState<number>(0);
  const [wageringTotal, setWageringTotal] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bigWin, setBigWin] = useState<{ multiplier: number, amount: number } | null>(null);
  // VIP State
  const [vipData, setVipData] = useState<{
    level: number;
    levelName: string;
    currentPoints: number;
    nextLevelPoints: number | null;
    perks: string[];
    pendingCashback: number;
    cashbackRate: number;
    netLoss: number;
    calculation?: {
      totalBets: number;
      totalWins: number;
      formula: string;
      cashbackFormula: string;
      minimumQualifier: string;
    };
  }>({
    level: 1,
    levelName: 'Bronze',
    currentPoints: 0,
    nextLevelPoints: 10000,
    perks: ['5% Weekly Cashback', 'Priority Support', 'Faster Withdrawals'],
    pendingCashback: 0,
    cashbackRate: 5,
    netLoss: 0,
  });

  useEffect(() => {
    // Check for demo or guest mode in URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('demo') === 'true' || searchParams.get('guest') === 'true') {
      setIsDemoMode(true);
    }
  }, []);

  const address = rawAddress || (isDemoMode || FEATURE_FLAGS.GUEST_MODE ? "guest_test_wallet" : null);

  useEffect(() => {
    const fetchBalance = async (userAddress: string) => {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id;
      const startParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
      const tgUsername = tgUser?.username
        ? `@${tgUser.username}`
        : (tgUser?.first_name || null);

      const { data, error } = await supabase
        .from('users')
        .select('id, balance, bonus_balance, wagering_requirement, wagering_total, username, referrer_id, referral_code')
        .eq('wallet_address', userAddress)
        .single();

      if (data) {
        setUserId(data.id);
        setReferralCode(data.referral_code);
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

        // Link referrer if missing and startParam exists
        if (!data.referrer_id && startParam) {
          await supabase.rpc('link_referrer', {
            p_user_id: data.id,
            p_ref_code: startParam
          });
        }

        setBalance(Number(data.balance));
        setBonusBalance(Number(data.bonus_balance || 0));
        setWageringRequirement(Number(data.wagering_requirement || 0));
        setWageringTotal(Number(data.wagering_total || 0));
        if (data.username || tgUsername) setUsername(data.username || tgUsername);

        // Fetch VIP data and pending cashback
        fetchVipData(userAddress);
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
        const initialBonus = (isDemoMode || FEATURE_FLAGS.GUEST_MODE) ? 0 : FEATURE_FLAGS.WELCOME_BONUS;
        const initialBalance = (isDemoMode || FEATURE_FLAGS.GUEST_MODE) ? 10.0 : 0;
        const initialWager = initialBonus * 35; // Aviator style x35 vager

        const { data: newData } = await supabase
          .from('users')
          .insert({
            wallet_address: userAddress,
            balance: initialBalance,
            bonus_balance: initialBonus,
            wagering_requirement: initialWager,
            wagering_total: initialWager,
            telegram_id: telegramId,
            username: tgUsername
          })
          .select()
          .single();

        if (newData) {
          setUserId(newData.id);
          setReferralCode(newData.referral_code);
          if (startParam) {
            await supabase.rpc('link_referrer', {
              p_user_id: newData.id,
              p_ref_code: startParam
            });
          }
        }

        setBalance(initialBalance);
        setBonusBalance(initialBonus);
        setWageringRequirement(initialWager);
        setWageringTotal(initialWager);
        if (tgUsername) setUsername(tgUsername);
        if (initialBonus > 0 || initialBalance > 0) {
          setShowWelcomeBonus(true);
        }
      }
    };

    // Fetch VIP data and pending cashback
    const fetchVipData = async (userAddress: string) => {
      try {
        const response = await supabase.functions.invoke('get-pending-cashback', {
          body: { wallet_address: userAddress }
        });

        if (response.data && !response.error) {
          setVipData({
            level: response.data.level || 1,
            levelName: response.data.levelName || 'Bronze',
            currentPoints: response.data.currentPoints || 0,
            nextLevelPoints: response.data.nextLevelPoints || null,
            perks: response.data.perks || ['5% Weekly Cashback', 'Priority Support', 'Faster Withdrawals'],
            pendingCashback: response.data.pendingCashback || 0,
            cashbackRate: response.data.cashbackRate || 5,
            netLoss: response.data.netLoss || 0,
            calculation: response.data.calculation,
          });
        }
      } catch (err) {
        console.error('Failed to fetch VIP data:', err);
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
          if (payload.new) {
            if (typeof payload.new.balance !== 'undefined') setBalance(Number(payload.new.balance));
            if (typeof payload.new.bonus_balance !== 'undefined') setBonusBalance(Number(payload.new.bonus_balance));
            if (typeof payload.new.wagering_requirement !== 'undefined') setWageringRequirement(Number(payload.new.wagering_requirement));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setBalance(0);
      setBonusBalance(0);
      setWageringRequirement(0);
      setWageringTotal(0);
    }
  }, [address]);

  const handleWageringUpdate = useCallback(async (amount: number) => {
    if (!address) return;
    const newRequirement = Math.max(0, wageringRequirement - amount);
    setWageringRequirement(newRequirement);

    // Call DB update (non-blocking)
    const { data: userData } = await supabase.from('users').select('bonus_balance, balance').eq('wallet_address', address).single();

    if (newRequirement <= 0 && userData && Number(userData.bonus_balance) > 0) {
      // Unlock bonus: Move bonus to real balance
      const totalBalance = Number(userData.balance) + Number(userData.bonus_balance);
      await supabase.from('users').update({
        balance: totalBalance,
        bonus_balance: 0,
        wagering_requirement: 0
      }).eq('wallet_address', address);
      alert(t('bonus_unlocked'));
    } else {
      await supabase.from('users').update({
        wagering_requirement: newRequirement
      }).eq('wallet_address', address);
    }
  }, [address, wageringRequirement]);

  const handleBalanceUpdate = useCallback((type: 'balance' | 'bonus', updater: (prev: number) => number) => {
    if (type === 'balance') setBalance(updater);
    else setBonusBalance(updater);

    // DB update will be triggered by the postgres_changes subscription or handled manually if needed
    // For bets, we usually handle it inside the components via Edge Functions (CrashGame does)
  }, []);

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
              alert(`${t('confirm_deposit')} +${amount} TON added to your balance.`);
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

  const handleWithdraw = useCallback(async (amount: number) => {
    if (!wallet) throw new Error("Please connect your wallet first");
    if (amount > balance) throw new Error("Insufficient balance");

    if (!address) throw new Error("Recipient address is required");

    // Optimistically update the UI to feel instant
    setBalance(prev => prev - amount);

    console.log("Withdrawal Payload being sent:", { amount, wallet_address: address, recipient_address: address });

    try {
      const response = await supabase.functions.invoke('process-withdrawal', {
        body: { amount, wallet_address: address, recipient_address: address }
      });

      if (!response.data?.success) {
        throw new Error(response.error?.message || response.data?.error || "Withdrawal failed");
      }

      alert(`${t('withdraw_success')} ${amount} TON`);
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
        />
      )}

      {/* Burger Menu drawer */}
      <BurgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        balance={balance}
        bonusBalance={bonusBalance}
        wageringRequirement={wageringRequirement}
        wageringTotal={wageringTotal}
        address={address}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={(enabled) => {
          setNotificationsEnabled(enabled);
          if (enabled) {
            // Request TG WebApp permission if available
            (window as any).Telegram?.WebApp?.requestWriteAccess?.();
          }
        }}
      />

      {showWelcomeBonus && (
        <WelcomeBonusModal
          amount={FEATURE_FLAGS.WELCOME_BONUS}
          onClose={() => setShowWelcomeBonus(false)}
        />
      )}

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
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em]">{t('digital_balance')}</span>
        <div className="flex items-baseline gap-2">
          <h2 className="text-5xl font-black italic gold-text tracking-tighter">
            {(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',')}
          </h2>
          <span className="text-xl font-black text-gold/40 italic">TON</span>
        </div>

        {/* Bonus Balance & Wagering Progress Inline */}
        {(bonusBalance > 0 || wageringTotal > 0) && (
          <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-[200px]">
            <div className="flex gap-2 items-center bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('bonus_balance')}:</span>
              <span className="text-sm font-black text-white">{(bonusBalance || 0).toFixed(2)} TON</span>
            </div>

            {wageringTotal > 0 && (
              <div className="w-full flex flex-col gap-1">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                  <span className="text-white/40">{t('wagering_progress')}</span>
                  <span className="gold-text">{(wageringTotal > 0 ? Math.max(0, 100 - (wageringRequirement / wageringTotal * 100)) : 0).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-dark transition-all duration-500"
                    style={{ width: `${Math.max(0, 100 - (wageringRequirement / wageringTotal * 100))}%` }}
                  />
                </div>
                <span className="text-[7px] text-white/30 text-center font-bold uppercase">
                  {(wageringRequirement || 0).toFixed(2)} TON {t('wagering_left')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Wallet Display */}
        {address ? (
          <div className="flex items-center gap-2 mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-bold text-white/60 tracking-wider">
              {(friendlyAddress || address).slice(0, 4)}...{(friendlyAddress || address).slice(-4)}
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
              <span className="text-xs font-bold uppercase">{t('deposit')}</span>
            </button>
            <button
              onClick={() => setTxModal('withdraw')}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5 active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold uppercase">{t('withdraw')}</span>
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
            <span className="text-[8px] uppercase font-black tracking-widest">{t(tab)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 pb-24">
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            {/* Game Selector hidden as requested */}

            {FEATURE_FLAGS.GUEST_MODE && !wallet && (
              <div className="w-full bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Guest Testing Mode</span>
                </div>
                <span className="text-[8px] font-bold text-white/20 uppercase">No Wallet Required</span>
              </div>
            )}

            {/* VIP Status component with cashback */}
            <div className="w-full max-w-sm mx-auto mb-6">
              <VIPStatus
                level={vipData.level}
                levelName={vipData.levelName}
                currentPoints={vipData.currentPoints}
                nextLevelPoints={vipData.nextLevelPoints || 10000}
                perks={vipData.perks}
                pendingCashback={vipData.pendingCashback}
                cashbackRate={vipData.cashbackRate}
                netLoss={vipData.netLoss}
                calculation={vipData.calculation}
              />
            </div>

            {/* Active Game Display */}
            <div className="w-full flex justify-center">
              {activeGame === 'crash' ? (
                <CrashGame
                  balance={balance}
                  bonus_balance={bonusBalance}
                  onBalanceUpdate={handleBalanceUpdate}
                  onWageringUpdate={handleWageringUpdate}
                  onBigWin={(multiplier, amount) => setBigWin({ multiplier, amount })}
                  referralCode={referralCode}
                />
              ) : (
                <SlotMachine
                  balance={balance}
                  bonus_balance={bonusBalance}
                  onBalanceUpdate={handleBalanceUpdate}
                  onWageringUpdate={handleWageringUpdate}
                  onBigWin={(multiplier, amount) => setBigWin({ multiplier, amount })}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'referral' && <ReferralSystem referralCode={referralCode} userId={userId} />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'chat' && <LiveChat currentUsername={username} />}
      </div>

      <AnimatePresence>
        {bigWin && (
          <BigWinCard
            multiplier={bigWin.multiplier}
            amount={bigWin.amount}
            onClose={() => setBigWin(null)}
            onShare={() => {
              const text = `🚀 I JUST WON ${bigWin.amount.toFixed(2)} TON (${bigWin.multiplier.toFixed(2)}x) on @AstroCrashRobot_bot! 💎\n\nJoin me and win big!`;
              const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/AstroCrashRobot_bot/play' + (referralCode ? '?startapp=' + referralCode : ''))}&text=${encodeURIComponent(text)}`;
              (window as any).Telegram?.WebApp?.openTelegramLink(url);
              setBigWin(null);
            }}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
