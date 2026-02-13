/**
 * EDGE FUNCTION: Reset Billing Cycles
 * 
 * Execução: Cron diário (00:05 UTC)
 * Função: Cria novos ciclos de cobrança no início de cada mês
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    try {
        // Verificar autenticação (cron job ou admin)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Criar cliente Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        console.log('[reset-billing-cycles] Verificando se é dia 1º do mês...');

        // Verificar se hoje é dia 1º do mês
        const today = new Date();
        if (today.getDate() !== 1) {
            console.log('[reset-billing-cycles] Não é dia 1º, pulando execução');
            return new Response(JSON.stringify({ message: 'Não é dia 1º do mês' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('[reset-billing-cycles] Iniciando criação de novos ciclos...');

        // Calcular período do mês atual
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const periodStartStr = periodStart.toISOString().split('T')[0];
        const periodEndStr = periodEnd.toISOString().split('T')[0];

        // Buscar todas as farmácias com assinatura ativa
        const { data: activeSubscriptions, error: subscriptionsError } = await supabaseClient
            .from('pharmacy_subscriptions')
            .select('pharmacy_id')
            .eq('status', 'active');

        if (subscriptionsError) {
            throw new Error(`Erro ao buscar assinaturas: ${subscriptionsError.message}`);
        }

        console.log(`[reset-billing-cycles] Encontradas ${activeSubscriptions?.length || 0} assinaturas ativas`);

        const results = {
            total_subscriptions: activeSubscriptions?.length || 0,
            cycles_created: 0,
            errors: [] as string[],
        };

        // Criar ciclo para cada farmácia
        for (const subscription of activeSubscriptions || []) {
            try {
                // Verificar se já existe ciclo ativo para esta farmácia
                const { data: existingCycle } = await supabaseClient
                    .from('billing_cycles')
                    .select('id')
                    .eq('pharmacy_id', subscription.pharmacy_id)
                    .eq('status', 'active')
                    .single();

                if (existingCycle) {
                    console.log(`[reset-billing-cycles] Ciclo já existe para farmácia ${subscription.pharmacy_id}`);
                    continue;
                }

                // Criar novo ciclo
                const { error: insertError } = await supabaseClient
                    .from('billing_cycles')
                    .insert({
                        pharmacy_id: subscription.pharmacy_id,
                        period_start: periodStartStr,
                        period_end: periodEndStr,
                        free_orders_used: 0,
                        overage_orders: 0,
                        overage_amount_cents: 0,
                        status: 'active',
                    });

                if (insertError) {
                    throw new Error(`Erro ao criar ciclo: ${insertError.message}`);
                }

                console.log(`[reset-billing-cycles] Ciclo criado para farmácia ${subscription.pharmacy_id}`);
                results.cycles_created++;

            } catch (error) {
                const errorMsg = `Erro ao processar farmácia ${subscription.pharmacy_id}: ${error.message}`;
                console.error(`[reset-billing-cycles] ${errorMsg}`);
                results.errors.push(errorMsg);
            }
        }

        console.log('[reset-billing-cycles] Reset concluído:', results);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[reset-billing-cycles] Erro fatal:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
