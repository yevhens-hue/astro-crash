"use client";

import { useState, useRef, useEffect } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { Send, MessageSquare, Smile, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useTelegram } from '@/hooks/useTelegram';

interface Message {
    id: string;
    username: string;
    text: string;
    time: string;
    isSystem?: boolean;
    isHype?: boolean;
}

interface FlyingEmoji {
    id: number;
    emoji: string;
    x: number;
}

interface RainReward {
    id: string;
    amount: number;
    claimed: boolean;
}

export default function LiveChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
    const [activeRain, setActiveRain] = useState<RainReward | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { user } = useTelegram();
    const wallet = useTonWallet();

    const hypeEmojis = ['🚀', '💎', '🔥', '🙌', '🤑'];

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setMessages(prev => [...prev.slice(-49), payload.new as Message]);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rewards' }, (payload) => {
                const reward = payload.new;
                if (reward.type === 'rain') {
                    setActiveRain({
                        id: reward.id,
                        amount: reward.amount,
                        claimed: false
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setMessages(data.reverse());
    };

    const handleSendMessage = async (text: string = inputText, isHype: boolean = false) => {
        const msgText = text.trim();
        if (!msgText) return;

        let userName = '@Guest';
        if (user?.username) {
            userName = `@${user.username}`;
        } else if (user?.first_name) {
            userName = user.first_name;
        } else if (wallet?.account.address) {
            userName = `@${wallet.account.address.slice(0, 4)}...`;
        }

        await supabase.from('messages').insert({
            username: userName,
            text: msgText,
            is_hype: isHype
        });

        if (!isHype) setInputText('');
    };

    const triggerHype = (emoji: string) => {
        const id = Date.now();
        const x = Math.random() * 200 - 100;
        setFlyingEmojis(prev => [...prev, { id, emoji, x }]);
        handleSendMessage(emoji, true);

        // Randomly trigger Rain for demo (1 in 5 hype messages)
        if (Math.random() > 0.8 && !activeRain) {
            triggerRain();
        }

        // Cleanup flying emoji
        setTimeout(() => {
            setFlyingEmojis(prev => prev.filter(e => e.id !== id));
        }, 2000);
    };

    const triggerRain = () => {
        const rain = {
            id: Date.now().toString(),
            amount: 0.1,
            claimed: false
        };
        setActiveRain(rain);

        const newMessage: Message = {
            id: 'rain-' + rain.id,
            username: 'System',
            text: '🎁 FREE BET RAIN! Click to claim 0.1 TON!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleClaimRain = () => {
        if (!activeRain) return;
        setActiveRain(null);
        alert("🎉 Claimed 0.1 TON Free Bet! (Simulated)");

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            username: 'System',
            text: '🎊 @Bhavish_R claimed the Free Bet!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true
        }]);
    };

    return (
        <div className="flex flex-col h-full w-full max-w-sm glass-card border-none overflow-hidden relative">
            {/* Flying Emojis Layer */}
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                <AnimatePresence>
                    {flyingEmojis.map((e) => (
                        <motion.div
                            key={e.id}
                            initial={{ y: 400, x: e.x, opacity: 1, scale: 0.5 }}
                            animate={{ y: -100, x: e.x + (Math.random() * 40 - 20), opacity: 0, scale: 2 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute bottom-20 left-1/2 text-3xl"
                        >
                            {e.emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-gold" /> Live Chat
                </h3>
                <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">428 online</span>
            </div>

            {/* Messages List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide min-h-[300px]"
            >
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : ''}`}>
                        {msg.isSystem ? (
                            <div className="flex flex-col items-center gap-2">
                                <span className={`text-[10px] font-medium px-3 py-1 rounded-full border ${msg.id.startsWith('rain') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : 'bg-gold/5 text-gold/60 border-gold/10'}`}>
                                    {msg.text}
                                </span>
                                {msg.id.startsWith('rain') && activeRain && (
                                    <button
                                        onClick={handleClaimRain}
                                        className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] active:scale-95 transition-all"
                                    >
                                        CLAIM NOW
                                    </button>
                                )}
                            </div>
                        ) : msg.isHype ? (
                            <div className="flex items-center gap-2 bg-gold/5 self-start px-2 py-1 rounded-lg border border-gold/10">
                                <span className="text-[10px] font-bold text-gold/60">{msg.username}:</span>
                                <span className="text-sm">{msg.text}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-0.5 max-w-[85%]">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold ${msg.username === '@Bhavish_R' ? 'text-gold' : 'text-white/40'}`}>
                                        {msg.username}
                                    </span>
                                    <span className="text-[8px] text-white/20">{msg.time}</span>
                                </div>
                                <div className={`p-2 rounded-xl text-xs ${msg.username === '@Bhavish_R' ? 'bg-gold/10 border border-gold/10 text-gold-light' : 'bg-white/5 border border-white/5 text-white/80'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Hype Bar */}
            <div className="px-4 py-2 bg-white/5 border-t border-white/5 flex justify-between items-center gap-2">
                <div className="flex gap-2">
                    {hypeEmojis.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => triggerHype(emoji)}
                            className="text-lg hover:scale-125 transition-transform active:scale-95"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-gold uppercase animate-pulse">
                    <Zap className="w-2 h-2 fill-gold" /> Hype Mode
                </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white/5 border-t border-white/5">
                <div className="flex items-center gap-2 bg-black/40 rounded-xl p-2 border border-white/5">
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-white/40">
                        <Smile className="w-4 h-4" />
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20"
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        className="p-1.5 bg-gold rounded-lg shadow-gold active:scale-95 transition-transform"
                    >
                        <Send className="w-4 h-4 text-black" />
                    </button>
                </div>
            </div>
        </div>
    );
}
