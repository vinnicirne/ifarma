// ============================================================================
// EDGE FUNCTION: billing-asaas-webhook
// Recebe notificações de pagamento do Asaas e atualiza status das faturas
// URL: https://<project>.supabase.co/functions/v1/billing-asaas-webhook
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

interface AsaasWebhookPayload {
    event: string; // PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
    payment: {
        id: string;
        customer: string;
        value: number;
        status: string; // PENDING, RECEIVED, CONFIRMED, OVERDUE
        dueDate: string;
        paymentDate?: string;
    };
}

Deno.serve(async (req) => {
    try {
        // 1. Validar token (opcional, mas recomendado)
        const authHeader = req.headers.get('asaas-access-token');
        if (ASAAS_WEBHOOK_TOKEN && authHeader !== ASAAS_WEBHOOK_TOKEN) {
            console.warn('⚠️ Token inválido');
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 2. Parse payload
        const payload: AsaasWebhookPayload = await req.json();
        console.log(`📥 Webhook recebido: ${payload.event} - Payment ${payload.payment.id}`);

        // 3. Criar cliente Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 4. Buscar fatura pelo asaas_invoice_id
        const { data: invoice, error: invoiceError } = await supabase
            .from('billing_invoices')
            .select('*')
            .eq('asaas_invoice_id', payload.payment.id)
            .single();

        if (invoiceError || !invoice) {
            console.warn(`⚠️ Fatura não encontrada: ${payload.payment.id}`);
            return new Response(
                JSON.stringify({ message: 'Invoice not found', received: true }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`📄 Fatura encontrada: ${invoice.id} (${invoice.invoice_type})`);

        // 5. Mapear status do Asaas para status interno
        let newStatus = 'pending';
        let paidAt: string | null = null;

        switch (payload.event) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                newStatus = 'paid';
                paidAt = payload.payment.paymentDate || new Date().toISOString();
                break;
            case 'PAYMENT_OVERDUE':
                newStatus = 'overdue';
                break;
            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                newStatus = 'canceled';
                break;
            default:
                console.log(`ℹ️ Evento não mapeado: ${payload.event}`);
        }

        // 6. Atualizar fatura
        const { error: updateError } = await supabase
            .from('billing_invoices')
            .update({
                status: newStatus,
                paid_at: paidAt,
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

        if (updateError) throw updateError;

        console.log(`✅ Fatura ${invoice.id} atualizada: ${newStatus}`);

        // 7. Se foi pago, atualizar status da assinatura (se estava overdue)
        if (newStatus === 'paid') {
            const { error: subError } = await supabase
                .from('pharmacy_subscriptions')
                .update({ status: 'active' })
                .eq('pharmacy_id', invoice.pharmacy_id)
                .eq('status', 'overdue');

            if (subError) {
                console.warn(`⚠️ Erro ao atualizar assinatura:`, subError);
            } else {
                console.log(`✅ Assinatura reativada para farmácia ${invoice.pharmacy_id}`);
            }
        }

        // 8. Se está overdue, atualizar status da assinatura
        if (newStatus === 'overdue') {
            const { error: subError } = await supabase
                .from('pharmacy_subscriptions')
                .update({ status: 'overdue' })
                .eq('pharmacy_id', invoice.pharmacy_id)
                .eq('status', 'active');

            if (subError) {
                console.warn(`⚠️ Erro ao atualizar assinatura:`, subError);
            } else {
                console.log(`⚠️ Assinatura marcada como overdue para farmácia ${invoice.pharmacy_id}`);
            }
        }

        // 9. TODO: Enviar notificação para a farmácia
        // await sendNotification(invoice.pharmacy_id, { ... });

        return new Response(
            JSON.stringify({
                message: 'Webhook processed successfully',
                invoice_id: invoice.id,
                new_status: newStatus,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Erro ao processar webhook:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
