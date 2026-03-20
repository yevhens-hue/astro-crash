'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FEATURE_FLAGS } from '@/lib/flags';
import { useTonWallet } from '@tonconnect/ui-react';
import { CloudRain, Gift, Send, UserCircle, Bot, MessageSquare, Heart, ThumbsUp, ThumbsDown, Flame, Moon, PartyPopper, MousePointerClick } from 'lucide-react';

// Available reactions
const REACTIONS = ['👍', '👎', '❤️', '🔥', '🎉', '🌙', '🐭'];

interface ChatReaction {
    id: string;
    message_id: string;
    wallet_address: string;
    emoji: string;
    created_at: string;
}

interface ChatMessage {
    id: string;
    wallet_address: string;
    username: string | null;
    content: string;
    is_system: boolean;
    metadata?: any;
    created_at: string;
    reactions?: ChatReaction[];
}

export default function LiveChat({ currentUsername }: { currentUsername?: string | null }) {
    const wallet = useTonWallet();
    const currentWallet = wallet?.account.address || null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [reactions, setReactions] = useState<Map<string, ChatReaction[]>>(new Map());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch reactions for messages
    const fetchReactions = async (messageIds: string[]) => {
        if (messageIds.length === 0) return;

        const { data } = await supabase
            .from('chat_reactions')
            .select('*')
            .in('message_id', messageIds);

        if (data) {
            const reactionMap = new Map<string, ChatReaction[]>();
            data.forEach((r: ChatReaction) => {
                const existing = reactionMap.get(r.message_id) || [];
                reactionMap.set(r.message_id, [...existing, r]);
            });
            setReactions(reactionMap);
        }
    };

    // Toggle reaction on a message
    const toggleReaction = async (messageId: string, emoji: string) => {
        const address = currentWallet || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) return;

        const messageReactions = reactions.get(messageId) || [];
        const existingReaction = messageReactions.find(
            r => r.wallet_address === address && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove reaction
            await supabase.from('chat_reactions').delete().eq('id', existingReaction.id);
            setReactions(prev => {
                const updated = new Map(prev);
                const msgReactions = (updated.get(messageId) || []).filter(r => r.id !== existingReaction.id);
                updated.set(messageId, msgReactions);
                return updated;
            });
        } else {
            // Add reaction
            const { data } = await supabase.from('chat_reactions').insert([{
                message_id: messageId,
                wallet_address: address,
                emoji: emoji
            }]).select().single();

            if (data) {
                setReactions(prev => {
                    const updated = new Map(prev);
                    const msgReactions = [...(updated.get(messageId) || []), data as ChatReaction];
                    updated.set(messageId, msgReactions);
                    return updated;
                });
            }
        }
        setShowEmojiPicker(null);
    };

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                setMessages(prev => {
                    // Check if message already exists (optimistic UI)
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    const newMsg = payload.new as ChatMessage;
                    // Fetch reactions for new message
                    fetchReactions([newMsg.id]);
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        // Subscribe to reactions
        const reactionsChannel = supabase
            .channel('public:chat_reactions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, () => {
                // Refresh all reactions when something changes
                const msgIds = messages.map(m => m.id);
                if (msgIds.length > 0) fetchReactions(msgIds);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(reactionsChannel);
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
            // Fetch reactions for all messages
            const msgIds = data.map(m => m.id);
            if (msgIds.length > 0) fetchReactions(msgIds);
        }
    };

    const handleRain = async () => {
        const address = currentWallet || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) return;

        try {
            await supabase.from('chat_messages').insert([{
                wallet_address: address,
                username: 'Astro Rain',
                content: 'Incoming Astro Rain! 🌧️💸 Be first to claim 0.5 TON Bonus!',
                is_system: true,
                metadata: { type: 'rain', amount: 0.5, claimed_by: null }
            }]);
        } catch (e) {
            console.error("Rain failed:", e);
        }
    };

    const handleClaim = async (msgId: string, amount: number) => {
        const address = currentWallet || (FEATURE_FLAGS.GUEST_MODE ? 'guest_test_wallet' : null);
        if (!address) {
            alert('Connect wallet to claim!');
            return;
        }

        try {
            // Atomic check and claim
            const { data: updated, error } = await supabase.rpc('claim_rain', {
                p_message_id: msgId,
                p_claimer_address: address,
                p_amount: amount
            });

            if (error) throw error;
            if (updated) {
                alert(`🎊 Claimed! ${amount} TON Bonus added!`);
            } else {
                alert("Too late! Already claimed. 😢");
            }
        } catch (e: any) {
            alert(`Claim failed: ${e.message}`);
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
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
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
                            {msg.metadata?.type === 'rain' && !msg.metadata?.claimed_by && (
                                <button
                                    onClick={() => handleClaim(msg.id, msg.metadata.amount)}
                                    className="mt-2 gold-button py-2 px-6 flex items-center gap-2 text-[10px]"
                                >
                                    <Gift className="w-3 h-3" />
                                    CLAIM FREE BET
                                </button>
                            )}
                            {msg.metadata?.claimed_by && (
                                <div className="mt-2 text-[8px] uppercase font-bold text-white/20 italic">
                                    Claimed by {msg.metadata.claimed_by.slice(0, 4)}...
                                </div>
                            )}
                            {/* Reactions UI */}
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                                {/* Display existing reactions */}
                                {(reactions.get(msg.id) || []).map((reaction) => (
                                    <button
                                        key={reaction.id}
                                        onClick={() => toggleReaction(msg.id, reaction.emoji)}
                                        className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${reaction.wallet_address === currentWallet || reaction.wallet_address === 'guest_test_wallet'
                                            ? 'bg-gold/30 border border-gold/50'
                                            : 'bg-white/10 border border-white/20'
                                            }`}
                                    >
                                        {reaction.emoji}
                                    </button>
                                ))}
                                {/* Add reaction button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                        className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/50"
                                    >
                                        +
                                    </button>
                                    {/* Emoji picker dropdown */}
                                    {showEmojiPicker === msg.id && (
                                        <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-lg z-10">
                                            {REACTIONS.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => toggleReaction(msg.id, emoji)}
                                                    className="w-7 h-7 flex items-center justify-center text-lg hover:bg-white/10 rounded transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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
                {currentWallet && (
                    <button
                        type="button"
                        onClick={handleRain}
                        className="p-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-2xl transition-colors border border-blue-500/30 shrink-0"
                        title="Send Rain (Owner only)"
                    >
                        <CloudRain className="w-5 h-5" />
                    </button>
                )}
            </form>
        </div>
    );
}
