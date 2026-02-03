-- ======================================================================
-- SCRIPT UNIVERSAL E SEGURO PARA SUPABASE REALTIME (Ifarma)
-- ======================================================================
-- Este script habilita o Realtime de forma NÃO-DESTRUTIVA.
-- Diferente de outros scripts, este NÃO apaga (DROP) a publicação existente,
-- evitando que outras abas/tabelas parem de funcionar.

BEGIN;

-- 1. Garante que a publicação 'supabase_realtime' existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Adiciona as tabelas necessárias à publicação (somente se não estiverem lá)
-- Tabelas vitais para o Painel de Pedidos e Chat
DO $$
DECLARE
    target_table TEXT;
    target_tables TEXT[] := ARRAY['orders', 'order_items', 'profiles', 'order_messages', 'system_alerts', 'notifications'];
BEGIN
    FOREACH target_table IN ARRAY target_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = target_table
        ) THEN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || target_table;
        END IF;
    END LOOP;
END $$;

-- 3. Configura REPLICA IDENTITY FULL
-- Essencial para que os filtros do Supabase (ex: pharmacy_id=eq...) funcionem em eventos UPDATE
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 4. Garante permissões de SELECT para todos os usuários autenticados (necessário para Realtime)
-- As políticas de RLS cuidarão da segurança de quem vê o quê.
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON notifications TO authenticated;

COMMIT;

SELECT 'Configuração de Realtime consolidada com sucesso!' as status;
