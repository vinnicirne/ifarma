-- ========================================================
-- SUPER FIX: STATUS, RLS E REALTIME (IFARMA)
-- ========================================================

BEGIN;

-- 1. CORREÇÃO DE STATUS (CHECK CONSTRAINT)
-- Remove restrições antigas (e variações de nome comuns)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check1;

-- Adiciona a restrição final com todos os status permitidos
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendente', 'preparando', 'aguardando_motoboy', 'em_rota', 'entregue', 'cancelado'));


-- 2. CORREÇÃO DE PERMISSÕES (RLS)
-- Garante que o lojista POÇA atualizar o status dos seus pedidos
DROP POLICY IF EXISTS "Lojistas podem atualizar seus pedidos" ON orders;
CREATE POLICY "Lojistas podem atualizar seus pedidos" ON orders
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pharmacies
            WHERE id = orders.pharmacy_id AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pharmacies
            WHERE id = orders.pharmacy_id AND owner_id = auth.uid()
        )
    );


-- 3. AJUSTES TÉCNICOS (REALTIME)
-- Garante que o Realtime envie todos os dados em cada evento
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Garante que a tabela está na publicação
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se a publicação não existir, cria
        CREATE PUBLICATION supabase_realtime FOR TABLE orders;
END $$;

COMMIT;

-- TESTE DE VERIFICAÇÃO (Opcional):
-- SELECT status FROM orders LIMIT 1;
