/*
  Atualização de Schema - Atribuição de Motoboy
  ---------------------------------------------
  Execute este script no Editor SQL do Supabase para garantir
  que a tabela 'orders' tenha a coluna correta para atribuição.
*/

-- 1. Garante que a coluna motoboy_id existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'motoboy_id') THEN
        ALTER TABLE orders ADD COLUMN motoboy_id UUID REFERENCES profiles(id);
        RAISE NOTICE 'Coluna motoboy_id adicionada com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna motoboy_id já existe.';
    END IF;
END $$;

-- 2. Cria índices para melhorar a performance das consultas do Painel
CREATE INDEX IF NOT EXISTS idx_orders_motoboy_id ON orders(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_status ON orders(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at); -- Ajuda na ordenação FIFO/LIFO

-- 3. Adiciona comentário explicativo
COMMENT ON COLUMN orders.motoboy_id IS 'ID do perfil do motoboy responsável pela entrega';
