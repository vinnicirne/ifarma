-- Verificar role do usuário atual
SELECT 
    id,
    email,
    role,
    pharmacy_id
FROM profiles
WHERE email LIKE '%comercial%'
   OR email LIKE '%admin%'
ORDER BY created_at DESC
LIMIT 10;

-- Se necessário, promover usuário a admin
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'SEU_USER_ID_AQUI';
