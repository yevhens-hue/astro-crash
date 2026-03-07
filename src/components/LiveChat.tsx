"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Smile, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    user: string;
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

export default function LiveChat() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', user: 'System', text: 'Welcome to Astro Crash! 🚀', time: '12:00', isSystem: true },
        { id: '2', user: '@raj_crypto', text: 'Just won 5x! 💎', time: '12:01' },
        { id: '3', user: '@amit_100', text: 'Wait for 10x guys', time: '12:02' },
    ]);
    const [inputText, setInputText] = useState('');
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const hypeEmojis = ['🚀', '💎', '🔥', '🙌', '🤑'];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (text: string = inputText, isHype: boolean = false) => {
        const msgText = text.trim();
        if (!msgText) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            user: '@Bhavish_R',
            text: msgText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isHype
        };
        setMessages(prev => [...prev, newMessage]);
        if (!isHype) setInputText('');
    };

    const triggerHype = (emoji: string) => {
        const id = Date.now();
        const x = Math.random() * 200 - 100;
        setFlyingEmojis(prev => [...prev, { id, emoji, x }]);
        handleSendMessage(emoji, true);

        // Cleanup flying emoji
        setTimeout(() => {
            setFlyingEmojis(prev => prev.filter(e => e.id !== id));
        }, 2000);
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
                            <span className="text-[10px] text-gold/60 font-medium bg-gold/5 px-3 py-1 rounded-full border border-gold/10">
                                {msg.text}
                            </span>
                        ) : msg.isHype ? (
                            <div className="flex items-center gap-2 bg-gold/5 self-start px-2 py-1 rounded-lg border border-gold/10">
                                <span className="text-[10px] font-bold text-gold/60">{msg.user}:</span>
                                <span className="text-sm">{msg.text}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-0.5 max-w-[85%]">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold ${msg.user === '@Bhavish_R' ? 'text-gold' : 'text-white/40'}`}>
                                        {msg.user}
                                    </span>
                                    <span className="text-[8px] text-white/20">{msg.time}</span>
                                </div>
                                <div className={`p-2 rounded-xl text-xs ${msg.user === '@Bhavish_R' ? 'bg-gold/10 border border-gold/10 text-gold-light' : 'bg-white/5 border border-white/5 text-white/80'}`}>
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
