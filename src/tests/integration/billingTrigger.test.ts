import { describe, it, expect, vi, beforeEach } from 'vitest';

// Logic replication of trigger increment_billing_cycle_on_order_delivered (FIXED VERSION)
async function simulateBillingTrigger(NEW: any, OLD: any, mockSupabase: any) {
    // FIX APPLIED: Supporting both 'delivered' and 'entregue'
    const isNowDelivered = ['delivered', 'entregue'].includes(NEW.status);
    const wasNotDelivered = !OLD || !['delivered', 'entregue'].includes(OLD.status);

    if (isNowDelivered && wasNotDelivered) {
        const { data: cycle } = await mockSupabase.from('billing_cycles')
            .select('*')
            .eq('pharmacy_id', NEW.pharmacy_id)
            .eq('status', 'active')
            .maybeSingle();

        if (!cycle) return { triggered: false, reason: 'no_active_cycle' };

        await mockSupabase.from('billing_cycles')
            .update({ free_orders_used: (cycle.free_orders_used || 0) + 1 })
            .eq('id', cycle.id);

        return { triggered: true };
    }

    return { triggered: false };
}

describe('Integration: Billing Trigger Logic (Post-Fix)', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(),
            then: (resolve: any) => resolve({ data: null, error: null }),
        };
    });

    it('deve disparar para status "delivered"', async () => {
        const NEW = { status: 'delivered', pharmacy_id: 'ph_1' };
        mockSupabase.maybeSingle.mockResolvedValue({ data: { id: 'cyc_1', free_orders_used: 5 }, error: null });

        const result = await simulateBillingTrigger(NEW, null, mockSupabase);

        expect(result.triggered).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ free_orders_used: 6 }));
    });

    it('deve disparar para status "entregue" (pós-fix)', async () => {
        const NEW = { status: 'entregue', pharmacy_id: 'ph_1' };
        mockSupabase.maybeSingle.mockResolvedValue({ data: { id: 'cyc_1', free_orders_used: 10 }, error: null });

        const result = await simulateBillingTrigger(NEW, null, mockSupabase);

        expect(result.triggered).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ free_orders_used: 11 }));
    });
});
