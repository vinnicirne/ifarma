import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Método não permitido' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
        });
    }

    try {
        // 1. Configuração do ambiente
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Configuração de ambiente ausente');
            return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        // Client com service role (para bypass RLS em updates/inserts)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 2. Extrair e validar token do header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Authorization header ausente ou inválido' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // 3. Validar token e pegar o usuário autenticado
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error('Token inválido ou expirado:', authError?.message);
            return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // 4. Parsear body
        const body = await req.json().catch(() => ({}));
        const { motoboyId, latitude, longitude, orderId, batteryLevel, isCharging } = body;

        if (!motoboyId || !latitude || !longitude) {
            return new Response(JSON.stringify({ error: 'Motoboy ID e coordenadas são obrigatórios' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // 5. Segurança crítica: o token deve pertencer ao motoboy que está enviando a localização
        if (user.id !== motoboyId) {
            console.error('Tentativa de tracking não autorizada', {
                tokenUserId: user.id,
                requestedMotoboyId: motoboyId,
            });
            return new Response(JSON.stringify({ error: 'Acesso negado: Token não corresponde ao ID do motoboy' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        console.log(`📡 Tracking recebido para motoboy ${motoboyId} | Lat: ${latitude} Lng: ${longitude} | Order: ${orderId || 'N/A'}`);

        // 6. Atualizar perfil do motoboy (última localização, bateria, etc.)
        const profileUpdate: any = {
            last_lat: latitude,
            last_lng: longitude,
            updated_at: new Date().toISOString(),
        };

        if (batteryLevel !== undefined) profileUpdate.battery_level = batteryLevel;
        if (isCharging !== undefined) profileUpdate.is_charging = isCharging;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', motoboyId);

        if (profileError) {
            console.error('Erro ao atualizar perfil do motoboy:', profileError);
            // Continua mesmo com erro (não bloqueia tracking)
        }

        // 7. Inserir no histórico de rota (usando service role para bypass RLS)
        const historyPayload = {
            motoboy_id: motoboyId,
            order_id: orderId || null,
            latitude,
            longitude,
        };

        const { error: historyError } = await supabaseAdmin
            .from('route_history')
            .insert(historyPayload);

        if (historyError) {
            console.error('Erro ao inserir histórico de rota:', historyError);
            // Continua (não bloqueia resposta)
        }

        // 8. (Opcional) Geofencing / Notificação de chegada
        if (orderId) {
            const { data: order, error: orderError } = await supabaseAdmin
                .from('orders')
                .select('delivery_lat, delivery_lng, status')
                .eq('id', orderId)
                .single();

            if (!orderError && order?.delivery_lat && order?.delivery_lng && order.status !== 'entregue') {
                const distanceKm = calculateDistance(
                    latitude,
                    longitude,
                    Number(order.delivery_lat),
                    Number(order.delivery_lng)
                );

                if (distanceKm < 0.2) { // 200 metros
                    console.log(`Motoboy ${motoboyId} está a ${distanceKm.toFixed(2)}km do destino do pedido ${orderId}`);
                    // Futuro: disparar notificação para cliente via webhook ou Realtime
                }
            }
        }

        // 9. Resposta de sucesso
        return new Response(JSON.stringify({ success: true, message: 'Localização registrada' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('❌ Erro crítico no tracking-engine:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor', details: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
}
