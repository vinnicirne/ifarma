
-- ==============================================================================
-- MIGRATION: FINANCIAL MODULE AUTOMATION & MVP SETTINGS
-- Date: 2026-02-12
-- Goal: Automate fee calculation and manage free orders (MVP)
-- ==============================================================================

-- 1. Create System Setting for Global MVP Free Orders
INSERT INTO public.system_settings (key, value, description)
VALUES ('mvp_free_orders_limit', '30', 'Quantidade global de pedidos grátis para novas farmácias (MVP)')
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure Pharmacy Fees Table Exists (Idempotent)
CREATE TABLE IF NOT EXISTS public.pharmacy_fees (
    pharmacy_id UUID PRIMARY KEY REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    charge_per_order BOOLEAN DEFAULT false,
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    charge_percentage BOOLEAN DEFAULT false,
    percentage_fee DECIMAL(10,2) DEFAULT 0,
    free_orders_initial INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure Pharmacy Transactions Table Exists (Idempotent)
CREATE TABLE IF NOT EXISTS public.pharmacy_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES public.pharmacies(id),
    order_id UUID REFERENCES public.orders(id),
    order_value DECIMAL(10,2) DEFAULT 0,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    type TEXT, -- 'free', 'fee', 'subscription'
    description TEXT,
    invoice_id UUID, -- Will be linked later
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Financial Tables
ALTER TABLE public.pharmacy_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_transactions ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for quick deployment, refine as needed)
DROP POLICY IF EXISTS "Admin manage fees" ON pharmacy_fees;
CREATE POLICY "Admin manage fees" ON pharmacy_fees FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Pharmacy view own fees" ON pharmacy_fees;
CREATE POLICY "Pharmacy view own fees" ON pharmacy_fees FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admin view transactions" ON pharmacy_transactions;
CREATE POLICY "Admin view transactions" ON pharmacy_transactions FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Pharmacy view own transactions" ON pharmacy_transactions;
CREATE POLICY "Pharmacy view own transactions" ON pharmacy_transactions FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_members WHERE user_id = auth.uid())
);

-- 4. FUNCTION: Process Order Finance (The Brain)
CREATE OR REPLACE FUNCTION public.process_order_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_pharmacy_id UUID;
    v_order_value DECIMAL(10,2);
    v_fee_amount DECIMAL(10,2) := 0;
    v_free_remaining INTEGER;
    v_has_fees BOOLEAN;
    v_fixed_fee DECIMAL(10,2);
    v_percent_fee DECIMAL(10,2);
    v_mvp_limit INTEGER;
BEGIN
    -- Only process if status changed to 'delivered' (entregue)
    IF NEW.status = 'entregue' AND (OLD.status IS DISTINCT FROM 'entregue') THEN
        
        v_pharmacy_id := NEW.pharmacy_id;
        v_order_value := NEW.total_price;

        -- Get current free orders remaining
        SELECT free_orders_remaining INTO v_free_remaining
        FROM public.pharmacies
        WHERE id = v_pharmacy_id;

        -- Logic 1: Free Orders Available?
        IF v_free_remaining > 0 THEN
            -- Deduct 1 from free orders
            UPDATE public.pharmacies
            SET free_orders_remaining = free_orders_remaining - 1
            WHERE id = v_pharmacy_id;

            -- Log 'free' transaction
            INSERT INTO public.pharmacy_transactions (pharmacy_id, order_id, order_value, fee_amount, type, description)
            VALUES (v_pharmacy_id, NEW.id, v_order_value, 0, 'free', 'Pedido gratuito (MVP/Bônus)');
            
            RETURN NEW;
        END IF;

        -- Logic 2: Calculate Fees (If no free orders left)
        -- Fetch Fee Rules (Try Pharmacy Specific first)
        SELECT 
            charge_per_order, fixed_fee, charge_percentage, percentage_fee
        INTO 
            v_has_fees, v_fixed_fee, v_has_fees, v_percent_fee -- re-using v_has_fees just for select structure, logic below
        FROM public.pharmacy_fees
        WHERE pharmacy_id = v_pharmacy_id AND active = true;

        -- If no specific rules found, or inactive, load Global Defaults (Optional, but good for MVP)
        IF NOT FOUND THEN
             -- For now, let's assume if no rule exists, it's 0 fee (or we could fetch from system_settings)
             v_fixed_fee := 0;
             v_percent_fee := 0;
        ELSE
             -- Calculate Fee
             IF v_fixed_fee IS NULL THEN v_fixed_fee := 0; END IF;
             IF v_percent_fee IS NULL THEN v_percent_fee := 0; END IF;
             
             v_fee_amount := v_fixed_fee + (v_order_value * (v_percent_fee / 100));
        END IF;

        -- Insert 'fee' transaction
        INSERT INTO public.pharmacy_transactions (pharmacy_id, order_id, order_value, fee_amount, type, description)
        VALUES (v_pharmacy_id, NEW.id, v_order_value, v_fee_amount, 'fee', 'Taxa de serviço');

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER: Bind Function to Orders
DROP TRIGGER IF EXISTS tr_order_finance ON public.orders;
CREATE TRIGGER tr_order_finance
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.process_order_finance();

-- 6. Helper: Initialize Free Orders for New Pharmacies (using MVP setting)
CREATE OR REPLACE FUNCTION public.init_pharmacy_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_mvp_limit INTEGER;
BEGIN
    -- Fetch Global Limit
    SELECT COALESCE(value::INTEGER, 30) INTO v_mvp_limit
    FROM public.system_settings
    WHERE key = 'mvp_free_orders_limit';

    -- Update the new pharmacy with this limit
    UPDATE public.pharmacies
    SET free_orders_remaining = v_mvp_limit
    WHERE id = NEW.id;

    -- Create empty fee record
    INSERT INTO public.pharmacy_fees (pharmacy_id, free_orders_initial)
    VALUES (NEW.id, v_mvp_limit)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind to Pharmacy Creation
DROP TRIGGER IF EXISTS tr_init_pharmacy_finance ON public.pharmacies;
CREATE TRIGGER tr_init_pharmacy_finance
    AFTER INSERT ON public.pharmacies
    FOR EACH ROW
    EXECUTE FUNCTION public.init_pharmacy_finance();

