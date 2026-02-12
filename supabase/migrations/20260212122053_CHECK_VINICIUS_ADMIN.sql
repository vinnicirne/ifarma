-- Verificar perfil do viniciuscirne
SELECT 
    id,
    email,
    role,
    full_name,
    pharmacy_id,
    created_at
FROM profiles
WHERE email LIKE '%vinici%'
   OR email LIKE '%cirne%'
ORDER BY created_at DESC;

-- Se não aparecer como admin, execute:
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email LIKE '%vinici%';
