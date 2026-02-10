-- Solução rápida: Associar usuário a uma farmácia existente
-- Execute este SQL no Supabase SQL Editor

-- 1. Listar farmácias disponíveis
SELECT id, name, cnpj, status 
FROM pharmacies 
WHERE status = 'approved'
LIMIT 5;

-- 2. Atualizar profile com a primeira farmácia aprovada
UPDATE profiles
SET pharmacy_id = (
    SELECT id 
    FROM pharmacies 
    WHERE status = 'approved' 
    LIMIT 1
)
WHERE id = 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';

-- 3. Verificar resultado
SELECT 
    p.id as profile_id,
    p.email,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.cnpj
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';
