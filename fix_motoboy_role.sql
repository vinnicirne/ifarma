-- 1. Substitua COMERCIALALFAUM@GMAIL.COM pelo email do motoboy se for diferente
-- Isso transforma o usuário em motoboy e ativa a conta
UPDATE public.profiles
SET role = 'motoboy',
    is_active = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'comercialalfaum@gmail.com' LIMIT 1);

-- 2. Libera a permissão para o usuário clicar em "Ficar Online"
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permite que o usuário edite seu próprio perfil (ficar online, mudar foto, etc)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Permite que o app leia os dados do perfil ao logar
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);
