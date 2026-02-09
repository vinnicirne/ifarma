import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { tokens, title, body, data } = await req.json()
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            // Create client with Auth context of the user that called the function.
            // This way your row-level-security (RLS) policies are applied.
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Create a Supabase client with the SERVICE ROLE key to access device_tokens and delete invalid ones
        // We need service role because normal users shouldn't delete other users' tokens directly, 
        // but this system function needs to clean up.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        if (!tokens || tokens.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Nenhum token fornecido' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!

        // Preparar mensagem FCM (Legacy API)
        // Nota: O ideal seria migrar para V1 HTTP API, mas vamos manter compatibilidade por enquanto
        const message = {
            registration_ids: tokens,
            notification: {
                title,
                body,
                icon: '/icon.png',
                badge: '/badge.png',
                click_action: data?.url || '/',
                tag: data?.orderId || 'notification',
                android_channel_id: 'chat_bibi_channel',
                sound: 'bi_bi.mp3'
            },
            data: {
                ...data,
                timestamp: new Date().toISOString()
            },
            priority: 'high',
            android: {
                priority: 'high',
                notification: {
                    channel_id: 'chat_bibi_channel',
                    sound: 'bi_bi'
                }
            },
            time_to_live: 86400 // 24 horas
        }

        // console.log('Enviando para FCM com chave:', FIREBASE_SERVER_KEY ? 'Sim' : 'Não')

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${FIREBASE_SERVER_KEY}`
            },
            body: JSON.stringify(message)
        })

        const result = await fcmResponse.json()
        console.log('FCM Response:', result)

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
                await supabaseAdmin
                    .from('device_tokens')
                    .delete()
                    .in('token', invalidTokens)

                console.log('Limpeza: Tokens inválidos removidos:', invalidTokens.length)
            }
        }

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
