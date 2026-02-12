import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAudio } from './useAudio';

export const useMotoboyQueue = (userId: string | undefined, notificationSound: 'voice' | 'bell') => {
    const [ordersQueue, setOrdersQueue] = useState<any[]>([]);
    const [stats, setStats] = useState({ dailyEarnings: 0, deliveriesCount: 0 });
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const ordersQueueRef = useRef<any[]>([]);
    const isProcessingAction = useRef(false);
    const hasLoadedQueue = useRef(false);

    const { play: playAudio } = useAudio();

    const fetchOrdersQueue = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies:pharmacies(name, address, latitude, longitude), profiles:profiles!customer_id(full_name, phone, avatar_url), items:order_items(*, product:products(*))')
                .or(`motoboy_id.eq.${userId},status.eq.aguardando_motoboy`)
                .in('status', ['aceito', 'preparando', 'pronto_entrega', 'aguardando_retirada', 'em_rota', 'retirado', 'aguardando_motoboy'])
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Erro ao buscar fila de pedidos:", error);
                return;
            }

            if (data) {
                const previousQueue = ordersQueueRef.current;
                const previousIds = new Set(previousQueue.map(o => o.id));
                const isGenuinelyNew = data.some(o => !previousIds.has(o.id));

                if (hasLoadedQueue.current && !isProcessingAction.current && isGenuinelyNew) {
                    // NEW: We rely on Realtime for sounds to avoid duplicates.
                    // Only setting alert text here if needed, but sound is now Realtime-only.
                    setNewOrderAlert(`VOCÊ TEM UM NOVO PEDIDO! (${data.length} na fila)`);
                    setTimeout(() => setNewOrderAlert(null), 6000);
                }

                setOrdersQueue(data);
                ordersQueueRef.current = data;
                hasLoadedQueue.current = true;
            }
        } catch (err) {
            console.error("Exception fetching queue:", err);
        } finally {
            setLoading(false);
        }
    }, [userId, notificationSound, playAudio]);

    const fetchStats = useCallback(async () => {
        if (!userId) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('orders')
            .select('delivery_fee')
            .eq('motoboy_id', userId)
            .eq('status', 'entregue')
            .gte('delivered_at', today.toISOString());

        if (!error && data) {
            const earnings = data.reduce((acc, curr) => acc + (curr.delivery_fee || 0), 0);
            setStats({
                dailyEarnings: earnings,
                deliveriesCount: data.length
            });
        }
    }, [userId]);

    useEffect(() => {
        fetchOrdersQueue();
        fetchStats();
    }, [fetchOrdersQueue, fetchStats]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`motoboy_dashboard_all_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `motoboy_id=eq.${userId}`
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const oldStatus = (payload.old as any)?.status;
                        const newStatus = (payload.new as any)?.status;
                        const isNewStatus = oldStatus !== newStatus;

                        // Status que representam um NOVO convite/chamada para o motoboy
                        const recruitmentStatuses = ['aguardando_motoboy', 'pronto_entrega', 'aguardando_retirada'];

                        // Se for uma atualização de status de um pedido que o motoboy JÁ está cuidando (ex: 'retirado' ou 'em_rota')
                        // NÃO devemos tocar o alerta de "Novo Pedido", pois ele mesmo causou essa mudança.
                        const isActionByMe = ['aceito', 'retirado', 'em_rota', 'entregue', 'finalizado'].includes(newStatus);

                        if (!isProcessingAction.current && isNewStatus && recruitmentStatuses.includes(newStatus) && !isActionByMe) {
                            playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 3);
                            setNewOrderAlert(`VOCÊ TEM UM NOVO PEDIDO!`);
                            setTimeout(() => setNewOrderAlert(null), 6000);
                        }
                    } else if (payload.eventType === 'INSERT') {
                        // Se caiu um INSERT direto na fila do motoboy (atribuição direta pelo admin/loja)
                        playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 3);
                        setNewOrderAlert(`NOVA ENTREGA PARA VOCÊ!`);
                        setTimeout(() => setNewOrderAlert(null), 6000);
                    }
                    fetchOrdersQueue();
                }
            )
            .subscribe();

        const chatSub = supabase
            .channel(`chat_notifications_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages'
                },
                async (payload) => {
                    if (payload.new.sender_id !== userId) {
                        // 1. Incrementar contador visual
                        setUnreadChatCount(prev => prev + 1);

                        // 2. Tocar som de mensagem para novas mensagens
                        // Somente se não for o próprio motoboy enviando
                        playAudio('message');

                        // 3. Opcional: Vibrar o aparelho
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(chatSub);
        };
    }, [userId, notificationSound, playAudio, fetchOrdersQueue]);

    return {
        ordersQueue,
        setOrdersQueue,
        stats,
        fetchStats,
        unreadChatCount,
        setUnreadChatCount,
        newOrderAlert,
        setNewOrderAlert,
        fetchOrdersQueue,
        isProcessingAction,
        loading
    };
};
