-- 🔥 CORREÇÃO DE EMERGÊNCIA: Vincular usuários merchants sem pharmacy_id
-- Este script corrige o problema de merchants criados sem pharmacy_id

-- 1. DIAGNÓSTICO: Verificar merchants sem pharmacy_id
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

-- 2. CORREÇÃO AUTOMÁTICA: Vincular merchant ao owner_email da farmácia
-- Isso funciona quando o email do merchant corresponde ao owner_email da farmácia
UPDATE profiles p
SET pharmacy_id = ph.id
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- 3. VERIFICAÇÃO PÓS-CORREÇÃO: Confirmar que os merchants foram vinculados
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.status as pharmacy_status
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.role = 'merchant'
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. CASO ESPECÍFICO: Farmácia Modelo (comercialfaum@gmail.com)
-- Se ainda estiver sem pharmacy_id, execute manualmente:
-- UPDATE profiles 
-- SET pharmacy_id = (SELECT id FROM pharmacies WHERE owner_email = 'comercialfaum@gmail.com' LIMIT 1)
-- WHERE email = 'comercialfaum@gmail.com';
