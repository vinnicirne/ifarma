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
        const createNotificationChannel = async () => {
            try {
                const { Device } = await import('@capacitor/device');
                const info = await Device.getInfo();

                if (info.platform === 'android') {
                    const { LocalNotifications } = await import('@capacitor/local-notifications');
                    console.log('Criando canal de notificação nativo...');
                    await LocalNotifications.createChannel({
                        id: 'chat_bibi_channel',
                        name: 'Chat - Alertas BI BI',
                        description: 'Notificações do chat com som BI BI',
                        importance: 5,
                        visibility: 1,
                        sound: 'bi_bi.mp3',
                        vibration: true
                    });
                    console.log('Canal de notificação criado com sucesso');
                }
            } catch (error) {
                console.error('Erro ao criar canal de notificação:', error);
            }
        };

        const registerToken = async () => {
            try {
                const { Device } = await import('@capacitor/device');
                const info = await Device.getInfo();

                if (info.platform === 'android' || info.platform === 'ios') {
                    const { PushNotifications } = await import('@capacitor/push-notifications');

                    const perm = await PushNotifications.requestPermissions();
                    if (perm.receive === 'granted') {
                        await PushNotifications.register();

                        PushNotifications.addListener('registration', async (regToken) => {
                            console.log('Native FCM token:', regToken.value);
                            localStorage.setItem('ifarma_fcm_token', regToken.value);
                            await supabase
                                .from('device_tokens')
                                .upsert({
                                    user_id: userId!,
                                    token: regToken.value,
                                    device_type: info.platform === 'android' ? 'android' : 'ios'
                                }, {
                                    onConflict: 'user_id,token'
                                });
                        });
                    }
                } else {
                    // Web browser - Using Firebase SDK
                    const token = await requestNotificationPermission() || '';
                    if (token && userId) {
                        localStorage.setItem('ifarma_fcm_token', token);
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
                }
            } catch (error) {
                console.error('Erro ao registrar token:', error);
            }
        };

        const setupPush = async () => {
            const { Device } = await import('@capacitor/device');
            const info = await Device.getInfo();
            const isNative = info.platform === 'android' || info.platform === 'ios';

            if (isNative) {
                // Criar canal E exibir notificação local em foreground

                // 1. Criar canal de alta prioridade
                await createNotificationChannel();

                // 2. Registrar listener para exibir Banner (Heads-up) quando app está aberto
                const { PushNotifications } = await import('@capacitor/push-notifications');
                const { LocalNotifications } = await import('@capacitor/local-notifications');

                PushNotifications.addListener('pushNotificationReceived', async (notification) => {
                    console.log('Push nativo recebido em foreground:', notification);

                    // Exibir banner localmente para garantir que o usuário veja
                    // Isso resolve o problema de "não aparecer em cima" quando o app está aberto
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: notification.title || 'Nova Notificação',
                            body: notification.body || '',
                            id: new Date().getTime(),
                            schedule: { at: new Date(Date.now() + 100) }, // 100ms delay
                            sound: 'bi_bi.mp3',
                            channelId: 'chat_bibi_channel'
                        }]
                    });

                    fetchNotifications();
                });
            }

            await registerToken();

            try {
                // Foreground listener (Web only)
                if (!isNative) {
                    onMessageListener()
                        .then((payload: any) => {
                            console.log('Push received via Web listener:', payload);
                            if (Notification.permission === 'granted') {
                                new Notification(payload.notification?.title || 'Nova Notificação', {
                                    body: payload.notification?.body || '',
                                    icon: '/icon.png',
                                });
                            }

                            const hornSound = 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3';
                            const audio = new Audio(hornSound);
                            audio.play().catch(e => console.warn("Audio foreground blocked:", e));

                            fetchNotifications();
                        })
                        .catch((err) => {
                            console.debug('Push listener error:', err);
                        });
                }
            } catch (error) {
                console.debug('Push setup error:', error);
            }
        };

        if (userId) setupPush();
    }, [userId, fetchNotifications]);

    return { notifications, unreadCount, markAsRead, markAllAsRead, loading, refresh: fetchNotifications };
};
