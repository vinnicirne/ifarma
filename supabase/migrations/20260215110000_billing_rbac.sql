-- =========================
-- IFARMA - BILLING ACCESS PACK
-- Admin Global + Owner + Staff (billing/manager)
-- =========================

begin;

-- 1) PROFILES role (se já existe, ignora)
-- Esperado: public.profiles(id uuid pk references auth.users, role text)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text CHECK (role IN ('admin', 'user')) DEFAULT 'user';
    END IF;
END $$;

create index if not exists idx_profiles_role on public.profiles(role);

-- 2) PHARMACY_STAFF (se não existe)
create table if not exists public.pharmacy_staff (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('billing','manager','staff')),
  created_at timestamptz not null default now(),
  unique (pharmacy_id, user_id)
);

create index if not exists idx_pharmacy_staff_pharmacy on public.pharmacy_staff(pharmacy_id);
create index if not exists idx_pharmacy_staff_user on public.pharmacy_staff(user_id);

-- 3) Helper function: is_admin (SECURITY DEFINER)
-- Obs: usa profiles.role='admin'
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- 4) Helper function: can_manage_billing(pharmacy_id)
-- Regra: admin OR owner OR staff(role in billing/manager)
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
      select 1 from public.pharmacies ph
      where ph.id = p_pharmacy_id
        and ph.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.pharmacy_staff ps
      where ps.pharmacy_id = p_pharmacy_id
        and ps.user_id = auth.uid()
        and ps.role in ('billing','manager')
    );
$$;

-- 5) RLS policies (pharmacy_staff)
alter table public.pharmacy_staff enable row level security;

drop policy if exists "staff_read_own_or_admin" on public.pharmacy_staff;
create policy "staff_read_own_or_admin"
on public.pharmacy_staff
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

-- Somente admin ou owner pode inserir/remover staff
drop policy if exists "staff_insert_admin_or_owner" on public.pharmacy_staff;
create policy "staff_insert_admin_or_owner"
on public.pharmacy_staff
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.pharmacies ph
    where ph.id = pharmacy_id and ph.owner_id = auth.uid()
  )
);

drop policy if exists "staff_update_admin_or_owner" on public.pharmacy_staff;
create policy "staff_update_admin_or_owner"
on public.pharmacy_staff
for update
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

drop policy if exists "staff_delete_admin_or_owner" on public.pharmacy_staff;
create policy "staff_delete_admin_or_owner"
on public.pharmacy_staff
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.pharmacies ph
    where ph.id = pharmacy_id and ph.owner_id = auth.uid()
  )
);

-- 6) Optional: RLS on pharmacy_subscriptions (recomendado)
-- Se você já tem RLS, adapte. Se não usa RLS aqui, pode ignorar.
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

commit;
