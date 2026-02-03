-- Ativar Realtime para a tabela orders
begin;
  -- Removendo caso já exista para evitar duplicidade ou erro
  alter publication supabase_realtime drop table orders;
  -- Adicionando a tabela orders na publicação do Realtime
  alter publication supabase_realtime add table orders;
commit;
