-- SOLUÇÃO RÁPIDA: Promover usuário atual a ADMIN temporariamente
UPDATE profiles
SET role = 'admin'
WHERE id = '71e592fa-822a-41eb-8764-478445285eff';

-- Verificar
SELECT id, email, role, pharmacy_id
FROM profiles
WHERE id = '71e592fa-822a-41eb-8764-478445285eff';

-- IMPORTANTE: Depois de criar a farmácia, você pode voltar para merchant:
-- UPDATE profiles SET role = 'merchant' WHERE id = '71e592fa-822a-41eb-8764-478445285eff';
