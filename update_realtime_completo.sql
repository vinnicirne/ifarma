-- ATUALIZAÇÃO IFARMA - REALTIME
-- Copie e cole este código no SQL Editor do Supabase

-- 1. Ativar Realtime para Tabela de Pedidos
-- Isso permite que o painel receba notificações instantâneas ("Novo Pedido", "Entregue", etc)
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table orders, order_items, motoboys;
commit;

-- OU, se preferir adicionar apenas sem recriar (mais seguro se já tiver outras tabelas):
-- alter publication supabase_realtime add table orders;
-- alter publication supabase_realtime add table order_items;
-- alter publication supabase_realtime add table motoboys;

-- 2. Garantir que as tabelas tenham Replicação Completa (Necessário para UPDATE/DELETE funcionarem bem no Realtime)
alter table orders replica identity full;
alter table order_items replica identity full;
alter table motoboys replica identity full;

-- 3. (Opcional) Verificação de segurança
-- Se você estiver tendo problemas de "Permissão Negada", rode isso (cuidado, libera leitura):
-- create policy "Public Access" on orders for select using (true);
