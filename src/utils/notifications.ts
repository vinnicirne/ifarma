import { supabase } from '../lib/supabase';

/**
 * Envia notificação push para um ou mais usuários
 */
export const sendOrderNotification = async (
    orderId: string,
    customerId: string,
    title: string,
    body: string
) => {
    try {
        // Buscar tokens do cliente
        const { data: tokens, error: tokensError } = await supabase
            .from('device_tokens')
            .select('token')
            .eq('user_id', customerId);

        if (tokensError) {
            console.error('Erro ao buscar tokens:', tokensError);
            return null;
        }

        if (!tokens || tokens.length === 0) {
            console.log('Nenhum token encontrado para o usuário:', customerId);
            return null;
        }

        // Chamar Edge Function para enviar notificação
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                tokens: tokens.map(t => t.token),
                title,
                body,
                data: {
                    orderId,
                    url: `/order-tracking/${orderId}`
                }
            }
        });

        if (error) {
            console.error('Erro ao enviar notificação:', error);
            return null;
        }

        console.log('Notificação enviada com sucesso:', data);
        return data;
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        return null;
    }
};

/**
 * Mensagens de notificação por status do pedido
 */
export const ORDER_STATUS_MESSAGES = {
    'preparando': {
        title: '🔔 Pedido em Preparo',
        body: 'Sua farmácia está preparando seu pedido!'
    },
    'em_rota': {
        title: '🚴 Pedido a Caminho',
        body: 'Seu pedido está a caminho! Acompanhe em tempo real.'
    },
    'entregue': {
        title: '✅ Pedido Entregue',
        body: 'Seu pedido foi entregue com sucesso! Obrigado pela preferência.'
    },
    'cancelado': {
        title: '❌ Pedido Cancelado',
        body: 'Seu pedido foi cancelado. Entre em contato para mais informações.'
    }
} as const;

/**
 * Envia notificação baseada no status do pedido
 */
export const notifyOrderStatusChange = async (
    orderId: string,
    customerId: string,
    newStatus: keyof typeof ORDER_STATUS_MESSAGES
) => {
    const message = ORDER_STATUS_MESSAGES[newStatus];

    if (message) {
        return await sendOrderNotification(
            orderId,
            customerId,
            message.title,
            message.body
        );
    }

    return null;
};
