-- check_insert_policies.sql
SELECT * FROM pg_policies 
WHERE tablename = 'pharmacies' 
AND cmd = 'INSERT';
