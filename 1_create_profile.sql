-- PASSO 1: CRIAR PERFIL
-- Rode este arquivo PRIMEIRO.

INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'merchant'
FROM auth.users
WHERE email = 'izabellefcirne@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'merchant';

-- (Se der "Success" ou "0 rows" não tem problema, o importante é não dar erro vermelho)
