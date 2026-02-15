-- ============================================================================
-- FIX: Add missing columns and relax constraints for Pharmacies
-- ============================================================================

begin;

-- 1. ADD MISSING COLUMNS (Fixes 42703 undefined_column)
alter table public.pharmacies
    add column if not exists is_open boolean default false,
    add column if not exists auto_open_status boolean default false,
    add column if not exists opening_hours_start time,
    add column if not exists opening_hours_end time,
    add column if not exists opening_hours jsonb; -- Ensure this exists for sophisticated schedules

-- 2. RELAX PLAN CONSTRAINT (Fixes potential value mismatch)
-- Drop existing check if it exists to replace or allow all values
alter table public.pharmacies drop constraint if exists pharmacies_plan_check;

-- Add new constraint allowing legacy and new values
alter table public.pharmacies add constraint pharmacies_plan_check 
    check (plan in ('admin', 'basic', 'pro', 'premium', 'enterprise', 'FREE', 'PROFESSIONAL', 'PREMIUM'));

-- 3. RELAX STATUS CONSTRAINT (Fixes 'Aprovado' vs 'approved')
alter table public.pharmacies drop constraint if exists pharmacies_status_check;

-- Add new constraint allowing all variations
alter table public.pharmacies add constraint pharmacies_status_check 
    check (status in ('pending', 'approved', 'rejected', 'suspended', 'Aprovado', 'Pendente', 'Rejeitado', 'Suspenso'));

commit;
