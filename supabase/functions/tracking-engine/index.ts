import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { motoboyId, latitude, longitude, orderId } = await req.json()

        if (!motoboyId || !latitude || !longitude) {
            throw new Error('Motoboy ID e coordenadas são obrigatórios')
        }

        // 1. Atualizar localização atual e histórico
        const { error: historyError } = await supabase.from('location_history').insert({
            motoboy_id: motoboyId,
            order_id: orderId,
            lat: latitude,
            lng: longitude
        })

        // 2. Atualizar localização atual no perfil para tempo real
        const { error: profileError } = await supabase.from('profiles').update({
            last_lat: latitude,
            last_lng: longitude,
            last_location_update: new Date().toISOString()
        }).eq('id', motoboyId)

        if (profileError) console.error('Erro ao atualizar perfil:', profileError)

        // 2. Lógica de Geofencing (Exemplo simplicado)
        if (orderId) {
            // Buscar destino do pedido
            const { data: order } = await supabase
                .from('orders')
                .select('delivery_lat, delivery_lng, customer_id')
                .eq('id', orderId)
                .single()

            if (order?.delivery_lat && order?.delivery_lng) {
                // Cálculo de distância simples (Haversine ou similar)
                const dist = calculateDistance(latitude, longitude, order.delivery_lat, order.delivery_lng)

                // Se estiver a menos de 200 metros
                if (dist < 0.2) {
                    console.log(`Motoboy ${motoboyId} está próximo do destino do pedido ${orderId}`)
                    // Trigger de push notification (reutilizando a função send-push-notification internamente se necessário)
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

// Função auxiliar simples para distância (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371 // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}
