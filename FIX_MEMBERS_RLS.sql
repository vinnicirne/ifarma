-- FIX_MEMBERS_RLS.sql
-- The 'products' RLS policy depends on reading 'pharmacy_members'.
-- If 'pharmacy_members' has RLS enabled but no policy for the user to read their own membership, the check fails silently.

BEGIN;

-- 1. Enable RLS on pharmacy_members (if not already)
ALTER TABLE public.pharmacy_members ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies (to be safe)
DROP POLICY IF EXISTS "Members can view own membership" ON public.pharmacy_members;
DROP POLICY IF EXISTS "pharmacy_members_self_read" ON public.pharmacy_members;
DROP POLICY IF EXISTS "pharmacy_members_admin_all" ON public.pharmacy_members;

-- 3. Add Necessary Policies
-- Allow users to see which pharmacies they belong to (CRITICAL for products check)
CREATE POLICY "Members can view own membership" 
ON public.pharmacy_members 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow admins/staff to see all memberships
CREATE POLICY "Staff can view all memberships" 
ON public.pharmacy_members 
FOR SELECT 
TO authenticated 
USING (public.is_internal_staff());

-- 4. Verify Policy Application
SELECT * FROM pg_policies WHERE tablename = 'pharmacy_members';

COMMIT;
