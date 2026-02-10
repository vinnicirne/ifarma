-- 🚨 EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New Query → Cole e Execute

-- PASSO 1: Diagnóstico - Ver merchants sem pharmacy_id
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    p.created_at
FROM profiles p
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL
ORDER BY p.created_at DESC;

-- PASSO 2: Correção Automática
UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- PASSO 3: Verificação
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.role = 'merchant'
ORDER BY p.created_at DESC
LIMIT 10;
