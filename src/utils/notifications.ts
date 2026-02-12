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
 * Envia notificação em massa por papel (role)
 */
export const sendBroadcastNotification = async (
    role: 'customer' | 'motoboy' | 'pharmacy',
    title: string,
    body: string,
    data: any = {}
) => {
    try {
        // 1. Buscar IDs dos usuários alvo
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', role);

        if (profileError) throw profileError;

        if (!profiles || profiles.length === 0) {
            console.warn(`Nenhum usuário encontrado com o papel: ${role}`);
            return null;
        }

        const userIds = profiles.map(p => p.id);

        // 2. Registrar no banco de dados (Histórico interno do App)
        // Isso garante que o usuário veja a notificação na "caixa de entrada" do app
        console.log(`Registrando notificação no banco para ${userIds.length} usuários...`);

        // Registrar para todos (em lotes se necessário, mas aqui vamos limitar aos 100 primeiros para performance imediata)
        const targetUserIds = userIds.slice(0, 100);
        const notificationsToInsert = targetUserIds.map(id => ({
            user_id: id,
            title,
            message: body,
            type: 'promotion',
            created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase.from('notifications').insert(notificationsToInsert);
        if (notifError) console.warn('Erro ao salvar histórico de notificações:', notifError);

        // 3. Buscar tokens para o Push Notification
        const { data: tokensData, error: tokensError } = await supabase
            .from('device_tokens')
            .select('token')
            .in('user_id', userIds);

        if (tokensError) throw tokensError;

        const tokens = tokensData?.map(t => t.token).filter(Boolean);

        if (!tokens || tokens.length === 0) {
            console.warn(`Nenhum token de push encontrado para o papel: ${role}. Notificação salva apenas no banco.`);
            return { success: true, warning: 'no_tokens' };
        }

        // 4. Chamar Edge Function para o Push Real
        console.log(`Enviando push para ${tokens.length} dispositivos...`);
        const { data: res, error: funcError } = await supabase.functions.invoke('send-push-notification', {
            body: {
                tokens,
                title,
                body,
                data
            }
        });

        if (funcError) throw funcError;

        return { success: true, pushCount: tokens.length };
    } catch (error) {
        console.error('Erro ao enviar transmissão:', error);
        return { success: false, error };
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
    newStatus: keyof typeof ORDER_STATUS_MESSAGES,
    bodyOverride?: string
) => {
    const message = ORDER_STATUS_MESSAGES[newStatus];

    if (message) {
        return await sendOrderNotification(
            orderId,
            customerId,
            message.title,
            bodyOverride || message.body
        );
    }

    return null;
};
