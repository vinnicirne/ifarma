-- check_subs_debug.sql
-- 1. Check schema of pharmacy_subscriptions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacy_subscriptions';

-- 2. Check definition of can_manage_billing
SELECT pg_get_functiondef('public.can_manage_billing'::regproc);
