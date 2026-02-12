-- VERIFICAR SE O USUÁRIO EXISTE NO AUTH.USERS
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'comercialfaum@gmail.com'
ORDER BY created_at DESC;

-- Se não aparecer nada, o usuário NÃO foi criado!
-- Nesse caso, precisamos verificar os logs da Edge Function
