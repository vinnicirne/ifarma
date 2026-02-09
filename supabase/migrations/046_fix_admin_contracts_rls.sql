-- Migration: 046_fix_admin_contracts_rls
-- Description: Fix permission denied for table courier_contracts by adding RLS policies for Admins and Merchants.

-- Enable RLS just in case (though likely enabled)
ALTER TABLE IF EXISTS courier_contracts ENABLE ROW LEVEL SECURITY;

-- 1. Admin Policy (Full Access)
DROP POLICY IF EXISTS "Admins can do everything on courier_contracts" ON courier_contracts;
CREATE POLICY "Admins can do everything on courier_contracts"
ON courier_contracts
FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Merchant Policy (Manage own pharmacy contracts)
DROP POLICY IF EXISTS "Merchants can manage their pharmacy contracts" ON courier_contracts;
CREATE POLICY "Merchants can manage their pharmacy contracts"
ON courier_contracts
FOR ALL
TO authenticated
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant'
  )
)
WITH CHECK (
  pharmacy_id IN (
    SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'merchant'
  )
);

-- 3. Courier Policy (View own contracts)
DROP POLICY IF EXISTS "Couriers can view own contracts" ON courier_contracts;
CREATE POLICY "Couriers can view own contracts"
ON courier_contracts
FOR SELECT
TO authenticated
USING (
  courier_id = auth.uid()
);
