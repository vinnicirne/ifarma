import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Configuração de ambiente ausente');
            return new Response(JSON.stringify({ error: 'Faltam chaves de ambiente no servidor' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { motoboyId, latitude, longitude, orderId, batteryLevel, isCharging } = body;

        if (!motoboyId || !latitude || !longitude) {
            return new Response(JSON.stringify({ error: 'Motoboy ID e coordenadas são obrigatórios' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // VERIFICAÇÃO DE SEGURANÇA: Validar se o token pertence ao motoboyId informado
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user || user.id !== motoboyId) {
            console.error('❌ Tentativa de tracking não autorizada:', { userId: user?.id, motoboyId });
            return new Response(JSON.stringify({ error: 'Acesso negado: Token não corresponde ao ID do motoboy' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        console.log(`📡 Tracking for motoboy ${motoboyId} Lat: ${latitude} Lng: ${longitude}`);

        // 1. Atualizar localização atual no perfil e telemetria
        const updatePayload: any = {
            last_lat: latitude,
            last_lng: longitude,
            updated_at: new Date().toISOString()
        };

        if (batteryLevel !== undefined) updatePayload.battery_level = batteryLevel;
        if (isCharging !== undefined) updatePayload.is_charging = isCharging;

        const { error: profileError } = await supabase.from('profiles').update(updatePayload).eq('id', motoboyId);
        if (profileError) console.error('Erro ao atualizar perfil:', profileError);

        // 2. Inserir no histórico de rota
        const { error: historyError } = await supabase.from('route_history').insert({
            motoboy_id: motoboyId,
            order_id: orderId || null,
            latitude: latitude,
            longitude: longitude
        });

        if (historyError) {
            console.error('Erro ao inserir histórico de rota:', historyError);
        }

        // 3. Lógica de Geofencing (Notificação opcional se estiver chegando)
        if (orderId) {
            const { data: order } = await supabase
                .from('orders')
                .select('delivery_lat, delivery_lng')
                .eq('id', orderId)
                .maybeSingle();

            if (order?.delivery_lat && order?.delivery_lng) {
                const dist = calculateDistance(latitude, longitude, Number(order.delivery_lat), Number(order.delivery_lng));
                if (dist < 0.2) { // 200m
                    // Trigger opcional (futuro): notifyClientArriving(orderId);
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('❌ Erro interno no tracking-engine:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
