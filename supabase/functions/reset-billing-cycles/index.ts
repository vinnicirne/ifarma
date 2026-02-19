/**
 * EDGE FUNCTION: Reset Billing Cycles (DEPRECATED)
 * 
 * Motivo: Os ciclos agora são rolantes (30 dias) e criados sob demanda no pagamento 
 * ou automaticamente ao fechar o ciclo anterior.
 * 
 * Recomendação: Desativar este cron job no dashboard do Supabase.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
    return new Response(JSON.stringify({
        message: 'Função depreciada. Ciclos agora são criados via Rolling Window (30 dias) no pagamento ou fechamento.',
        status: 'inactive'
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
