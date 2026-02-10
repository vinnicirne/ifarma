-- DESCOBRIR QUAL USUÁRIO ESTÁ LOGADO
-- Cole o ID que aparece no console: "👤 User: <ID_AQUI>"

-- Exemplo: Se o console mostrou "👤 User: bbb1e814-..."
-- Cole esse ID aqui:

SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = 'COLE_O_ID_DO_CONSOLE_AQUI';

-- OU buscar por todos os merchants sem pharmacy_id:
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.pharmacy_id
FROM profiles p
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL
ORDER BY p.created_at DESC;
