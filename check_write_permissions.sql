-- check_write_permissions.sql
SELECT tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('products', 'pharmacies', 'pharmacy_members');
