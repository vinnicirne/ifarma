-- check_tables_policies.sql
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM 
    pg_policies 
WHERE 
    tablename IN ('profiles', 'users', 'products', 'orders', 'pharmacies');
