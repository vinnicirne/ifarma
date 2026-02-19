-- ============================================================================
-- MIGRATION: Fix Pharmacy RLS and Add Missing Columns (Deep Dive Fix)
-- Description: Ensures managers and owners can update pharmacy settings.
-- ============================================================================

BEGIN;

-- 1. Ensure Columns Exist (Redundant but safe)
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS auto_message_accept_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_message_accept_text TEXT,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_text TEXT;

-- 2. Update RLS Policies for Pharmacies
-- The previous policies were too restrictive (only owner_id).
-- We need to allow anyone who is a 'manager' or 'owner' in pharmacy_members to update.

DROP POLICY IF EXISTS "Owner update own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff update any pharmacy" ON public.pharmacies;

-- New Policy: Update permission
CREATE POLICY "Pharmacy management update"
ON public.pharmacies
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.pharmacy_members
        WHERE pharmacy_id = public.pharmacies.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'support', 'operator')
    )
);

-- New Policy: Select permission (Broadened)
DROP POLICY IF EXISTS "Owner view own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff view all pharmacies" ON public.pharmacies;

CREATE POLICY "Pharmacy management select"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.pharmacy_members
        WHERE pharmacy_id = public.pharmacies.id
        AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'support', 'operator')
    ) OR
    status = 'approved' -- Publicly visible if approved
);

-- 3. NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';

COMMIT;
