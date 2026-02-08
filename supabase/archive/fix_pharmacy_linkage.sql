-- SOLUÇÃO PARA PANEL DE PEDIDOS VAZIO E ERRO DE VINCULAÇÃO
-- Este script vincula corretamente os usuários às suas farmácias

-- 1. Garantir que o owner_id das farmácias esteja sincronizado com o email de cadastro
UPDATE public.pharmacies p
SET owner_id = u.id
FROM auth.users u
WHERE LOWER(p.owner_email) = LOWER(u.email)
  OR (p.owner_id IS NULL AND u.email = 'comercialalfaum@gmail.com');

-- 2. Sincronizar o pharmacy_id nos perfis para que o dashboard identifique a loja
UPDATE public.profiles pr
SET pharmacy_id = ph.id,
    role = CASE WHEN pr.role = 'customer' THEN 'merchant' ELSE pr.role END
FROM public.pharmacies ph
WHERE pr.id = ph.owner_id;

-- 3. Garantir que os administradores tenham permissão total
UPDATE public.profiles
SET role = 'admin'
WHERE email IN ('comercialalfaum@gmail.com', 'admin@ifarma.com', 'contato@ifarma.com.br');

-- 4. FALLBACK: Se ainda houver farmácia sem owner, atribui ao admin principal
UPDATE public.pharmacies
SET owner_id = (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
WHERE owner_id IS NULL;

-- 5. Atualizar perfis de equipe (Manager/Staff) que podem estar sem o pharmacy_id
-- (Isso assume que eles foram criados anteriormente sem o vínculo)
-- UPDATE public.profiles pr
-- SET pharmacy_id = (SELECT id FROM public.pharmacies LIMIT 1)
-- WHERE role IN ('manager', 'staff') AND pharmacy_id IS NULL;

SELECT 'Vínculos de farmácia atualizados com sucesso!' as status;
