-- Fix para o usuário atual que não tem pharmacy_id
UPDATE profiles
SET pharmacy_id = (
    SELECT id 
    FROM pharmacies 
    WHERE status = 'approved' 
    ORDER BY created_at DESC
    LIMIT 1
)
WHERE id = 'c78c262b-bc4b-474b-a267-992ee466bc98';

-- Verificar resultado
SELECT 
    p.id as profile_id,
    p.email,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = 'c78c262b-bc4b-474b-a267-992ee466bc98';
