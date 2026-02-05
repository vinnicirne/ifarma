-- Libera a criação do perfil pelo próprio usuário (caso o trigger falhe)
DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem criar seu próprio perfil" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Garante que o carrinho tenha as permissões corretas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio carrinho" ON cart_items;
CREATE POLICY "Usuários podem ver seu próprio carrinho" ON cart_items
    FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem adicionar ao carrinho" ON cart_items;
CREATE POLICY "Usuários podem adicionar ao carrinho" ON cart_items
    FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio carrinho" ON cart_items;
CREATE POLICY "Usuários podem atualizar seu próprio carrinho" ON cart_items
    FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar do seu carrinho" ON cart_items;
CREATE POLICY "Usuários podem deletar do seu carrinho" ON cart_items
    FOR DELETE USING (customer_id = auth.uid());
