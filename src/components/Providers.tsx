'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect } from 'react';

// URL манифеста нашего приложения
const manifestUrl = 'https://astro-crash-game.loca.lt/tonconnect-manifest.json';

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Инициализация Telegram Mini App SDK
        const initTMA = async () => {
            try {
                const { postEvent, isTMA } = await import('@tma.js/sdk');
                if (await isTMA()) {
                    postEvent('web_app_ready');
                    postEvent('web_app_expand');
                } else {
                    console.log('Running in browser: TMA SDK skipped');
                }
            } catch (e) {
                console.warn('TMA init skipped (likely browser env)');
            }
        };

        initTMA();
    }, []);

    return (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
            {children}
        </TonConnectUIProvider>
    );
}
