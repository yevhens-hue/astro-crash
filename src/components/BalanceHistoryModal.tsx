import { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BalanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

export default function BalanceHistoryModal({ isOpen, onClose, walletAddress }: BalanceHistoryModalProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !walletAddress) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // First get user
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress)
                    .single();

                if (user) {
                    const { data } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (data) setTransactions(data);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, walletAddress]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-black italic uppercase tracking-tight text-white/90">Balance History</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {loading ? (
                        <div className="flex justify-center items-center py-10 opacity-50">
                            <Clock className="w-6 h-6 animate-spin text-white" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-white/30 text-sm font-medium">
                            No recent transactions
                        </div>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="bg-white/5 border border-white/5 flex items-center justify-between p-4 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white/90 capitalize">{tx.type}</span>
                                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-base font-black ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'}{Number(tx.amount).toFixed(2)} TON
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold tracking-widest ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
