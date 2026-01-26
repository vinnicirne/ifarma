-- Execute esse script no Editor SQL do Supabase para atualizar o banco de dados

-- 1. Adicionar campo de Destaque para Farmácias
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. Adicionar campos detalhados para a tabela de Motoboys
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS cnh_url TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);

-- 3. Atualizar Políticas de Segurança (Opcional - garante que o lojista veja seus motoboys)
-- DROP POLICY IF EXISTS "Lojista gerencia seus motoboys" ON motoboys;
-- CREATE POLICY "Lojista gerencia seus motoboys" ON motoboys
--     USING (auth.uid() IN (SELECT user_id FROM pharmacies WHERE id = pharmacy_id))
--     WITH CHECK (auth.uid() IN (SELECT user_id FROM pharmacies WHERE id = pharmacy_id));
