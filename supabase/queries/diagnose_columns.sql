-- ============================================================================
-- DIAGNOSTIC: Verify Schema & Data
-- ============================================================================

-- 1) Check if 'asaas_customer_id' exists in 'pharmacy_subscriptions'
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pharmacy_subscriptions'
order by ordinal_position;

-- 2) Check recent subscriptions to see if inserts are working
select
  s.id,
  s.pharmacy_id,
  p.name as pharmacy_name,
  s.plan_id,
  s.status,
  s.created_at,
  s.asaas_customer_id,
  s.asaas_subscription_id
from pharmacy_subscriptions s
join pharmacies p on p.id = s.pharmacy_id
order by s.created_at desc
limit 10;
