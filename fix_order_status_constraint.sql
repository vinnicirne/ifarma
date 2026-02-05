-- SCRIPT PARA CORRIGIR A CONSTRAINT DE STATUS DOS PEDIDOS
-- Adiciona 'retirado' e 'aguardando_motoboy' à lista de status permitidos

-- 1. Remover a constraint antiga
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Adicionar a nova constraint com a lista completa de status usados no app
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',           -- Aguardando farmácia
    'preparando',         -- Em separação
    'aguardando_motoboy', -- No pool de entregadores
    'pronto_entrega',     -- Aguardando retirada pelo motoboy escalado
    'retirado',           -- Motoboy já pegou o produto (NOVO)
    'em_rota',            -- Entregador a caminho do cliente
    'entregue',           -- Finalizado
    'cancelado',          -- Cancelado
    'aguardando_retirada' -- Status auxiliar usado em algumas telas
));

COMMENT ON CONSTRAINT orders_status_check ON public.orders IS 'Lista de status permitidos para o fluxo de pedidos';
