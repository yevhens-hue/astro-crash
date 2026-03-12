import { Shield, X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ProvablyFairModalProps {
    isOpen: boolean;
    onClose: () => void;
    roundData: {
        id: string;
        crashPoint: string;
        serverSeed: string;
        clientSeed: string;
        hash: string;
    } | null;
}

export default function ProvablyFairModal({ isOpen, onClose, roundData }: ProvablyFairModalProps) {
    const [copiedContent, setCopiedContent] = useState<string | null>(null);

    if (!isOpen || !roundData) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedContent(label);
        setTimeout(() => setCopiedContent(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <h3 className="font-black italic uppercase tracking-tight">Provably Fair</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-5">
                    <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Round ID</span>
                            <span className="text-sm font-mono text-white/80">{roundData.id.split('-')[0]}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Result</span>
                            <span className="text-xl font-black text-gold">{roundData.crashPoint}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <FieldRow
                            label="Server Seed (UnHashed)"
                            value={roundData.serverSeed || 'Hidden until round completes'}
                            copied={copiedContent === 'server'}
                            onCopy={() => handleCopy(roundData.serverSeed, 'server')}
                        />
                        <FieldRow
                            label="Client Seed"
                            value={roundData.clientSeed || '00000000000000000...'}
                            copied={copiedContent === 'client'}
                            onCopy={() => handleCopy(roundData.clientSeed, 'client')}
                        />
                        <FieldRow
                            label="Final Hash (HMAC SHA-256)"
                            value={roundData.hash}
                            copied={copiedContent === 'hash'}
                            onCopy={() => handleCopy(roundData.hash, 'hash')}
                        />
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-200/70 leading-relaxed">
                        The <strong>Crash Point</strong> is exactly calculated by combining the secret Server Seed and public Client Seed using standard HMAC SHA-256. This cryptographically proves the game result was generated fairly and not manipulated after bets were placed. <br /><br />
                        Result = <code>HMAC_SHA256(ServerSeed, ClientSeed)</code>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FieldRow({ label, value, copied, onCopy }: { label: string, value: string, copied: boolean, onCopy: () => void }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
                <button onClick={onCopy} disabled={value.includes('Hidden')} className={`text-white/40 hover:text-white transition-colors flex items-center gap-1 ${value.includes('Hidden') ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span className="text-[9px] uppercase font-bold">{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
            <div className="bg-black/50 p-3 flex rounded-xl border border-white/5 break-all font-mono text-[10px] text-white/70 shadow-inner overflow-hidden min-h-[40px] items-center">
                {value}
            </div>
        </div>
    );
}
