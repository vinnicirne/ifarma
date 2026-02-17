-- FIX_ALL_RLS_NUCLEAR.sql
-- ⚠️ ARCHITECT-LEVEL FIX: RESET ALL PUBLIC PERMISSIONS ⚠️
-- This script completely wipes existing policies on public tables and re-applies
-- a standard, clean "Public Read" policy. It fixes "Policy already exists" errors
-- by dynamically finding and dropping everything first.

DO $$ 
DECLARE 
    tbl text;
    rec record;
    -- Group 1: Tables that need 'is_active = true' filter
    active_tables text[] := ARRAY['promotions', 'categories', 'ads_campaigns', 'app_feed_sections', 'banners'];
    -- Group 2: Tables that are fully public (read-only)
    public_tables text[] := ARRAY['system_settings'];
BEGIN
    -------------------------------------------------------------------------
    -- GROUP 1: Tables requiring (is_active = true)
    -------------------------------------------------------------------------
    FOREACH tbl IN ARRAY active_tables LOOP
        -- 1. Ensure Table Exists (Soft check to avoid crashing if table missing)
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- Drop ALL existing policies dynamically
            FOR rec IN 
                SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, tbl);
                RAISE NOTICE 'Dropped policy % on %', rec.policyname, tbl;
            END LOOP;

            -- Create Clean Policy
            EXECUTE format('CREATE POLICY "Public Read Active %s" ON public.%I FOR SELECT TO anon, authenticated USING (is_active = true)', tbl, tbl);
            RAISE NOTICE '✅ Fixed RLS for %', tbl;
        ELSE
            RAISE NOTICE '⚠️ Table % does not exist, skipping.', tbl;
        END IF;
    END LOOP;

    -------------------------------------------------------------------------
    -- GROUP 2: Tables fully public
    -------------------------------------------------------------------------
    FOREACH tbl IN ARRAY public_tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            FOR rec IN 
                SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, tbl);
            END LOOP;

            EXECUTE format('CREATE POLICY "Public Read All %s" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl, tbl);
            RAISE NOTICE '✅ Fixed RLS for %', tbl;
        END IF;
    END LOOP;

    -------------------------------------------------------------------------
    -- SPECIAL: Pharmacies (Status check)
    -------------------------------------------------------------------------
    -- We do NOT drop owner policies here to avoid breaking dashboard access.
    -- We only ensure the PUBLIC READ policy exists.
    DROP POLICY IF EXISTS "Public view approved pharmacies" ON public.pharmacies;
    CREATE POLICY "Public view approved pharmacies" ON public.pharmacies 
    FOR SELECT TO anon, authenticated 
    USING (status ILIKE '%aprov%' OR status ILIKE '%activ%');
    RAISE NOTICE '✅ Fixed RLS for pharmacies';

END $$;
