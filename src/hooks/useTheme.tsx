'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'midnight' | 'sunset' | 'ocean';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    themes: ThemeInfo[];
}

interface ThemeInfo {
    id: Theme;
    name: string;
    colors: {
        background: string;
        foreground: string;
        gold: string;
        goldLight: string;
        goldDark: string;
        accent: string;
        card: string;
    };
}

const THEMES: ThemeInfo[] = [
    {
        id: 'dark',
        name: 'Classic Dark',
        colors: {
            background: '#050505',
            foreground: '#ffffff',
            gold: '#d4af37',
            goldLight: '#f9d976',
            goldDark: '#b8860b',
            accent: '#9333ea',
            card: 'rgba(255, 255, 255, 0.05)',
        },
    },
    {
        id: 'light',
        name: 'Light Mode',
        colors: {
            background: '#f8fafc',
            foreground: '#0f172a',
            gold: '#d4af37',
            goldLight: '#f9d976',
            goldDark: '#b8860b',
            accent: '#9333ea',
            card: 'rgba(0, 0, 0, 0.05)',
        },
    },
    {
        id: 'midnight',
        name: 'Midnight Blue',
        colors: {
            background: '#0a0a1a',
            foreground: '#e2e8f0',
            gold: '#60a5fa',
            goldLight: '#93c5fd',
            goldDark: '#3b82f6',
            accent: '#8b5cf6',
            card: 'rgba(96, 165, 250, 0.1)',
        },
    },
    {
        id: 'sunset',
        name: 'Sunset Glow',
        colors: {
            background: '#1a0a0a',
            foreground: '#fef2f2',
            gold: '#f97316',
            goldLight: '#fb923c',
            goldDark: '#ea580c',
            accent: '#ef4444',
            card: 'rgba(249, 115, 22, 0.1)',
        },
    },
    {
        id: 'ocean',
        name: 'Ocean Deep',
        colors: {
            background: '#0a1929',
            foreground: '#e0f2fe',
            gold: '#06b6d4',
            goldLight: '#22d3ee',
            goldDark: '#0891b2',
            accent: '#14b8a6',
            card: 'rgba(6, 182, 212, 0.1)',
        },
    },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('astro-theme') as Theme | null;
        if (savedTheme && THEMES.some(t => t.id === savedTheme)) {
            setThemeState(savedTheme);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        // Apply theme colors to CSS variables
        const themeInfo = THEMES.find(t => t.id === theme);
        if (themeInfo) {
            const root = document.documentElement;
            root.style.setProperty('--custom-bg', themeInfo.colors.background);
            root.style.setProperty('--custom-fg', themeInfo.colors.foreground);
            root.style.setProperty('--custom-gold', themeInfo.colors.gold);
            root.style.setProperty('--custom-gold-light', themeInfo.colors.goldLight);
            root.style.setProperty('--custom-gold-dark', themeInfo.colors.goldDark);
            root.style.setProperty('--custom-accent', themeInfo.colors.accent);
            root.style.setProperty('--custom-card', themeInfo.colors.card);

            // Update body classes
            document.body.className = `theme-${theme}`;
        }

        // Save to localStorage
        localStorage.setItem('astro-theme', theme);
    }, [theme, isLoaded]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
