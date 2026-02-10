import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 0. Handle CORS preflight requests immediately
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Log request content-type/method for debugging
        console.log(`[whatsapp-notifier] Received ${req.method} request`);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('IFARMA_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Webhook do Supabase envia o corpo do registro inserido
        // We wrap json parsing in its own try/catch if needed, but the main one handles it.
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('[whatsapp-notifier] Error parsing JSON:', e);
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const { record } = body;

        if (!record || !record.id) {
            console.warn('[whatsapp-notifier] No record found in body');
            return new Response(JSON.stringify({ error: 'No record found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        console.log(`Prazamento WhatsApp para Pedido: ${record.id}`)

        // 1. Buscar configurações de WhatsApp
        const { data: settings, error: settingsError } = await supabaseClient
            .from('system_settings')
            .select('*')
            .in('key', ['whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_instance_id']);

        if (settingsError) {
            throw new Error(`Settings DB Error: ${settingsError.message}`);
        }

        const config: any = {};
        settings?.forEach(s => config[s.key] = s.value);

        if (!config.whatsapp_api_url || !config.whatsapp_api_key) {
            console.warn('Configurações de WhatsApp incompletas. Abortando.');
            // Return 200 to avoid retries if it's a configuration issue (optional)
            return new Response(JSON.stringify({ message: 'Settings incomplete' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 2. Buscar dados da Farmácia para obter o telefone
        let pharmacy: any = null;
        if (record.id === 'test-id') {
            // Modo Teste: Tenta pegar a primeira farmácia cadastrada ou usa um padrão
            const { data: firstPharmacy } = await supabaseClient
                .from('pharmacies')
                .select('name, phone')
                .limit(1)
                .single();

            pharmacy = firstPharmacy || { name: 'Farmácia de Teste', phone: '5511999999999' };
        } else {
            const { data: realPharmacy, error: pharmacyError } = await supabaseClient
                .from('pharmacies')
                .select('name, phone')
                .eq('id', record.pharmacy_id)
                .single();

            if (pharmacyError) {
                console.error('Error fetching pharmacy:', pharmacyError);
                // Don't fail completely, maybe log?
            }
            pharmacy = realPharmacy;
        }

        if (!pharmacy || !pharmacy.phone) {
            console.warn('Dados de destino não identificados.');
            return new Response(JSON.stringify({ message: 'Target phone missing' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // 3. Formatar Mensagem
        const message = `🚀 *NOVO PEDIDO NO IFARMA!*\n\nOlá *${pharmacy.name}*, você acabou de receber um novo pedido.\n\n💰 *Valor:* R$ ${record.total_price}\n👤 *Cliente:* ${record.customer_name || 'Não identificado'}\n📍 *Endereço:* ${record.address}\n\n👉 Acesse o painel para atender: https://ifarma-app.vercel.app/gestor/orders`;

        // 4. Disparar para a API (Ex: Evolution API ou Z-API)
        const cleanPhone = pharmacy.phone.replace(/\D/g, '');
        const targetPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Remover barra final da URL se existir para evitar //message
        const baseUrl = config.whatsapp_api_url.replace(/\/$/, '');

        // Verificar se é Z-API ou Evolution (Assume Evolution based on code)
        // Adjust endpoint based on likely URL structure if needed, keeping mostly as is.
        const apiUrl = `${baseUrl}/message/sendText/${config.whatsapp_instance_id}`;

        console.log(`Sending to: ${apiUrl} for phone ${targetPhone}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.whatsapp_api_key,
                // Some APIs expect Authorization header instead
                // 'Authorization': `Bearer ${config.whatsapp_api_key}` 
            },
            body: JSON.stringify({
                number: targetPhone,
                text: message,
                // options: { delay: 1200, presence: 'composing' } // Optional Evolution API features
            })
        });

        let responseData;
        const responseText = await response.text();
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        if (!response.ok) {
            console.error('Erro ao enviar WhatsApp. Status:', response.status, 'Response:', responseText);
            // We return 500 here explicitly but WITH headers
            return new Response(JSON.stringify({ error: `WhatsApp API Error: ${responseText}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            });
        }

        console.log(`WhatsApp enviado com sucesso para ${targetPhone}`, responseData);

        return new Response(JSON.stringify({ success: true, data: responseData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('CRITICAL Error in whatsapp-notifier:', error)
        return new Response(JSON.stringify({ error: error.message || 'Unknown internal error', stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Return 500 but WITH CORS HEADERS
        })
    }
})
