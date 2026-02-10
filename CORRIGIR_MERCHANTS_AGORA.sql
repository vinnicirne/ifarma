-- CORRECAO URGENTE: Vincular merchants sem pharmacy_id
-- Execute este script COMPLETO no Supabase SQL Editor

-- PASSO 1: Diagnostico - Ver quem esta sem pharmacy_id
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.id as farmacia_disponivel,
    ph.name as nome_farmacia
FROM profiles p
LEFT JOIN pharmacies ph ON ph.owner_email = p.email
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL
ORDER BY p.created_at DESC;

-- PASSO 2: Corrigir TODOS os merchants vinculando pelo email
UPDATE profiles p
SET pharmacy_id = ph.id,
    updated_at = NOW()
FROM pharmacies ph
WHERE p.role = 'merchant'
  AND p.pharmacy_id IS NULL
  AND p.email = ph.owner_email;

-- PASSO 3: Verificar resultado
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
ORDER BY p.created_at DESC;

-- PASSO 4: Estatisticas finais
SELECT 
    COUNT(*) as total_merchants,
    COUNT(pharmacy_id) as merchants_com_farmacia,
    COUNT(*) - COUNT(pharmacy_id) as merchants_sem_farmacia
FROM profiles
WHERE role = 'merchant';

-- PASSO 5: Caso especifico - Se algum merchant ainda estiver sem pharmacy_id
-- Descomente e execute se necessario:
/*
-- Ver merchants que ainda estao sem pharmacy_id
SELECT 
    p.email,
    p.id,
    (SELECT id FROM pharmacies WHERE owner_email = p.email LIMIT 1) as pharmacy_id_sugerido
FROM profiles p
WHERE p.role = 'merchant' 
  AND p.pharmacy_id IS NULL;

-- Corrigir manualmente (substitua os valores)
UPDATE profiles 
SET pharmacy_id = 'COLE_O_ID_DA_FARMACIA_AQUI'
WHERE email = 'COLE_O_EMAIL_DO_MERCHANT_AQUI';
*/
