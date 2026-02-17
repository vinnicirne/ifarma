-- FIX_ORDER_SCHEMA_FULL.sql
-- Fix Checkout Error by aligning Orders table with Frontend expectations.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_notes text,
ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_for numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Optionally, we could copy data if needed/migration, but this is for new orders.
-- Also ensure status is valid
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'pendente';

SELECT 'Orders table updated with customer_notes, delivery_fee, change_for, lat/lng columns.' as result;
