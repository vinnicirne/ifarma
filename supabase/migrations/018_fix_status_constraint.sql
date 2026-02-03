-- Remove the old constraint that missing 'pronto_entrega'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the updated constraint including 'pronto_entrega'
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendente', 'preparando', 'pronto_entrega', 'em_rota', 'entregue', 'cancelado'));
