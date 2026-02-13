/**
 * EDGE FUNCTION: Asaas Webhook Handler
 * 
 * Endpoint: /functions/v1/asaas-webhook
 * Função: Recebe notificações do Asaas e atualiza status de faturas e assinaturas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

interface AsaasWebhookEvent {
    event: string;
    payment?: {
        id: string;
        customer: string;
        value: number;
        netValue: number;
        dueDate: string;
        paymentDate?: string;
        status: string;
        billingType: string;
        invoiceUrl?: string;
    };
    subscription?: {
        id: string;
        customer: string;
        value: number;
        nextDueDate: string;
        cycle: string;
        status: string;
    };
}

serve(async (req) => {
    try {
        // Verificar método
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verificar token do webhook (segurança)
        const webhookToken = req.headers.get('asaas-access-token');
        if (webhookToken !== ASAAS_WEBHOOK_TOKEN) {
            console.error('[asaas-webhook] Token inválido');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parsear evento
        const event: AsaasWebhookEvent = await req.json();
        console.log('[asaas-webhook] Evento recebido:', event.event);

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

        // Processar evento
        switch (event.event) {
            case 'PAYMENT_RECEIVED':
                await handlePaymentReceived(supabaseClient, event);
                break;

            case 'PAYMENT_OVERDUE':
                await handlePaymentOverdue(supabaseClient, event);
                break;

            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                await handlePaymentCanceled(supabaseClient, event);
                break;

            case 'PAYMENT_CONFIRMED':
                await handlePaymentConfirmed(supabaseClient, event);
                break;

            default:
                console.log(`[asaas-webhook] Evento não tratado: ${event.event}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[asaas-webhook] Erro ao processar webhook:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

/**
 * Pagamento recebido
 */
async function handlePaymentReceived(supabaseClient: any, event: AsaasWebhookEvent) {
    if (!event.payment) return;

    console.log(`[asaas-webhook] Pagamento recebido: ${event.payment.id}`);

    // Atualizar fatura
    const { data: invoice, error: updateError } = await supabaseClient
        .from('billing_invoices')
        .update({
            status: 'paid',
            paid_at: event.payment.paymentDate || new Date().toISOString(),
        })
        .eq('asaas_invoice_id', event.payment.id)
        .select()
        .single();

    if (updateError) {
        console.error(`[asaas-webhook] Erro ao atualizar fatura: ${updateError.message}`);
        return;
    }

    if (!invoice) {
        console.warn(`[asaas-webhook] Fatura não encontrada: ${event.payment.id}`);
        return;
    }

    // Se for mensalidade, atualizar status da assinatura
    if (invoice.invoice_type === 'monthly_fee') {
        await supabaseClient
            .from('pharmacy_subscriptions')
            .update({ status: 'active' })
            .eq('pharmacy_id', invoice.pharmacy_id)
            .eq('status', 'overdue');

        console.log(`[asaas-webhook] Assinatura reativada: ${invoice.pharmacy_id}`);
    }
}

/**
 * Pagamento vencido
 */
async function handlePaymentOverdue(supabaseClient: any, event: AsaasWebhookEvent) {
    if (!event.payment) return;

    console.log(`[asaas-webhook] Pagamento vencido: ${event.payment.id}`);

    // Atualizar fatura
    const { data: invoice, error: updateError } = await supabaseClient
        .from('billing_invoices')
        .update({ status: 'overdue' })
        .eq('asaas_invoice_id', event.payment.id)
        .select()
        .single();

    if (updateError) {
        console.error(`[asaas-webhook] Erro ao atualizar fatura: ${updateError.message}`);
        return;
    }

    if (!invoice) {
        console.warn(`[asaas-webhook] Fatura não encontrada: ${event.payment.id}`);
        return;
    }

    // Se for mensalidade, marcar assinatura como inadimplente
    if (invoice.invoice_type === 'monthly_fee') {
        await supabaseClient
            .from('pharmacy_subscriptions')
            .update({ status: 'overdue' })
            .eq('pharmacy_id', invoice.pharmacy_id);

        console.log(`[asaas-webhook] Assinatura marcada como inadimplente: ${invoice.pharmacy_id}`);
    }
}

/**
 * Pagamento cancelado/estornado
 */
async function handlePaymentCanceled(supabaseClient: any, event: AsaasWebhookEvent) {
    if (!event.payment) return;

    console.log(`[asaas-webhook] Pagamento cancelado: ${event.payment.id}`);

    // Atualizar fatura
    await supabaseClient
        .from('billing_invoices')
        .update({ status: 'canceled' })
        .eq('asaas_invoice_id', event.payment.id);
}

/**
 * Pagamento confirmado (antes de ser recebido)
 */
async function handlePaymentConfirmed(supabaseClient: any, event: AsaasWebhookEvent) {
    if (!event.payment) return;

    console.log(`[asaas-webhook] Pagamento confirmado: ${event.payment.id}`);

    // Atualizar fatura (ainda não pago, mas confirmado)
    await supabaseClient
        .from('billing_invoices')
        .update({ status: 'pending' })
        .eq('asaas_invoice_id', event.payment.id);
}
