-- =================================================================
-- ATUALIZAÇÃO GERAL IFARMA - SOM, REALTIME E PERMISSÕES (V2)
-- =================================================================
-- Rode este script no SQL Editor do Supabase para garantir que tudo funcione.

-- 1. REFORÇAR CONFIGURAÇÃO DE REALTIME (Essencial para o som tocar)
-- Removemos e recriamos para garantir que não haja configurações parciais
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE orders, order_items, order_messages, system_alerts, motoboys;
COMMIT;

-- 2. GARANTIR QUE UPDATE/DELETE FUNCIONEM NO REALTIME
-- Sem isso, quando você muda status para "Aceitar", o painel não atualiza sozinho
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE motoboys REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- 3. CORREÇÃO DE PERMISSÕES (Evita erros de "Permission Denied" ou "403")
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. ÍNDICES DE PERFORMANCE (Para a lista de pedidos carregar rápido)
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy_status ON orders(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);

-- 5. COMENTÁRIO DE CONFIRMAÇÃO
COMMENT ON TABLE orders IS 'Tabela verificada e atualizada para Realtime em 29/01/2026';

-- FIM DA ATUALIZAÇÃO
