-- =================================================================
-- ATUALIZAÇÃO IFARMA - CORREÇÃO E LIMPEZA (V3)
-- =================================================================

-- 1. REFRESH DO REALTIME (Garante que notificações cheguem instantaneamente)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE orders, order_items, motoboys, system_alerts;
COMMIT;

-- 2. GARANTIR INTEGRIDADE DE ATUALIZAÇÕES
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE motoboys REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- 3. PERMISSÕES (Evita erro 403/Permission Denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. LIMPEZA DE DADOS BUGADOS (OPCIONAL - Descomente se quiser zerar pedidos)
-- TRUNCATE TABLE order_items CASCADE;
-- TRUNCATE TABLE orders CASCADE;
-- UPDATE motoboys SET current_order_id = NULL;

-- 5. ÍNDICES PARA CORREÇÃO DE LISTAGEM
CREATE INDEX IF NOT EXISTS idx_orders_customer_v2 ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_v2 ON orders(status);

-- FIM
