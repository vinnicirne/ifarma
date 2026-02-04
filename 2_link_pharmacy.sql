-- PASSO 2: VINCULAR FARMÁCIA
-- Rode este arquivo DEPOIS do Passo 1.

UPDATE pharmacies
SET owner_id = (SELECT id FROM auth.users WHERE email = 'izabellefcirne@gmail.com')
WHERE name ILIKE '%Trevo%';

-- (Agora deve funcionar sem o erro 'foreign key')
