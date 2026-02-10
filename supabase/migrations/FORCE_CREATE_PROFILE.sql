-- VERIFICAR E CRIAR PERFIL DE FORMA SEGURA
-- Primeiro, confirmar que o usuário existe

-- 1. Verificar no auth.users
SELECT id, email, created_at
FROM auth.users
WHERE id = '71e592fa-822a-41eb-8764-478445285eff';

-- 2. Verificar se já existe perfil
SELECT id, email, role, pharmacy_id
FROM profiles
WHERE id = '71e592fa-822a-41eb-8764-478445285eff';

-- 3. Se não existir perfil, criar (DESABILITAR RLS TEMPORARIAMENTE)
-- Isso bypassa o problema da foreign key
BEGIN;

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Inserir perfil
INSERT INTO profiles (id, email, full_name, role, pharmacy_id)
VALUES (
    '71e592fa-822a-41eb-8764-478445285eff',
    'comercialfaum@gmail.com',
    'Ifarma Modelo',
    'merchant',
    'e09d67f8-e4db-4195-9589-0c9155d4239a'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    pharmacy_id = EXCLUDED.pharmacy_id;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- 4. Verificar resultado
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = '71e592fa-822a-41eb-8764-478445285eff';
