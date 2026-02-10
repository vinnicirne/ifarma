-- CRIAR PERFIL PARA O USUÁRIO JÁ EXISTENTE
-- UID: 71e592fa-822a-41eb-8764-478445285eff
-- Email: comercialfaum@gmail.com

INSERT INTO profiles (id, email, full_name, role, pharmacy_id)
VALUES (
    '71e592fa-822a-41eb-8764-478445285eff',
    'comercialfaum@gmail.com',
    'Ifarma Modelo',
    'merchant',
    'e09d67f8-e4db-4195-9589-0c9155d4239a'
);

-- Verificar
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'comercialfaum@gmail.com';
