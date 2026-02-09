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
