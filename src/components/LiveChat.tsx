'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, UserCircle, Bot } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/flags';
import { useTonWallet } from '@tonconnect/ui-react';

interface ChatMessage {
    id: string;
    wallet_address: string;
    username: string | null;
    content: string;
    is_system: boolean;
    created_at: string;
}

export default function LiveChat({ currentUsername }: { currentUsername?: string | null }) {
    const wallet = useTonWallet();
    const currentWallet = wallet?.account.address || null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                setMessages(prev => {
                    // Check if message already exists (optimistic UI)
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as ChatMessage];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (data && !error) {
            setMessages(data.reverse());
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        const address = currentWallet || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);

        if (!address) {
            alert('Please connect your wallet to chat!');
            return;
        }

        setIsSending(true);
        const tempId = `temp-${Date.now()}`;

        // Optimistic UI
        const tempMsg: ChatMessage = {
            id: tempId,
            wallet_address: address,
            username: currentUsername || null,
            content: trimmed,
            is_system: false,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setInput('');

        try {
            const { error } = await supabase.from('chat_messages').insert([{
                wallet_address: address,
                username: currentUsername || null,
                content: trimmed,
                is_system: false
            }]);

            if (error) {
                console.error("Chat Error:", error);
                setMessages(prev => prev.filter(m => m.id !== tempId)); // revert
                alert("Failed to send message.");
            }
        } finally {
            setIsSending(false);
        }
    };

    const formatName = (msg: ChatMessage) => {
        if (msg.is_system) return 'SYSTEM';
        if (msg.username) return msg.username;
        if (msg.wallet_address === 'guest_test_wallet') return 'Guest Player';
        return `${msg.wallet_address.slice(0, 4)}...${msg.wallet_address.slice(-4)}`;
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-black italic gold-text uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Global Chat
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar min-h-[400px]">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs italic">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        No messages yet. Be the first!
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 text-sm ${msg.is_system ? 'bg-gold/10 p-3 rounded-2xl border border-gold/20' : ''}`}>
                        <div className="shrink-0 mt-1">
                            {msg.is_system ?
                                <Bot className="w-5 h-5 text-gold" /> :
                                <UserCircle className={`w-5 h-5 ${msg.wallet_address === currentWallet ? 'text-blue-400' : 'text-white/40'}`} />
                            }
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.is_system ? 'text-gold' : msg.wallet_address === currentWallet ? 'text-blue-400' : 'text-white/40'}`}>
                                {formatName(msg)}
                            </span>
                            <p className={`mt-0.5 leading-snug ${msg.is_system ? 'text-white font-bold' : 'text-white/80'} break-words break-all`}>
                                {msg.content}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-white/[0.02] border-t border-white/5 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentWallet || FEATURE_FLAGS.GUEST_MODE ? "Say anything..." : "Connect wallet to chat"}
                    disabled={!currentWallet && !FEATURE_FLAGS.GUEST_MODE}
                    className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                    maxLength={150}
                />
                <button
                    type="submit"
                    disabled={isSending || (!currentWallet && !FEATURE_FLAGS.GUEST_MODE) || !input.trim()}
                    className="p-3 bg-gold/20 hover:bg-gold/30 text-gold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gold/30 shrink-0"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
