-- Política para permitir que Admins vejam todas as farmácias
DROP POLICY IF EXISTS "Admins can view all pharmacies" ON "public"."pharmacies";
CREATE POLICY "Admins can view all pharmacies" ON "public"."pharmacies"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Política para permitir que Admins editem todas as farmácias
DROP POLICY IF EXISTS "Admins can update all pharmacies" ON "public"."pharmacies";
CREATE POLICY "Admins can update all pharmacies" ON "public"."pharmacies"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Opcional: Permitir Delete também
DROP POLICY IF EXISTS "Admins can delete pharmacies" ON "public"."pharmacies";
CREATE POLICY "Admins can delete pharmacies" ON "public"."pharmacies"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- FIX: Permitir que Admins gerenciem CONTRATOS de motoboys (courier_contracts)
ALTER TABLE IF EXISTS courier_contracts ENABLE ROW LEVEL SECURITY;

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

-- FIX: Permitir que Merchants gerenciem seus próprios contratos
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
