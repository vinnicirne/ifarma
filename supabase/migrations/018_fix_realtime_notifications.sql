-- CORREÇÃO DEFINITIVA DE NOTIFICAÇÕES (REALTIME)
-- Execute este script no SQL Editor do Supabase para garantir que os pedidos disparem notificações.

BEGIN;

-- 1. Garante que a replicação está ativa para a tabela orders
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 2. Cria a publicação do Realtime se não existir (padrão do Supabase)
-- (O Supabase geralmente já tem 'supabase_realtime', mas vamos garantir que 'orders' está nela)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- 3. Adiciona a tabela orders à publicação realtime (sem duplicar)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 4. Garante permissões para o papel "anon" e "authenticated" (necessário para ouvir)
GRANT SELECT ON orders TO anon;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO service_role;

COMMIT;

-- DICA: Se ainda não funcionar, verifique se seu bloqueador de anúncios não está bloqueando conexões WebSocket (WSS).
