'use client';

import { useTheme } from '@/hooks/useTheme';
import { X, Check, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
    const { theme, setTheme, themes } = useTheme();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-[var(--custom-gold,#d4af37)] to-[var(--custom-gold-dark,#b8860b)] rounded-xl flex items-center justify-center">
                                    <Palette className="w-5 h-5 text-black" />
                                </div>
                                <h3 className="text-xl font-black text-white">Theme</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`relative p-4 rounded-2xl border transition-all ${theme === t.id
                                            ? 'border-[var(--custom-gold,#d4af37)] bg-[var(--custom-card,rgba(255,255,255,0.05)]'
                                            : 'border-white/10 hover:border-white/20 bg-white/5'
                                        }`}
                                >
                                    <div
                                        className="w-full h-12 rounded-lg mb-2"
                                        style={{
                                            background: t.colors.background,
                                            border: `1px solid ${t.colors.gold}33`,
                                        }}
                                    >
                                        <div className="flex h-full items-center justify-center gap-1">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: t.colors.gold }}
                                            />
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: t.colors.accent }}
                                            />
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: t.colors.foreground }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-white/80 block text-center">
                                        {t.name}
                                    </span>
                                    {theme === t.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--custom-gold,#d4af37)] rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-black" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-xs text-white/40 text-center">
                                Choose your preferred color scheme
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
