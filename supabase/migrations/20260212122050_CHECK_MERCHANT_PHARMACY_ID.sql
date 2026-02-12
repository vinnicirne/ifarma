-- VERIFICAR O PERFIL DO USUÁRIO LOGADO
-- Buscar pelo email que está tentando salvar produtos

-- 1. Buscar todos os merchants recentes
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.role = 'merchant'
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Buscar especificamente o merchant da Farmácia Modelo
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

-- 3. Se o pharmacy_id estiver NULL, atualizar:
-- UPDATE profiles 
-- SET pharmacy_id = 'e09d67f8-e4db-4195-9589-0c9155d4239a'
-- WHERE email = 'comercialfaum@gmail.com';
