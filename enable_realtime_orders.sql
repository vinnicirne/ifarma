-- Forçar ativação do Realtime para a tabela orders
BEGIN;
  -- Adiciona a tabela orders à publicação padrão do supabase_realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
COMMIT;
