-- SOLUÇÃO DEFINITIVA: REMOVER CONSTRAINT E CRIAR PERFIL
-- NÃO vamos recriar a constraint por enquanto

-- 1. Remover a foreign key constraint permanentemente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Criar o perfil
INSERT INTO profiles (id, email, full_name, role, pharmacy_id, phone, created_at, updated_at)
VALUES (
    '71e592fa-822a-41eb-8764-478445285eff',
    'comercialfaum@gmail.com',
    'Ifarma Modelo',
    'merchant',
    'e09d67f8-e4db-4195-9589-0c9155d4239a',
    '(00) 0000-0000',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    pharmacy_id = EXCLUDED.pharmacy_id,
    updated_at = NOW();

-- 3. Verificar resultado
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = '71e592fa-822a-41eb-8764-478445285eff';

-- NOTA: A constraint será recriada depois que confirmarmos que tudo funciona
-- Para recriar depois:
-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
