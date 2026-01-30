-- ATUALIZAÇÃO PARA FUNCIONALIDADE PLAY/PAUSE DE PRODUTOS
-- Rode isso no SQL Editor do Supabase para garantir que a tabela tenha o campo necessário.

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Opcional: Atualizar produtos existentes para true
UPDATE products SET is_active = true WHERE is_active IS NULL;
