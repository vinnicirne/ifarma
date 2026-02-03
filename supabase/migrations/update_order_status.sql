-- =============================================
-- ATUALIZAÇÃO DE STATUS: AGUARDANDO MOTOBOY
-- =============================================

-- Remover a restrição antiga (se existir com esse nome ou similar)
DO $$ 
BEGIN 
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

-- Adicionar a nova restrição com o status 'aguardando_motoboy'
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendente', 'preparando', 'aguardando_motoboy', 'em_rota', 'entregue', 'cancelado'));

-- Comentário: pronto_entrega será mapeado para aguardando_motoboy se necessário, 
-- mas usaremos aguardando_motoboy como padrão oficial.
