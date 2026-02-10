-- PROMOVER USUÁRIO ATUAL A ADMIN (PODER DE DEUS)
-- Execute este SQL para ter acesso total ao sistema

-- 1. Verificar usuário atual
SELECT 
    id,
    email,
    role,
    full_name
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 2. Promover o usuário logado a ADMIN
-- Substitua 'SEU_EMAIL_AQUI' pelo email que você está usando
UPDATE profiles
SET role = 'admin'
WHERE email = 'comercialfarmacia@gmail.com'; -- AJUSTE O EMAIL AQUI

-- 3. Verificar se funcionou
SELECT 
    id,
    email,
    role,
    full_name,
    pharmacy_id
FROM profiles
WHERE role = 'admin';
