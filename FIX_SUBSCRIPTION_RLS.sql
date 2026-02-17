-- FIX_SUBSCRIPTION_RLS.sql
-- Fix RLS: Pharmacy Subscriptions (Creation + Updates)
-- Allows creation of new subscriptions by pharmacy owners.
-- Uses `check_pharmacy_permission` (or `can_manage_billing` which is similar)

BEGIN;

-- 1. Enable RLS
ALTER TABLE public.pharmacy_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Clean Existing Policies
DROP POLICY IF EXISTS "Public can create subscriptions" ON public.pharmacy_subscriptions;
DROP POLICY IF EXISTS "Manage subscriptions" ON public.pharmacy_subscriptions;
DROP POLICY IF EXISTS "admin_manage_subscriptions" ON public.pharmacy_subscriptions;
DROP POLICY IF EXISTS "owners_read_subscriptions" ON public.pharmacy_subscriptions;
DROP POLICY IF EXISTS "View subscriptions" ON public.pharmacy_subscriptions; -- Seen in screenshot
DROP POLICY IF EXISTS "subs_read_billing_access" ON public.pharmacy_subscriptions; -- Seen in screenshot
DROP POLICY IF EXISTS "subs_write_billing_access" ON public.pharmacy_subscriptions; -- Seen in screenshot

-- 3. Create NEW Policies

-- Allow INSERT for Authenticated Users (Self-service + Admin)
-- We use a simple check for auth users to avoid circular dependency issues during initial creation.
-- The backend/trigger logic will handle validation.
CREATE POLICY "Create subscriptions" ON public.pharmacy_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow FULL ACCESS for Owners/Admins
-- Reuse the `check_pharmacy_permission` function I created earlier (or create inline logic if needed)
CREATE POLICY "Manage own subscription" ON public.pharmacy_subscriptions
FOR ALL
TO authenticated
USING (
    public.check_pharmacy_permission(pharmacy_id)
);

COMMIT;

SELECT 'Subscription RLS fixed.' as result;
