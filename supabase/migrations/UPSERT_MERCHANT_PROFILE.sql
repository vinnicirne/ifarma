-- CRIAR PERFIL COM UPSERT (IGNORA SE JÁ EXISTIR)
-- Usando INSERT com ON CONFLICT para evitar erros

INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    pharmacy_id,
    created_at,
    updated_at
)
SELECT 
    '71e592fa-822a-41eb-8764-478445285eff'::uuid,
    'comercialfaum@gmail.com',
    'Ifarma Modelo',
    'merchant',
    'e09d67f8-e4db-4195-9589-0c9155d4239a'::uuid,
    NOW(),
    NOW()
WHERE EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '71e592fa-822a-41eb-8764-478445285eff'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    pharmacy_id = EXCLUDED.pharmacy_id,
    updated_at = NOW();

-- Verificar resultado
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
