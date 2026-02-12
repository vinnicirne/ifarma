
-- ==============================================================================
-- MIGRATION: BILLING SYSTEM & INVOICES (ASAAS READY)
-- Date: 2026-02-12
-- Goal: Create invoice structure and generation logic
-- ==============================================================================

-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.pharmacy_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id),
    
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    
    -- Payment / Asaas Fields
    payment_method TEXT, -- 'pix', 'boleto', 'credit_card'
    asaas_payment_id TEXT, -- ID no Asaas
    asaas_invoice_url TEXT, -- Link da fatura/boleto
    asaas_pix_qrcode TEXT, -- Payload QrCode Pix
    
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Invoices
ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage invoices" ON pharmacy_invoices;
CREATE POLICY "Admin manage invoices" ON pharmacy_invoices FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Pharmacy view own invoices" ON pharmacy_invoices;
CREATE POLICY "Pharmacy view own invoices" ON pharmacy_invoices FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_members WHERE user_id = auth.uid())
);

-- 2. Link Transactions to Invoices
-- (Already added in previous script, but ensuring FK here if needed, or making sure column exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_transactions' AND column_name = 'invoice_id') THEN
        ALTER TABLE public.pharmacy_transactions ADD COLUMN invoice_id UUID REFERENCES public.pharmacy_invoices(id);
    END IF;
END $$;


-- 3. FUNCTION: Generate Invoice (Aggregates unbilled transactions)
CREATE OR REPLACE FUNCTION public.generate_invoice(
    p_pharmacy_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_total_amount DECIMAL(10,2);
BEGIN
    -- 1. Calculate Total Amount of unbilled 'fee' transactions in range
    SELECT COALESCE(SUM(fee_amount), 0)
    INTO v_total_amount
    FROM public.pharmacy_transactions
    WHERE pharmacy_id = p_pharmacy_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND invoice_id IS NULL
      AND type = 'fee';

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'Nenhuma transação pendente para faturar neste período.';
    END IF;

    -- 2. Create Invoice Record
    INSERT INTO public.pharmacy_invoices (pharmacy_id, start_date, end_date, amount, status, due_date)
    VALUES (p_pharmacy_id, p_start_date, p_end_date, v_total_amount, 'pending', NOW() + INTERVAL '3 days')
    RETURNING id INTO v_invoice_id;

    -- 3. Update Transactions to link to this Invoice
    UPDATE public.pharmacy_transactions
    SET invoice_id = v_invoice_id
    WHERE pharmacy_id = p_pharmacy_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND invoice_id IS NULL
      AND type = 'fee';

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FUNCTION: Mark Invoice as Paid (Manual or via Webhook)
CREATE OR REPLACE FUNCTION public.mark_invoice_paid(p_invoice_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.pharmacy_invoices
    SET status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

