-- ============================================================================
-- DIAGNOSTIC: Billing Plans
-- Description: Check if plans exist, their status, and table structure.
-- ============================================================================

-- 1. Check Table Columns
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'billing_plans';

-- 2. List All Plans (Active & Inactive)
SELECT * FROM billing_plans;

-- 3. Check RLS Policies
SELECT * FROM pg_policies WHERE tablename = 'billing_plans';
