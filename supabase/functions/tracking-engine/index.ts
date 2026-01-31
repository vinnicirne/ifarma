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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Configuração de ambiente ausente (SUPABASE_URL ou KEY)');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { motoboyId, latitude, longitude, orderId } = body;

        if (!motoboyId || !latitude || !longitude) {
            return new Response(JSON.stringify({ error: 'Motoboy ID e coordenadas são obrigatórios' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        console.log(`Recebido tracking para motoboy ${motoboyId} Lat: ${latitude} Lng: ${longitude}`);

        // 1. Atualizar localização atual e histórico
        const { error: historyError } = await supabase.from('location_history').insert({
            motoboy_id: motoboyId,
            order_id: orderId,
            latitude: latitude, // Fixed field name
            longitude: longitude, // Fixed field name
            accuracy: body.accuracy || 0
        });

        if (historyError) {
            console.error('Erro ao inserir histórico:', historyError);
        }

        // 2. Atualizar localização atual no perfil para tempo real
        const { error: profileError } = await supabase.from('profiles').update({
            last_lat: latitude,
            last_lng: longitude,
            last_online: new Date().toISOString() // Fixed: using last_online from schema
        }).eq('id', motoboyId);

        if (profileError) console.error('Erro ao atualizar perfil:', profileError);

        // 3. Lógica de Geofencing (Exemplo simplificado)
        if (orderId) {
            // Buscar destino do pedido
            const { data: order } = await supabase
                .from('orders')
                .select('delivery_lat, delivery_lng, customer_id')
                .eq('id', orderId)
                .single();

            if (order?.delivery_lat && order?.delivery_lng) {
                const dist = calculateDistance(latitude, longitude, order.delivery_lat, order.delivery_lng);

                // Se estiver a menos de 200 metros
                if (dist < 0.2) {
                    console.log(`Motoboy ${motoboyId} está próximo do destino do pedido ${orderId}`);
                    // Futuro: Trigger de push notification
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Erro interno na tracking-engine:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Internal Server Error
        });
    }
});

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
