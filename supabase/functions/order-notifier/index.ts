import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('IFARMA_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        const payload = await req.json()
        const { type, table, record } = payload

        console.log(`Recebendo webhook: ${type} em ${table}`, record)

        // Apenas processa novos pedidos
        // Apenas processa novos pedidos, atualizações de status ou mensagens
        if (!['INSERT', 'UPDATE'].includes(type)) {
            return new Response('Ignored (Not Insert/Update)', { status: 200 })
        }

        // === CENÁRIO 1: PEDIDOS (NOVO ou ATUALIZAÇÃO) ===
        if (table === 'orders') {
            const order = record
            const oldOrder = payload.old_record || {}

            // 1.1 NOVO PEDIDO -> Notificar Farmácia
            if (type === 'INSERT') {
                // 1. Buscar Dono da Farmácia
                const { data: pharmacy, error: pharmError } = await supabase
                    .from('pharmacies')
                    .select('owner_id, name')
                    .eq('id', order.pharmacy_id)
                    .single()

                if (pharmError || !pharmacy?.owner_id) {
                    console.error('Farmácia ou dono não encontrado:', pharmError)
                    return new Response('Pharmacy Owner Not Found', { status: 404 })
                }

                // 2. Buscar Tokens do Dono (Merchant)
                const { data: tokensData, error: tokenError } = await supabase
                    .from('device_tokens')
                    .select('token')
                    .eq('user_id', pharmacy.owner_id)

                if (tokenError || !tokensData || tokensData.length === 0) {
                    console.log('Nenhum token encontrado para o dono:', pharmacy.owner_id)
                    return new Response('No Tokens', { status: 200 })
                }

                const tokens = tokensData.map(t => t.token)

                // 3. Enviar Notificação FCM (Som de Caixa/Novo Pedido)
                const message = {
                    registration_ids: tokens,
                    notification: {
                        title: '💰 Novo Pedido!',
                        body: `Novo pedido de R$ ${Number(order.total_price).toFixed(2)} recebido!`,
                        icon: '/icon.png',
                        sound: 'cash_register.mp3',
                        android_channel_id: 'orders_channel'
                    },
                    data: {
                        orderId: order.id,
                        type: 'new_order',
                        url: `/gestor/orders`
                    },
                    priority: 'high',
                    android: {
                        priority: 'high',
                        notification: {
                            channel_id: 'orders_channel',
                            sound: 'cash_register'
                        }
                    }
                }

                console.log('Enviando notificacao para dono:', pharmacy.owner_id)

                // Persistir no banco para o histórico
                await supabase.from('notifications').insert({
                    user_id: pharmacy.owner_id,
                    title: '💰 Novo Pedido!',
                    message: `Novo pedido de R$ ${Number(order.total_price).toFixed(2)} recebido!`,
                    type: 'order',
                    is_read: false,
                    data: { orderId: order.id }
                });

                const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `key=${FIREBASE_SERVER_KEY}`
                    },
                    body: JSON.stringify(message)
                })

                return new Response(JSON.stringify(await fcmResponse.json()), { headers: { 'Content-Type': 'application/json' }, status: 200 })
            }

            // 1.2 ATUALIZAÇÃO DE STATUS -> Notificar Cliente
            if (type === 'UPDATE' && order.status !== oldOrder.status && order.customer_id) {
                const status = order.status
                let title = ''
                let body = ''

                if (status === 'em_rota') {
                    title = '🚴 Pedido a Caminho'
                    body = 'Seu pedido saiu para entrega! Acompanhe em tempo real.'
                } else if (status === 'entregue') {
                    title = '✅ Pedido Entregue'
                    body = 'Seu pedido foi entregue. Obrigado pela preferência!'
                } else if (status === 'cancelado') {
                    title = '❌ Pedido Cancelado'
                    body = 'Seu pedido foi cancelado pela farmácia.'
                }

                if (title) {
                    // Buscar tokens do cliente
                    const { data: tokensData } = await supabase
                        .from('device_tokens')
                        .select('token')
                        .eq('user_id', order.customer_id)

                    if (tokensData && tokensData.length > 0) {
                        const tokens = tokensData.map(t => t.token)

                        const message = {
                            registration_ids: tokens,
                            notification: {
                                title,
                                body,
                                icon: '/icon.png',
                                sound: 'default',
                                android_channel_id: 'orders_channel'
                            },
                            data: {
                                orderId: order.id,
                                type: 'order_update',
                                url: `/order-tracking/${order.id}`
                            },
                            priority: 'high'
                        }

                        console.log(`Notificando cliente ${order.customer_id} sobre status ${status}`)

                        // Persistir no banco para o histórico
                        await supabase.from('notifications').insert({
                            user_id: order.customer_id,
                            title: title,
                            message: body,
                            type: 'order',
                            is_read: false,
                            data: { orderId: order.id }
                        });

                        await fetch('https://fcm.googleapis.com/fcm/send', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `key=${FIREBASE_SERVER_KEY}`
                            },
                            body: JSON.stringify(message)
                        })
                    }
                }
                return new Response('Status Update Processed', { status: 200 })
            }

            return new Response('Ignored Order Update', { status: 200 })
        }

        // === CENÁRIO 2: MENSAGENS DE CHAT ===
        if (table === 'order_messages') {
            const messageRecord = record
            const orderId = messageRecord.order_id
            const senderId = messageRecord.sender_id
            const content = messageRecord.content

            // 1. Buscar detalhes do pedido e participantes com IDs corretos
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    customer_id, 
                    motoboy_id,
                    pharmacy_id,
                    pharmacy:pharmacies(id, owner_id, name)
                `)
                .eq('id', orderId)
                .single()

            if (orderError || !order) {
                console.error('Pedido não encontrado para mensagem:', orderId)
                return new Response('Order Not Found', { status: 404 })
            }

            const motoboyId = order.motoboy_id;

            // Robustez: Tratar se 'pharmacy' retornar objeto ou array
            const pharmacyData = Array.isArray(order.pharmacy) ? order.pharmacy[0] : order.pharmacy;
            const pharmacyId = pharmacyData?.id || order.pharmacy_id;
            const pharmacyOwnerId = pharmacyData?.owner_id;
            const pharmacyName = pharmacyData?.name || 'Farmácia';
            const customerId = order.customer_id;

            // 2. Determinar destinatários e buscar tokens
            const recipients = []
            let senderName = 'Chat'

            if (senderId === customerId) {
                senderName = 'Cliente'
                // NOTIFICAR TODOS OS MEMBROS DA FARMÁCIA
                const { data: pharmacyUsers } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('pharmacy_id', pharmacyId)

                if (pharmacyUsers) {
                    pharmacyUsers.forEach(u => recipients.push(u.id))
                }

                // Garantir que o dono também receba
                if (pharmacyOwnerId && !recipients.includes(pharmacyOwnerId)) {
                    recipients.push(pharmacyOwnerId)
                }

                if (motoboyId) recipients.push(motoboyId)
            } else if (senderId === pharmacyOwnerId || messageRecord.sender_role === 'pharmacy') {
                senderName = pharmacyName
                if (customerId) recipients.push(customerId)
                if (motoboyId) recipients.push(motoboyId)
            } else if (senderId === motoboyId || messageRecord.sender_role === 'motoboy') {
                senderName = 'Entregador'
                if (customerId) recipients.push(customerId)
                // Notificar todos da farmácia
                const { data: pharmacyUsers } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('pharmacy_id', pharmacyId)

                if (pharmacyUsers) {
                    pharmacyUsers.forEach(u => recipients.push(u.id))
                }
                if (pharmacyOwnerId && !recipients.includes(pharmacyOwnerId)) {
                    recipients.push(pharmacyOwnerId)
                }
            }

            // Remover o remetente da lista de destinatários (caso ele esteja nela)
            const finalRecipients = recipients.filter(id => id !== senderId)

            if (finalRecipients.length === 0) {
                return new Response('No Recipients', { status: 200 })
            }

            // 3. Buscar tokens dos destinatários
            const { data: tokensData } = await supabase
                .from('device_tokens')
                .select('token')
                .in('user_id', finalRecipients)

            if (!tokensData || tokensData.length === 0) {
                return new Response('No Tokens for Recipients', { status: 200 })
            }

            const tokens = tokensData.map(t => t.token)

            // 4. Enviar Notificação Push e Persistir no Banco
            const fcmMessage = {
                registration_ids: tokens,
                notification: {
                    title: `Mensagem de ${senderName}`,
                    body: content,
                    icon: '/icon.png',
                    sound: 'bi_bi.mp3',
                    android_channel_id: 'chat_bibi_channel'
                },
                data: {
                    orderId: orderId,
                    type: 'chat_message',
                    url: `/order-tracking/${orderId}` // Link para o chat
                },
                priority: 'high',
                android: {
                    priority: 'high',
                    notification: {
                        channel_id: 'chat_bibi_channel',
                        sound: 'bi_bi'
                    }
                }
            }

            console.log(`Enviando chat msg de ${senderId} para`, finalRecipients)

            // Persistir notificação no banco para o histórico do "sininho"
            const dbNotifications = finalRecipients.map(uid => ({
                user_id: uid,
                title: `Nova mensagem de ${senderName}`,
                message: content,
                type: 'chat',
                is_read: false,
                data: { orderId: orderId }
            }));

            await supabase.from('notifications').insert(dbNotifications);

            const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${FIREBASE_SERVER_KEY}`
                },
                body: JSON.stringify(fcmMessage)
            })

            const fcmResult = await fcmResponse.json()
            return new Response(JSON.stringify(fcmResult), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            })
        }

        return new Response('Ignored Table', { status: 200 })

    } catch (error) {
        console.error('Erro no Order Notifier:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
