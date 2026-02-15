-- ============================================================================
-- MIGRATION: Billing RBAC (FINAL - using pharmacy_members)
-- Compatible with profiles.role = admin/merchant/staff/motoboy/etc.
-- ============================================================================

begin;

-- 1) Ensure helpers exist (do NOT restrict profiles.role values!)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.can_manage_billing(p_pharmacy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.pharmacies ph
      where ph.id = p_pharmacy_id
        and ph.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.pharmacy_members pm
      where pm.pharmacy_id = p_pharmacy_id
        and pm.user_id = auth.uid()
        and pm.role in ('billing','manager')
    );
$$;

-- 2) RLS (only if you use RLS on these tables)
alter table if exists public.pharmacy_members enable row level security;

drop policy if exists "members_read_self_owner_admin" on public.pharmacy_members;
create policy "members_read_self_owner_admin"
on public.pharmacy_members
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.pharmacies ph
    where ph.id = pharmacy_id and ph.owner_id = auth.uid()
  )
);

drop policy if exists "members_write_owner_admin" on public.pharmacy_members;
create policy "members_write_owner_admin"
on public.pharmacy_members
for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.pharmacies ph
    where ph.id = pharmacy_id and ph.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.pharmacies ph
    where ph.id = pharmacy_id and ph.owner_id = auth.uid()
  )
);

alter table if exists public.pharmacy_subscriptions enable row level security;

drop policy if exists "subs_read_billing_access" on public.pharmacy_subscriptions;
create policy "subs_read_billing_access"
on public.pharmacy_subscriptions
for select
to authenticated
using (public.can_manage_billing(pharmacy_id));

drop policy if exists "subs_write_billing_access" on public.pharmacy_subscriptions;
create policy "subs_write_billing_access"
on public.pharmacy_subscriptions
for all
to authenticated
using (public.can_manage_billing(pharmacy_id))
with check (public.can_manage_billing(pharmacy_id));

-- 3) Cleanup duplicate active/pending subscriptions (keep newest per pharmacy)
update public.pharmacy_subscriptions ps
set status = 'canceled',
    ended_at = now(),
    canceled_at = coalesce(ps.canceled_at, now())
where ps.id in (
  select id from (
    select id,
           row_number() over (
             partition by pharmacy_id
             order by created_at desc
           ) as rn
    from public.pharmacy_subscriptions
    where status in ('active','pending_asaas')
  ) t
  where t.rn > 1
);

-- 4) Unique partial index: only one active/pending per pharmacy
drop index if exists uniq_active_sub_per_pharmacy;

create unique index if not exists uniq_active_sub_per_pharmacy
on public.pharmacy_subscriptions (pharmacy_id)
where status in ('active','pending_asaas');

commit;
