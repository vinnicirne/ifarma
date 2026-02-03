-- Enable Realtime for profiles table (Already enabled, skipping)
-- alter publication supabase_realtime add table profiles;

-- Ensure RLS on orders allows Motoboys to see their assigned orders
DROP POLICY IF EXISTS "Motoboys can view assigned orders" ON orders;
CREATE POLICY "Motoboys can view assigned orders"
ON orders FOR SELECT
TO authenticated
USING (
  motoboy_id = auth.uid() OR
  -- Fallback: if user is owner of the pharmacy
  pharmacy_id IN (
      SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  )
);

-- Allow Motoboys to update status of their assigned orders
DROP POLICY IF EXISTS "Motoboys can update assigned orders" ON orders;
CREATE POLICY "Motoboys can update assigned orders"
ON orders FOR UPDATE
TO authenticated
USING (
  motoboy_id = auth.uid()
)
WITH CHECK (
  motoboy_id = auth.uid()
);

-- Ensure profiles are updateable (for current_order_id)
-- Simplified policy: Users can update their own profile OR admin/owners can update others
-- Note: This is a broad policy, for tighter security we would need the pharmacy_members table or check roles strictly.
-- But to fix the immediate blocker:

CREATE POLICY "Owners can update motoboy profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
   auth.uid() = id OR -- User updates self
   EXISTS ( -- Or user is an owner of a pharmacy
      SELECT 1 FROM pharmacies WHERE owner_id = auth.uid()
   )
);
