-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que você está usando no app
UPDATE profiles
SET role = 'store_owner'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'admin@ifarma.com' -- ou coloque seu email aqui
);

-- Ou, se você já sabe o ID do usuário:
-- UPDATE profiles SET role = 'store_owner' WHERE id = 'USER_ID_AQUI';

-- Para voltar a ser admin:
-- UPDATE profiles SET role = 'admin' WHERE id = ...;
