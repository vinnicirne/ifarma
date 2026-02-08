-- ====================================================================
-- DATABASE CLEANUP: REMOVE LEGACY TELEMETRY TABLE
-- Data: 2026-02-08
-- ====================================================================

-- 1. DROP LEGACY TABLE
-- location_history was replaced by route_history for better indexing and RLS consistency.
DROP TABLE IF EXISTS public.location_history;

-- 2. VERIFY RLS ON route_history (Paranoia Check)
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

-- Telemetry system is now unified on public.route_history.
