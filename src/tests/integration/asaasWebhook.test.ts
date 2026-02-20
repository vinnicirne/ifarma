import { describe, it, expect, vi, beforeEach } from 'vitest';

// Logic replication of asaas-webhook
async function simulateAsaasWebhook(payload: any, mockSupabaseAdmin: any) {
    const event = payload?.event;
    const payment = payload?.payment;
    const paymentId = payment?.id;
    const paymentStatus = payment?.status;

    if (!paymentId) return { ok: true, ignored: "missing payment.id" };

    const paid = event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED" ||
        paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED";

    if (!paid) {
        if (event === 'PAYMENT_OVERDUE') {
            await mockSupabaseAdmin.from('billing_invoices').update({ status: 'overdue' }).eq('asaas_invoice_id', paymentId);
        }
        return { ok: true, ignored: "not a paid event" };
    }

    // 1. Tentar achar a invoice
    const { data: invoice } = await mockSupabaseAdmin.from("billing_invoices").select("*").eq("asaas_invoice_id", paymentId).maybeSingle();

    if (!invoice) {
        const extRef = payment.externalReference || '';
        const parts = extRef.split(':');
        if (parts.length >= 3) {
            const pharmacy_id = parts[0];
            const due_date = parts[1];

            const { data: newInv } = await mockSupabaseAdmin.from("billing_invoices").upsert({
                pharmacy_id,
                invoice_type: "monthly_fee",
                asaas_invoice_id: paymentId,
                status: "paid",
            }).select().single();

            if (newInv) {
                // Activation logic for self-healing
                await mockSupabaseAdmin.from("pharmacy_subscriptions").update({ status: 'active' }).eq("pharmacy_id", pharmacy_id);
                return { ok: true, healed: true };
            }
        }
        return { ok: true, warning: "not found" };
    }

    // 2. Atualiza invoice
    await mockSupabaseAdmin.from("billing_invoices").update({ status: "paid" }).eq("id", invoice.id);

    // 3. Ativa subscription
    if (invoice.invoice_type === "monthly_fee") {
        const { data: sub } = await mockSupabaseAdmin.from("pharmacy_subscriptions").select("*").eq("pharmacy_id", invoice.pharmacy_id).maybeSingle();

        if (sub && sub.status !== "active") {
            await mockSupabaseAdmin.from("pharmacy_subscriptions").update({ status: "active" }).eq("id", sub.id);

            // 4. Create Rolling Cycle
            await mockSupabaseAdmin.from('billing_cycles').upsert({
                pharmacy_id: invoice.pharmacy_id,
                status: 'active',
            });
        }
    }

    return { ok: true };
}

describe('Integration: Asaas Webhook Logic', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Define a chainable mock structure
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            // Make the mock itself thenable to satisfy await on update/eq chain
            then: (resolve: any) => resolve({ data: null, error: null }),
        };
    });

    it('deve confirmar pagamento e ativar assinatura (Happy Path)', async () => {
        const payload = {
            event: 'PAYMENT_CONFIRMED',
            payment: { id: 'pay_123', status: 'CONFIRMED' }
        };

        mockSupabase.maybeSingle
            .mockResolvedValueOnce({ data: { id: 'inv_1', pharmacy_id: 'ph_1', invoice_type: 'monthly_fee' }, error: null }) // Invoice call
            .mockResolvedValueOnce({ data: { id: 'sub_1', status: 'pending' }, error: null }); // Subscription call

        const result = await simulateAsaasWebhook(payload, mockSupabase);

        expect(result.ok).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
        expect(mockSupabase.from).toHaveBeenCalledWith('billing_cycles');
    });

    it('deve realizar self-healing quando a invoice não existe mas o externalReference é válido', async () => {
        const payload = {
            event: 'PAYMENT_RECEIVED',
            payment: {
                id: 'pay_hidden',
                status: 'RECEIVED',
                externalReference: '5c0e482b-650a-4a25-83e9-74d61849f1db:2026-03-01:monthly_fee'
            }
        };

        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // Invoice not found
        mockSupabase.single.mockResolvedValue({ data: { id: 'inv_new' }, error: null }); // New invoice created

        const result = await simulateAsaasWebhook(payload, mockSupabase);

        expect(result.ok).toBe(true);
        expect(result.healed).toBe(true);
        expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
            pharmacy_id: '5c0e482b-650a-4a25-83e9-74d61849f1db',
            status: 'paid'
        }));
    });

    it('deve lidar com faturas atrasadas (PAYMENT_OVERDUE)', async () => {
        const payload = {
            event: 'PAYMENT_OVERDUE',
            payment: { id: 'pay_late' }
        };

        const result = await simulateAsaasWebhook(payload, mockSupabase);

        expect(result.ok).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'overdue' });
    });
});
