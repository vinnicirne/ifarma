import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        const payload = await req.json()
        const { type, table, record, old_record } = payload

        console.log(`Recebendo webhook Motoboy: ${type} em ${table}`, record)

        // 1. Verificar se é uma ATRIBUIÇÃO de motoboy
        // Cenário A: UPDATE orders SET motoboy_id = ...
        if (type === 'UPDATE' && table === 'orders') {
            const newMotoboyId = record.motoboy_id
            const oldMotoboyId = old_record?.motoboy_id

            // Se não tinha motoboy e agora tem, OU trocou de motoboy
            if (newMotoboyId && newMotoboyId !== oldMotoboyId) {
                await notifyMotoboy(newMotoboyId, record.id, '🚀 Nova Corrida!', 'Você recebeu uma nova entrega.')
                return new Response('Motoboy Assigned Notified', { status: 200 })
            }
        }

        // Cenário B: INSERT em orders (se já nascer com motoboy, raro mas possível)
        if (type === 'INSERT' && table === 'orders' && record.motoboy_id) {
            await notifyMotoboy(record.motoboy_id, record.id, '🚀 Nova Corrida!', 'Você recebeu uma nova entrega.')
            return new Response('Motoboy Initial Notified', { status: 200 })
        }

        return new Response('Ignored', { status: 200 })

    } catch (error) {
        console.error('Erro no Motoboy Notifier:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})

async function notifyMotoboy(motoboyId: string, orderId: string, title: string, body: string) {
    if (!motoboyId) return

    // 1. Buscar Tokens do Motoboy
    const { data: tokensData, error: tokenError } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', motoboyId)

    if (tokenError || !tokensData || tokensData.length === 0) {
        console.log('Nenhum token encontrado para o motoboy:', motoboyId)
        return
    }

    const tokens = tokensData.map(t => t.token)

    // 2. Enviar Notificação FCM (Som de Alerta)
    const message = {
        registration_ids: tokens,
        notification: {
            title: title,
            body: body,
            // android_channel_id OBRIGATÓRIO para tocar som customizado no Android 8+
            android_channel_id: 'chat_bibi_channel',
            sound: 'alert_high_priority.mp3'
        },
        data: {
            orderId: orderId,
            type: 'new_delivery',
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // Importante para alguns plugins
            url: `/motoboy-orders`
        },
        priority: 'high',
        android: {
            priority: 'high',
            notification: {
                channel_id: 'chat_bibi_channel', // Mesmo ID usado no app cliente
                sound: 'alert_high_priority',
                default_sound: false,
                default_vibrate_timings: false,
                vibrate_timings: [200, 100, 200, 100, 200, 100, 400]
            }
        }
    }

    console.log('Enviando notificacao para motoboy:', motoboyId, message)

    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FIREBASE_SERVER_KEY}`
        },
        body: JSON.stringify(message)
    })

    const json = await res.json()
    console.log('FCM Response:', json)
}
