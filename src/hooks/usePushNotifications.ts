'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PushSubscription {
    id: string;
    wallet_address: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    created_at: string;
}

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
}

export function usePushNotifications(walletAddress: string | null) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if push notifications are supported
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    // Request permission
    const requestPermission = useCallback(async () => {
        if (!isSupported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch (e) {
            console.error('Failed to request notification permission:', e);
            return false;
        }
    }, [isSupported]);

    // Subscribe to push notifications
    const subscribe = useCallback(async () => {
        if (!isSupported || !walletAddress || permission !== 'granted') return null;

        try {
            // Get existing subscription
            const existing = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            if (existing.data) {
                setSubscription(existing.data);
                return existing.data;
            }

            // Create new subscription via service worker
            const registration = await navigator.serviceWorker.ready;
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
                ) as unknown as BufferSource
            });

            // Save to database
            const { data, error } = await supabase
                .from('push_subscriptions')
                .insert([{
                    wallet_address: walletAddress,
                    endpoint: pushSubscription.endpoint,
                    keys: {
                        p256dh: pushSubscription.toJSON().keys?.p256dh || '',
                        auth: pushSubscription.toJSON().keys?.auth || ''
                    }
                }])
                .select()
                .single();

            if (error) throw error;
            setSubscription(data);
            return data;
        } catch (e) {
            console.error('Failed to subscribe to push:', e);
            return null;
        }
    }, [isSupported, walletAddress, permission]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async () => {
        if (!subscription) return;

        try {
            // Remove from service worker
            const registration = await navigator.serviceWorker.ready;
            const pushSub = await registration.pushManager.getSubscription();
            if (pushSub) {
                await pushSub.unsubscribe();
            }

            // Remove from database
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id);

            setSubscription(null);
        } catch (e) {
            console.error('Failed to unsubscribe:', e);
        }
    }, [subscription]);

    // Send local notification (for testing)
    const sendLocalNotification = useCallback(async (payload: NotificationPayload) => {
        if (permission !== 'granted') return;

        try {
            new Notification(payload.title, {
                body: payload.body,
                icon: payload.icon || '/icon.png',
                badge: payload.badge || '/icon.png',
                tag: payload.tag,
                data: payload.data,
            });
        } catch (e) {
            console.error('Failed to send local notification:', e);
        }
    }, [permission]);

    // Check if user has pending notifications
    const checkPendingNotifications = useCallback(async () => {
        if (!walletAddress) return [];

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);

        return data || [];
    }, [walletAddress]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
    }, []);

    return {
        isSupported,
        permission,
        subscription,
        isLoading,
        requestPermission,
        subscribe,
        unsubscribe,
        sendLocalNotification,
        checkPendingNotifications,
        markAsRead,
    };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
