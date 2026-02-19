-- ============================================================================
-- MIGRATION: Add Auto-Message Columns to Pharmacies
-- Description: Enables automated chat messages for order acceptance and cancellation.
-- ============================================================================

BEGIN;

-- 1. ADD AUTO-MESSAGE COLUMNS
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS auto_message_accept_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_message_accept_text TEXT,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_text TEXT;

-- 2. NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';

COMMIT;
