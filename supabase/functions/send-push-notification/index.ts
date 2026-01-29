import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        // Parse request body
        const { tokens, title, body, data } = await req.json()

        if (!tokens || tokens.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Nenhum token fornecido' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Preparar mensagem FCM
        const message = {
            registration_ids: tokens,
            notification: {
                title,
                body,
                icon: '/icon.png',
                badge: '/badge.png',
                click_action: data?.url || '/',
                tag: data?.orderId || 'notification'
            },
            data: {
                ...data,
                timestamp: new Date().toISOString()
            },
            priority: 'high',
            time_to_live: 86400 // 24 horas
        }

        console.log('Enviando notificação FCM:', message)

        // Enviar para Firebase Cloud Messaging
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${FIREBASE_SERVER_KEY}`
            },
            body: JSON.stringify(message)
        })

        const result = await response.json()

        console.log('Resposta FCM:', result)

        // Verificar tokens inválidos e removê-los
        if (result.results) {
            const invalidTokens: string[] = []

            result.results.forEach((res: any, index: number) => {
                if (res.error === 'InvalidRegistration' || res.error === 'NotRegistered') {
                    invalidTokens.push(tokens[index])
                }
            })

            // Remover tokens inválidos do banco
            if (invalidTokens.length > 0) {
                await supabase
                    .from('device_tokens')
                    .delete()
                    .in('token', invalidTokens)

                console.log('Tokens inválidos removidos:', invalidTokens.length)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                result,
                invalidTokensRemoved: result.failure || 0
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    } catch (error) {
        console.error('Erro ao enviar notificação:', error)

        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.toString()
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
