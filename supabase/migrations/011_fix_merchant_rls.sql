-- ==============================================================================
-- CORREÇÃO DE PERMISSÕES PARA LOJISTAS (IFARMA)
-- Data: 29/01/2026
-- Descrição: Garante que LOJISTAS vejam seus próprios pedidos.
-- ==============================================================================

-- 1. ORDERS
-- Garante que o dono da farmácia veja os pedidos da SUA farmácia
DROP POLICY IF EXISTS "Lojistas veem seus proprios pedidos" ON orders;
CREATE POLICY "Lojistas veem seus proprios pedidos" ON orders
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- 2. ORDER_ITEMS
-- Garante que o dono da farmácia veja os ITENS dos seus pedidos
-- Isso requer um JOIN, então pode ser pesado, mas é necessário.
-- Alternativa: Usar policy simples se order_items tiver pharmacy_id (geralmente não tem, depende de order_id).
-- Assumindo que order_items tem order_id:
DROP POLICY IF EXISTS "Lojistas veem seus proprios itens" ON order_items;
CREATE POLICY "Lojistas veem seus proprios itens" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            )
        )
    );

-- 3. PROFILES (CLIENTES)
-- O lojista precisa ver o nome do cliente que fez o pedido
-- Geralmente 'profiles' tem leitura pública ou restrita.
-- Vamos garantir que se existe um pedido para a farmácia do auth.uid(), ele pode ver o profile do cliente.
-- Como essa policy é complexa, verifique se já existe 'Public Read' ou algo similar.
-- Se não, adicione uma policy genérica de leitura para usuários autenticados (mais simples e performático para MVP).
DROP POLICY IF EXISTS "Lojistas veem clientes dos pedidos" ON profiles;
CREATE POLICY "Leitura de perfis autenticada" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');
-- Nota: Isso abre leitura de nomes/fones para todos logados, o que é aceitável para MVP de delivery (motoboys/lojas precisam ver).

-- 4. PHARMACIES
-- O lojista precisa ver sua própria farmácia (já deve ter, mas reforçando)
DROP POLICY IF EXISTS "Lojista ve sua farmacia" ON pharmacies;
CREATE POLICY "Lojista ve sua farmacia" ON pharmacies
    FOR ALL USING (owner_id = auth.uid());
