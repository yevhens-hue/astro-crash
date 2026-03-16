"use client";

import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Bell, BellOff, Trophy, Timer, Star, Radio } from 'lucide-react';
import { SoundManager, SoundSettings, loadSoundSettings, saveSoundSettings } from '@/lib/sounds';

interface SoundSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SoundSettingsModal({ isOpen, onClose }: SoundSettingsModalProps) {
    const [settings, setSettings] = useState<SoundSettings>(loadSoundSettings());

    useEffect(() => {
        setSettings(SoundManager.getSettings());
    }, [isOpen]);

    const handleVolumeChange = (volume: number) => {
        const newSettings = { ...settings, volume };
        setSettings(newSettings);
        SoundManager.updateSettings(newSettings);
    };

    const handleToggle = (key: keyof SoundSettings['sounds']) => {
        const newSettings = {
            ...settings,
            sounds: { ...settings.sounds, [key]: !settings.sounds[key] }
        };
        setSettings(newSettings);
        SoundManager.updateSettings(newSettings);
    };

    const handleMasterToggle = () => {
        const newSettings = { ...settings, enabled: !settings.enabled };
        setSettings(newSettings);
        SoundManager.updateSettings(newSettings);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <X className="w-5 h-5 text-white/60" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                        {settings.enabled ? (
                            <Volume2 className="w-6 h-6 text-purple-400" />
                        ) : (
                            <VolumeX className="w-6 h-6 text-white/40" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Sound Settings</h2>
                        <p className="text-sm text-white/50">Configure audio preferences</p>
                    </div>
                </div>

                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl mb-6">
                    <div className="flex items-center gap-3">
                        {settings.enabled ? (
                            <Volume2 className="w-5 h-5 text-green-400" />
                        ) : (
                            <VolumeX className="w-5 h-5 text-white/40" />
                        )}
                        <span className="text-white font-medium">Master Sound</span>
                    </div>
                    <button
                        onClick={handleMasterToggle}
                        className={`w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-green-500' : 'bg-white/20'
                            }`}
                    >
                        <div
                            className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform ${settings.enabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Volume Slider */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 font-medium">Volume</span>
                        <span className="text-purple-400 font-bold">{settings.volume}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                </div>

                {/* Sound Toggles */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Sound Effects</h3>

                    {/* Wins */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-white/80">Win Sounds</span>
                        </div>
                        <button
                            onClick={() => handleToggle('wins')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.wins ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.wins ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Losses */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <ArrowDownLeft className="w-5 h-5 text-red-400" />
                            <span className="text-white/80">Loss Sounds</span>
                        </div>
                        <button
                            onClick={() => handleToggle('losses')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.losses ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.losses ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Auto Cashout */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Timer className="w-5 h-5 text-blue-400" />
                            <span className="text-white/80">Auto Cashout</span>
                        </div>
                        <button
                            onClick={() => handleToggle('autoCashout')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.autoCashout ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.autoCashout ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Jackpot */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-pink-400" />
                            <span className="text-white/80">Jackpot</span>
                        </div>
                        <button
                            onClick={() => handleToggle('jackpot')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.jackpot ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.jackpot ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Chat */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Radio className="w-5 h-5 text-green-400" />
                            <span className="text-white/80">Chat Notifications</span>
                        </div>
                        <button
                            onClick={() => handleToggle('chat')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.chat ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.chat ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Engine */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center text-orange-400">
                                <span className="text-xs font-bold">▶</span>
                            </div>
                            <span className="text-white/80">Game Engine</span>
                        </div>
                        <button
                            onClick={() => handleToggle('engine')}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.sounds.engine ? 'bg-green-500' : 'bg-white/20'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform ${settings.sounds.engine ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Test Sound Button */}
                <button
                    onClick={() => SoundManager.playWin(5)}
                    disabled={!settings.enabled}
                    className="w-full mt-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                    Test Sound
                </button>
            </div>
        </div>
    );
}

// ArrowDownLeft icon as inline since lucide might not have it
function ArrowDownLeft({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="17" y1="17" x2="7" y2="7"></line>
            <polyline points="7 17 7 7 17 7"></polyline>
        </svg>
    );
}
