-- VERIFICAR E CORRIGIR PERFIL ADMIN
-- Execute este SQL no Supabase SQL Editor

-- 1. Buscar todos os perfis admin
SELECT 
    id,
    email,
    role,
    full_name,
    created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 2. Buscar perfil do Vinicius (pode não existir!)
SELECT 
    id,
    email,
    role,
    full_name
FROM profiles
WHERE email LIKE '%vini%'
   OR full_name LIKE '%vini%';

-- 3. Se não existir, buscar pelo auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email LIKE '%vini%'
ORDER BY created_at DESC;
