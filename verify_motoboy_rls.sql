-- =================================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO DE RLS (SEGURANÇA) PARA MOTOBOYS
-- Execute este script no Editor SQL do Supabase
-- =================================================================

-- 1. Verificar se a política de visualização de pedidos para motoboys existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Motoboys podem ver pedidos atribuidos a eles'
    ) THEN
        -- Se não existir, criar a política
        EXECUTE '
            CREATE POLICY "Motoboys podem ver pedidos atribuidos a eles"
            ON orders FOR SELECT
            USING (auth.uid() = motoboy_id);
        ';
        RAISE NOTICE 'Política de acesso aos pedidos criada com sucesso.';
    ELSE
        RAISE NOTICE 'Política de acesso aos pedidos já existe.';
    END IF;
END
$$;

-- 2. Verificar se a política de visualização de ITENS do pedido existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Motoboys podem ver itens de seus pedidos'
    ) THEN
        -- Se não existir, criar a política
        EXECUTE '
            CREATE POLICY "Motoboys podem ver itens de seus pedidos"
            ON order_items FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM orders
                    WHERE orders.id = order_items.order_id
                    AND orders.motoboy_id = auth.uid()
                )
            );
        ';
        RAISE NOTICE 'Política de acesso aos itens criada com sucesso.';
    ELSE
        RAISE NOTICE 'Política de acesso aos itens já existe.';
    END IF;
END
$$;

-- 3. Verificação Final (Apenas Visualização)
-- Lista todas as políticas ativas nas tabelas orders e order_items
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items');
