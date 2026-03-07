'use client';

import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

const SYMBOLS = ['💎', '🎭', '👑', '777', '🍒', '🔔', '🍋'];
const REEL_COUNT = 3;

export default function SlotMachine() {
    const [reels, setReels] = useState(Array(REEL_COUNT).fill(SYMBOLS[0]));
    const [isSpinning, setIsSpinning] = useState(false);
    const controls = [useAnimation(), useAnimation(), useAnimation()];

    const spin = async () => {
        if (isSpinning) return;
        setIsSpinning(true);

        const spinResults = reels.map(() =>
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        );

        // Анимация вращения для каждого барабана с разной задержкой
        const animations = controls.map((control, i) => {
            return control.start({
                y: [0, -500, 0],
                transition: {
                    duration: 1.5 + i * 0.5,
                    ease: "easeInOut"
                }
            });
        });

        // Ждем завершения самой долгой анимации
        await Promise.all(animations);

        setReels(spinResults);
        setIsSpinning(false);

        // Проверка на выигрыш (упрощенная)
        if (spinResults.every(s => s === spinResults[0])) {
            alert('BIG WIN!');
        }
    };

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex gap-4 p-4 glass-card bg-black/60 border-gold/30 shadow-gold">
                {reels.map((symbol, i) => (
                    <div key={i} className="slot-reel flex items-center justify-center text-4xl bg-gradient-to-b from-black via-zinc-900 to-black">
                        <motion.div
                            animate={controls[i]}
                            className="flex flex-col items-center gap-4"
                        >
                            <span>{symbol}</span>
                        </motion.div>
                    </div>
                ))}
            </div>

            <button
                onClick={spin}
                disabled={isSpinning}
                className={`gold-button w-full text-2xl py-6 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.6)] ${isSpinning ? 'opacity-50 grayscale' : ''}`}
            >
                {isSpinning ? 'Spinning...' : 'Spin Now'}
            </button>
        </div>
    );
}
