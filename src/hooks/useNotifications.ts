import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { requestNotificationPermission, onMessageListener } from '../lib/firebase';

/**
 * Hook para gerenciar notificações push e histórico
 */
export const useNotifications = (userId: string | null) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAsRead = async (notificationId: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();

            // Realtime subscription
            const channel = supabase
                .channel(`user_notifications_${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [userId, fetchNotifications]);

    useEffect(() => {
        const registerToken = async () => {
            try {
                const token = await requestNotificationPermission();
                if (token && userId) {
                    await supabase
                        .from('device_tokens')
                        .upsert({
                            user_id: userId,
                            token,
                            device_type: 'web'
                        }, {
                            onConflict: 'user_id,token'
                        });
                }
            } catch (error) {
                console.error('Erro ao registrar token:', error);
            }
        };

        const setupPush = async () => {
            await registerToken();
            try {
                // Em foreground
                onMessageListener()
                    .then((payload: any) => {
                        console.log('Push received:', payload);
                        if (Notification.permission === 'granted') {
                            new Notification(payload.notification?.title || 'Nova Notificação', {
                                body: payload.notification?.body || '',
                                icon: '/icon.png',
                            });
                        }
                        fetchNotifications();
                    })
                    .catch((err) => {
                        console.debug('Push listener error:', err);
                    });
            } catch (error) {
                console.debug('Push not available:', error);
            }
        };

        if (userId) setupPush();
    }, [userId, fetchNotifications]);

    return { notifications, unreadCount, markAsRead, markAllAsRead, loading, refresh: fetchNotifications };
};
