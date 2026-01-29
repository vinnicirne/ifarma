-- ============================================
-- SOLUÇÃO COMPLETA: Criação de Usuários pelo Admin
-- ============================================

-- PARTE 1: Criar trigger automático para novos usuários
-- Este trigger cria automaticamente um perfil quando um usuário se registra

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

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTE 2: Políticas RLS (executar novamente para garantir)

DROP POLICY IF EXISTS "Admins podem inserir perfis" ON profiles;
CREATE POLICY "Admins podem inserir perfis" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON profiles;
CREATE POLICY "Admins podem atualizar qualquer perfil" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- PARTE 3: Políticas para outras tabelas

DROP POLICY IF EXISTS "Usuários podem gerenciar seus tokens" ON device_tokens;
CREATE POLICY "Usuários podem gerenciar seus tokens" ON device_tokens
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem ver todos os tokens" ON device_tokens;
CREATE POLICY "Admins podem ver todos os tokens" ON device_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Motoboys podem inserir histórico" ON route_history;
CREATE POLICY "Motoboys podem inserir histórico" ON route_history
    FOR INSERT WITH CHECK (motoboy_id = auth.uid());

DROP POLICY IF EXISTS "Participantes podem ver histórico" ON route_history;
CREATE POLICY "Participantes podem ver histórico" ON route_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = route_history.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins podem ver todo histórico" ON route_history;
CREATE POLICY "Admins podem ver todo histórico" ON route_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver se o trigger foi criado
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Ver políticas de profiles
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
