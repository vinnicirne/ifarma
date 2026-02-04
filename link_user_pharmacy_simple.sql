-- ===============================================================
-- VINCULO DIRETO (SEM VARIÁVEIS - MAIS FÁCIL DE RODAR)
-- ===============================================================

-- 1. Garante o Perfil do Usuário
INSERT INTO public.profiles (id, email, role, pharmacy_id)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'izabellefcirne@gmail.com'), 
    'izabellefcirne@gmail.com', 
    'merchant', 
    (SELECT id FROM pharmacies WHERE name ILIKE '%Trevo%' LIMIT 1)
)
ON CONFLICT (id) DO UPDATE 
SET role = 'merchant', pharmacy_id = (SELECT id FROM pharmacies WHERE name ILIKE '%Trevo%' LIMIT 1);

-- 2. Atualiza a Farmácia
UPDATE pharmacies 
SET owner_id = (SELECT id FROM auth.users WHERE email = 'izabellefcirne@gmail.com')
WHERE id = (SELECT id FROM pharmacies WHERE name ILIKE '%Trevo%' LIMIT 1);

-- (Script simplificado para evitar erro de seleção parcial)
