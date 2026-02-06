-- ============================================
-- SCRIPT DE REPARAÇÃO: CRIAR PERFIS FALTANTES
-- ============================================

-- 1. Inserir perfis para usuários que existem no auth.users mas não no public.profiles
INSERT INTO public.profiles (id, email, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'role', 'customer'),
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Garantir que o trigger de criação automática está ativo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verificação
SELECT count(*) as perfis_criados FROM public.profiles;
