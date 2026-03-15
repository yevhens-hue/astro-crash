'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Trophy, Sparkles } from 'lucide-react';

interface BigWinCardProps {
    multiplier: number;
    amount: number;
    onClose: () => void;
    onShare: () => void;
}

export default function BigWinCard({ multiplier, amount, onClose, onShare }: BigWinCardProps) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
            {/* Animated background glow */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute w-[300px] h-[300px] bg-purple-600 rounded-full blur-[100px]"
            />

            <motion.div 
                initial={{ scale: 0.5, rotate: -5, y: 50 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                className="relative w-full max-w-sm glass-card overflow-hidden border-2 border-gold/30 p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(255,215,0,0.2)]"
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    aria-label="close"
                    className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Trophy & Stars */}
                <div className="relative">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="p-5 bg-gradient-to-b from-gold to-yellow-600 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.5)]"
                    >
                        <Trophy className="w-12 h-12 text-black" />
                    </motion.div>
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-4 border border-dashed border-gold/40 rounded-full"
                    />
                    <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-gold animate-pulse" />
                </div>

                {/* Text Content */}
                <div className="text-center">
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl font-black text-white italic tracking-tighter"
                    >
                        BIG WIN!
                    </motion.h2>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-gold font-bold text-xl mt-1"
                    >
                        x{multiplier.toFixed(2)}
                    </motion.div>
                </div>

                {/* Win Amount */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full flex flex-col items-center gap-1 shadow-inner"
                >
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Total Payout</span>
                    <span className="text-3xl font-black text-white">{amount.toFixed(2)} TON</span>
                </motion.div>

                {/* Action Button */}
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onShare}
                    className="gold-button w-full h-14 flex items-center justify-center gap-3 text-lg font-bold group"
                >
                    <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    SHARE WIN
                </motion.button>

                <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                    Play and win at @AstroCrashRobot_bot
                </p>
            </motion.div>
        </motion.div>
    );
}
