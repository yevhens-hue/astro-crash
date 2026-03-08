'use client';

import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initTMA = async () => {
      try {
        const { retrieveLaunchParams, isTMA, miniApp } = await import('@tma.js/sdk');
        
        const tma = await isTMA();
        if (tma) {
          try {
            const launchParams = retrieveLaunchParams() as any;
            const initData = launchParams.initData;
            
            if (initData && initData.user) {
              setUser(initData.user);
            }
            
            // @ts-ignore
            if (miniApp.isAvailable && miniApp.isAvailable()) {
              // @ts-ignore
              if (!miniApp.isMounted()) miniApp.mount();
            }
          } catch (err) {
            console.warn('Launch params retrieval failed:', err);
          }
        } else {
          // Check for raw window.Telegram on desktop
          if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
            setUser((window as any).Telegram.WebApp.initDataUnsafe.user);
          }
        }
        setIsReady(true);
      } catch (e) {
        console.warn('TMA initialization failed (likely browser env):', e);
      }
    };

    initTMA();
  }, []);

  return {
    user,
    isReady,
  };
}
