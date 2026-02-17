-- FIX_CHECKOUT_DELIVERY.sql
-- 1. Fix CHECKOUT Error: Add 'complement' to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS complement text;

-- 2. Fix DELIVERY CONFIG: Add delivery time range to pharmacies
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS delivery_time_min integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS delivery_time_max integer DEFAULT 30;

-- 3. Refresh schema cache (Implicit in Supabase/PostgREST usually, but good to know)
NOTIFY pgrst, 'reload schema';

SELECT 'Columns added: orders.complement, pharmacies.delivery_time_min/max' as result;
