-- SCRIPT DE REPARO: Correção de Recursividade em RLS (Erro 500)

-- 1. Criar funções auxiliares com SECURITY DEFINER para evitar recursão
-- Isso permite consultar a tabela 'profiles' sem disparar a política RLS novamente.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_pharmacy_id()
RETURNS UUID AS $$
  SELECT pharmacy_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Limpar as políticas problemáticas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Gestores podem ver equipe da farmácia" ON profiles;
DROP POLICY IF EXISTS "Gestores podem atualizar equipe" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;

-- 3. Recriar as políticas de forma otimizada e sem recursão

-- A) Ver o próprio perfil (Sempre permitido)
CREATE POLICY "Perfil: Próprio" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- B) Atualizar o próprio perfil
CREATE POLICY "Perfil: Atualizar Próprio" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- C) Admins: Podem ver TUDO
CREATE POLICY "Perfil: Admins Ver Tudo" ON profiles
    FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Perfil: Admins Gerenciar Tudo" ON profiles
    FOR ALL USING (get_my_role() = 'admin');

-- D) Gestores (Merchant/Manager): Ver e Gerenciar Equipe da mesma farmácia
CREATE POLICY "Perfil: Equipe da Farmácia" ON profiles
    FOR ALL USING (
        (get_my_role() IN ('merchant', 'manager')) 
        AND 
        (pharmacy_id = get_my_pharmacy_id())
    );

-- 4. Garantir que a coluna role e pharmacy_id estão corretas
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'merchant', 'manager', 'staff', 'motoboy', 'admin'));

-- Notificar
COMMENT ON TABLE profiles IS 'Tabela de perfis com RLS corrigido para evitar erro 500.';
