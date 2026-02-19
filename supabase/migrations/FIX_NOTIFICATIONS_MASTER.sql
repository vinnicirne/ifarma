-- ============================================================================
-- FIX NOTIFICATIONS MASTER (No Gambiarras)
-- Resolution by Backend Specialist
-- ============================================================================

BEGIN;

-- 1. SECURITY (RLS): Create missing policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
CREATE POLICY "Users can see their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. INFRA: Fix unique constraint for device_tokens upsert
-- Check if constraint exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'device_tokens_user_id_token_key'
    ) THEN
        ALTER TABLE public.device_tokens ADD CONSTRAINT device_tokens_user_id_token_key UNIQUE (user_id, token);
    END IF;
END $$;

-- 3. REALTIME: Ensure full payload delivery
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 4. HOUSEKEEPING: Ensure RLS is on for device_tokens too
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own tokens" ON public.device_tokens;
CREATE POLICY "Users manage their own tokens"
ON public.device_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMIT;

-- 5. VERIFICATION
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('notifications', 'device_tokens');
