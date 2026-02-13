-- fix_public_access_v2.sql
-- Garante RLS nas tabelas principais
ALTER TABLE app_feed_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas para evitar conflitos/erros
DROP POLICY IF EXISTS "Public view feed" ON app_feed_sections;
DROP POLICY IF EXISTS "Public view approved pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Public view active promotions" ON promotions;

-- 1. Feed (Home) - Visível para todos
CREATE POLICY "Public view feed" 
ON app_feed_sections FOR SELECT 
TO anon, authenticated 
USING (true);

-- 2. Farmácias (Aprovadas) - Visível para todos
-- Nota: Usando ILIKE para compatibilidade com qualquer casing do status 'Aprovado'
CREATE POLICY "Public view approved pharmacies" 
ON pharmacies FOR SELECT 
TO anon, authenticated 
USING (status ~* 'aprovado');

-- 3. Promoções (Ativas) - Visível para todos (is_active corrigido)
CREATE POLICY "Public view active promotions" 
ON promotions FOR SELECT 
TO anon, authenticated 
USING (is_active = true);
