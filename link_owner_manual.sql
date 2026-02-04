-- Vincula o usuário correto (pelo email) à farmácia existente
-- Isso preenche o campo owner_id que está faltando ou incorreto

UPDATE public.pharmacies
SET owner_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'comercialalfaum@gmail.com'
    LIMIT 1
)
WHERE owner_email = 'comercialalfaum@gmail.com' 
   OR id IN (SELECT id FROM public.pharmacies LIMIT 1); -- Fallback para garantir que pegue a primeira farmácia se o email não bater
