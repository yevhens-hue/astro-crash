import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ArrowDownLeft, ArrowUpRight, X, Loader2 } from 'lucide-react';

export default function TxModal({
  type,
  balance,
  onClose,
  onConfirm,
}: {
  type: 'deposit' | 'withdraw';
  balance: number;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { t } = useI18n();
  const isDeposit = type === 'deposit';
  const presets = [0.5, 1, 2, 5];

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError(t('enter_amount')); return; }
    if (!isDeposit && val > balance) { setError(t('insufficient_balance')); return; }
    const minAmount = isDeposit ? 0.1 : 0.5;
    if (val < minAmount) { setError(isDeposit ? t('min_deposit') : t('min_withdraw')); return; }
    
    setError('');
    setLoading(true);
    try {
      await onConfirm(val);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      if (document.body) {
        setLoading(false);
      }
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
                {isDeposit ? t('deposit_ton') : t('withdraw_ton')}
              </h3>
              {!isDeposit && (
                <p className="text-[10px] text-white/40 font-bold">
                  {t('available')}: {balance.toFixed(2)} TON
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
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{t('amount_ton')}</span>
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
          {loading ? t('processing') : isDeposit ? t('deposit') : t('withdraw')}
        </button>

        {isDeposit && (
          <p className="text-[9px] text-white/20 text-center font-bold uppercase tracking-widest">
            {t('ton_credited_desc')}
          </p>
        )}
      </div>
    </div>
  );
}
