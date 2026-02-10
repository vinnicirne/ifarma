-- Associar usuário à Farmácia Modelo
UPDATE profiles
SET pharmacy_id = '468a4a5b-9ada-458a-b77c-21b3d7ac550a'
WHERE id = 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';

-- Verificar resultado
SELECT 
    p.id as profile_id,
    p.email,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.cnpj
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';
