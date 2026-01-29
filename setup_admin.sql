-- Script completo para configurar usuário admin
-- Execute no SQL Editor do Supabase

-- 1. Atualizar/Criar perfil admin
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'bbb1e814-107e-4889-bbe7-8453b576034b',
  'viniciuscirne@gmail.com',
  'Vinicius Cirne',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  email = 'viniciuscirne@gmail.com',
  full_name = 'Vinicius Cirne',
  updated_at = NOW();

-- 2. Verificar se funcionou
SELECT id, email, full_name, role, is_active FROM profiles 
WHERE id = 'bbb1e814-107e-4889-bbe7-8453b576034b';

-- 3. Garantir que está ativo
UPDATE profiles 
SET is_active = true 
WHERE id = 'bbb1e814-107e-4889-bbe7-8453b576034b';

-- Resultado esperado:
-- id: bbb1e814-107e-4889-bbe7-8453b576034b
-- email: viniciuscirne@gmail.com
-- full_name: Vinicius Cirne
-- role: admin
-- is_active: true
