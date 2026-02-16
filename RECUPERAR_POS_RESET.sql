-- ========================================================
-- DADOS ESSENCIAIS: RECUPERAÇÃO PÓS-RESET
-- Use este script APÓS rodar o reset_database.sql
-- ========================================================

BEGIN;

-- 1. Sincronizar Perfis para usuários que já existem no Auth
-- (O trigger handle_new_user só roda em NOVOS usuários, então precisamos disso para os antigos)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    COALESCE(raw_user_meta_data->>'role', 'customer'),
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = COALESCE(profiles.role, EXCLUDED.role);

-- 2. Restaurar seu ADMIN (Ajuste o e-mail se necessário)
UPDATE public.profiles SET role = 'admin' WHERE email = 'vinnicirne@gmail.com';

-- 3. Recriar a Farmácia 2255 (pois o Cascade apagou a tabela)
INSERT INTO public.pharmacies (name, status, address, latitude, longitude, owner_email, plan)
VALUES (
    'Farmácia 2255', 
    'approved', 
    'Endereço da Farmácia', 
    -22.9068, 
    -43.1729, 
    'farmacia2255@gmail.com',
    'PREMIUM'
) RETURNING id;

-- 4. Vincular o Lojista à Farmácia recém criada
-- Nota: O trigger deve ter criado o perfil dele no passo 1.
UPDATE public.profiles 
SET 
  role = 'merchant',
  pharmacy_id = (SELECT id FROM pharmacies WHERE owner_email = 'farmacia2255@gmail.com' LIMIT 1)
WHERE email = 'farmacia2255@gmail.com';

COMMIT;

-- Diagnóstico
SELECT 'Admin' as Check, email, role FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 'Merchant' as Check, email, role FROM profiles WHERE role = 'merchant';
