-- ============================================================================
-- DIAGNOSTIC & RECOVERY: Billing Duplicates
-- ============================================================================

-- 1) DIAGNOSTIC: Check for pharmacies with > 1 active subscription
select
  pharmacy_id,
  count(*) as active_subscriptions
from pharmacy_subscriptions
where status = 'active'
group by pharmacy_id
having count(*) > 1
order by active_subscriptions desc;

-- 2) RECOVERY: Clean up duplicates (keep only the most recent one active)
with ranked as (
  select
    id,
    pharmacy_id,
    row_number() over (
      partition by pharmacy_id
      order by started_at desc nulls last, created_at desc
    ) as rn
  from pharmacy_subscriptions
  where status = 'active'
)
update pharmacy_subscriptions s
set status = 'canceled',
    ended_at = now()
from ranked r
where s.id = r.id
  and r.rn > 1;

-- 3) PREVENTION: Ensure unique constraint exists
create unique index if not exists uniq_active_subscription_per_pharmacy
on pharmacy_subscriptions (pharmacy_id)
where status = 'active';
