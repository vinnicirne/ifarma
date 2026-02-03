-- Script para criar usuário admin
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar se você já tem um perfil
SELECT * FROM profiles WHERE email = 'viniciuscirne@gmail.com';

-- 2. Se você já tem um perfil, vamos atualizar para admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'viniciuscirne@gmail.com';

-- 3. Se não tiver perfil, vamos criar um
-- IMPORTANTE: Substitua 'SEU_USER_ID' pelo ID do seu usuário no Supabase Auth
-- Para encontrar seu user_id, vá em Authentication > Users e copie o ID

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'SEU_USER_ID_AQUI', -- Substitua pelo seu user_id do Supabase Auth
  'viniciuscirne@gmail.com',
  'Vinicius Cirne',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- 4. Verificar se funcionou
SELECT id, email, full_name, role FROM profiles WHERE email = 'viniciuscirne@gmail.com';
