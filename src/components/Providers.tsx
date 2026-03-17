'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { ThemeProvider } from '@/hooks/useTheme';

// URL манифеста нашего приложения
const manifestUrl = 'https://telegram-gambling-app.vercel.app/tonconnect-manifest.json';

export function Providers({ children }: { children: React.ReactNode }) {
    const { locale } = useI18n();

    useEffect(() => {
        const initTMA = async () => {
            try {
                const analytics = (await import('@telegram-apps/analytics')).default;
                const { postEvent, isTMA, miniApp, themeParams, retrieveLaunchParams } = await import('@tma.js/sdk');

                // Init Analytics
                try {
                    const analytics = (await import('@telegram-apps/analytics')).default;
                    const analyticsToken = process.env.NEXT_PUBLIC_TELEGRAM_ANALYTICS_TOKEN;
                    if (!analyticsToken) {
                        console.warn('Analytics token not configured');
                        return;
                    }
                    analytics.init({
                        appName: 'Astro Crash',
                        token: analyticsToken,
                        env: process.env.NODE_ENV === 'development' ? 'STG' : 'PROD',
                    });
                } catch (aErr) {
                    console.warn('Analytics init error:', aErr);
                }

                const tma = await isTMA();

                if (tma) {
                    // Mount components
                    // @ts-ignore
                    if (miniApp?.isAvailable?.() && !miniApp?.isMounted?.()) miniApp.mount();
                    // @ts-ignore
                    if (themeParams?.isAvailable?.() && !themeParams?.isMounted?.()) themeParams.mount();

                    postEvent('web_app_ready');
                    postEvent('web_app_expand');

                    // Set CSS variables from Telegram theme
                    const params = (themeParams as any)?.getState?.() || (themeParams as any)?.get?.() || (themeParams as any)?.value;
                    if (params) {
                        document.documentElement.style.setProperty('--tg-theme-bg-color', params.backgroundColor || params.bgColor || '#050505');
                        document.documentElement.style.setProperty('--tg-theme-text-color', params.textColor || params.text_color || '#ffffff');
                        document.documentElement.style.setProperty('--tg-theme-hint-color', params.hintColor || params.hint_color || '#999999');
                        document.documentElement.style.setProperty('--tg-theme-link-color', params.linkColor || params.link_color || '#d4af37');
                        document.documentElement.style.setProperty('--tg-theme-button-color', params.buttonColor || params.button_color || '#d4af37');
                        document.documentElement.style.setProperty('--tg-theme-button-text-color', params.buttonTextColor || params.button_text_color || '#000000');
                    }

                    // Sync User with Supabase
                    try {
                        const launchParams = retrieveLaunchParams() as any;
                        const initData = launchParams.initData;
                        if (initData && initData.user) {
                            const { syncTelegramUser } = await import('@/lib/supabase');
                            await syncTelegramUser(initData.user);
                        }
                    } catch (lpErr) {
                        console.warn('Could not retrieve launch params:', lpErr);
                    }
                } else {
                    // Fallback for Desktop/Web Telegram if isTMA() returned false
                    // but we are still inside a Telegram webview
                    if ((window as any).Telegram?.WebApp) {
                        const tg = (window as any).Telegram.WebApp;
                        tg.ready();
                        tg.expand();

                        // Try to sync user from initDataUnsafe if SDK failed
                        if (tg.initDataUnsafe?.user) {
                            const { syncTelegramUser } = await import('@/lib/supabase');
                            await syncTelegramUser(tg.initDataUnsafe.user);
                        }
                    }
                }
            } catch (e) {
                console.warn('TMA init error:', e);
                // Last resort ready signal
                if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.ready();
                }
            }
        };

        initTMA();
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
        }
    }, []);

    return (
        <ThemeProvider>
            <TonConnectUIProvider manifestUrl={manifestUrl}>
                {children}
            </TonConnectUIProvider>
        </ThemeProvider>
    );
}
