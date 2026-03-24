"use client";

import React, { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Loader2, Ban, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function AdminDashboard() {
  const address = useTonAddress();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_users: 0, total_bets: 0, total_profit: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [jackpot, setJackpot] = useState<{ id: string, amount: string } | null>(null);
  const [isSavingJackpot, setIsSavingJackpot] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    async function checkAdminStatus() {
      if (!address) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_admin, is_blocked')
          .eq('wallet_address', address)
          .single();

        if (error || !data || !data.is_admin || data.is_blocked) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Fetch stats if admin
        const { data: statsData } = await supabase.rpc('get_admin_stats');
        if (statsData) {
          setStats(statsData);
        }

        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, wallet_address, balance, created_at, is_blocked')
          .order('created_at', { ascending: false })
          .limit(50);

        if (usersData) {
          setUsers(usersData);
        }

        // Fetch current jackpot
        const { data: jackpotData } = await supabase
          .from('slot_jackpots')
          .select('id, current_amount')
          .single();

        if (jackpotData) {
          setJackpot({ id: jackpotData.id, amount: jackpotData.current_amount.toString() });
        }

      } catch (err) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [address]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: !currentStatus })
        .eq('id', userId);

      if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: !currentStatus } : u));
      }
    } catch (e) {
      console.error('Error toggling user status:', e);
    }
  };

  const updateUserBalance = async (userId: string, newBalance: string) => {
    try {
      const parsedBalance = parseFloat(newBalance);
      if (isNaN(parsedBalance)) return;
      
      const { error } = await supabase
        .from('users')
        .update({ balance: parsedBalance })
        .eq('id', userId);

      if (!error) {
        setUsers(users.map(u => u.id === userId ? { ...u, balance: parsedBalance } : u));
        alert('Balance updated successfully!');
      } else {
        alert('Error updating balance: ' + error.message);
      }
    } catch (e) {
      console.error('Error updating user balance:', e);
    }
  };

  const saveJackpot = async () => {
    if (!jackpot) return;
    setIsSavingJackpot(true);
    try {
      await supabase
        .from('slot_jackpots')
        .update({ current_amount: parseFloat(jackpot.amount) })
        .eq('id', jackpot.id);
    } catch (e) {
      console.error('Error saving jackpot:', e);
    } finally {
      setIsSavingJackpot(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black italic uppercase text-red-500 mb-4">Access Denied</h1>
        <p className="text-white/60 mb-8 max-w-sm">
          You don't have permission to access the admin dashboard.
        </p>
        <Link
          href="/"
          className="gold-button px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <h1 className="text-4xl font-black uppercase text-white tracking-tight flex items-center gap-4">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-white/10 flex flex-col gap-2">
          <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Total Users</span>
          <span className="text-4xl font-black text-white">{stats.total_users.toLocaleString()}</span>
        </div>
        <div className="glass-card p-6 border-white/10 flex flex-col gap-2">
          <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Total Bets</span>
          <span className="text-4xl font-black text-white">{stats.total_bets.toLocaleString()}</span>
        </div>
        <div className="glass-card p-6 border-gold/30 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gold/10 blur-xl" />
          <span className="text-sm font-bold text-gold/70 uppercase tracking-widest relative z-10">Total Profit</span>
          <span className="text-4xl font-black gold-text relative z-10">{stats.total_profit.toLocaleString()} TON</span>
        </div>
      </div>

      {/* Jackpot Management */}
      {jackpot && (
        <div className="glass-card border-gold/30 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gold uppercase tracking-wider">Jackpot Management</h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-bold text-white/50 uppercase tracking-widest">
                Current Amount (TON)
              </label>
              <input
                type="number"
                step="0.01"
                value={jackpot.amount}
                onChange={(e) => setJackpot({ ...jackpot, amount: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <button
              onClick={saveJackpot}
              disabled={isSavingJackpot}
              className="gold-button px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap disabled:opacity-50"
            >
              {isSavingJackpot ? 'Saving...' : 'Save Jackpot'}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Wallet</th>
                <th className="p-4 font-medium">Balance</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-white/90 text-sm">
                    {u.wallet_address.slice(0, 4)}...{u.wallet_address.slice(-4)}
                    <span className="hidden opacity-0">{u.wallet_address}</span> {/* Для тестов */}
                  </td>
                  <td className="p-4 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={u.balance}
                        onBlur={(e) => {
                          if (parseFloat(e.target.value) !== u.balance) {
                            updateUserBalance(u.id, e.target.value);
                          }
                        }}
                        className="w-24 bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-gold/50 transition-colors"
                      />
                      <span className="text-white/50 text-xs">TON</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.is_blocked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider">
                        <Ban className="w-3.5 h-3.5" /> Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(u.id, u.is_blocked)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 uppercase tracking-wider font-bold transition-colors"
                    >
                      {u.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/50">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
