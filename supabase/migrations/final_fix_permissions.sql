-- ===============================================================
-- CORREÇÃO FINAL DE PERMISSÕES (RLS) & REALTIME (V3 - CORRIGIDO)
-- Execute este script no Editor SQL do Supabase
-- ===============================================================

-- 1. Habilitar RLS na tabela orders (garantia)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas E NOVAS para evitar erros de duplicidade
-- Policies Antigas (Legado)
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuidos a eles" ON orders;
DROP POLICY IF EXISTS "Motoboys podem ver itens de seus pedidos" ON order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Farmacias veem seus proprios pedidos" ON orders;

-- Policies Atuais (Prevenção de Erro 42710)
DROP POLICY IF EXISTS "Motoboys podem ver seus pedidos" ON orders;
DROP POLICY IF EXISTS "Farmacias veem pedidos da sua loja" ON orders;
DROP POLICY IF EXISTS "Clientes veem seus proprios pedidos" ON orders;
DROP POLICY IF EXISTS "Permitir atualizacao de status" ON orders;
DROP POLICY IF EXISTS "Permitir criar pedidos" ON orders;

-- 3. CRIAR NOVAS POLÍTICAS (SIMPLIFICADAS E ROBUSTAS)

-- A) POLÍTICA PARA MOTOBOYS (Ver apenas os seus)
CREATE POLICY "Motoboys podem ver seus pedidos"
ON orders FOR SELECT
USING ( auth.uid() = motoboy_id );

-- B) POLÍTICA PARA FARMÁCIAS/ADMINISTRADORES (Ver pedidos da sua loja)
CREATE POLICY "Farmacias veem pedidos da sua loja"
ON orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = orders.pharmacy_id
        AND (
            pharmacies.owner_id = auth.uid() -- Dono da farmácia
            OR 
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') -- Admin geral
        )
    )
);

-- C) POLÍTICA PARA CLIENTES (Ver seus próprios pedidos)
CREATE POLICY "Clientes veem seus proprios pedidos"
ON orders FOR SELECT
USING ( auth.uid() = customer_id );

-- D) POLÍTICA DE ATUALIZAÇÃO (Permitir que Motoboy e Farmácia atualizem status)
CREATE POLICY "Permitir atualizacao de status"
ON orders FOR UPDATE
USING (
    auth.uid() = motoboy_id -- Motoboy do pedido
    OR 
    auth.uid() = customer_id -- Cliente
    OR
    EXISTS ( -- Dono da Farmácia
        SELECT 1 FROM pharmacies 
        WHERE pharmacies.id = orders.pharmacy_id 
        AND pharmacies.owner_id = auth.uid()
    )
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') -- Admin
);

-- E) POLÍTICA PARA INSERÇÃO (Criar pedidos)
CREATE POLICY "Permitir criar pedidos"
ON orders FOR INSERT
WITH CHECK (true);

-- 4. CHECAGEM DO REALTIME PUBLICATION (COM PROTEÇÃO CONTRA ERRO DUPLICADO)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
END
$$;

-- 5. NOTIFICAR RECARREGAMENTO
NOTIFY pgrst, 'reload config';

-- RELATÓRIO FINAL
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'orders';
