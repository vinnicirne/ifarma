-- ==============================================================================
-- FIX: VISIBILIDADE DE PUBLICIDADE E DESTAQUES
-- ==============================================================================

-- 1. Habilitar RLS nas tabelas de publicidade
ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_metrics ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public campaigns are viewable by everyone" ON ads_campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON ads_campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON ads_campaigns;
DROP POLICY IF EXISTS "Metrics are viewable by owners" ON ads_metrics;
DROP POLICY IF EXISTS "Metrics can be inserted by everyone" ON ads_metrics;

-- 3. Criar Políticas para ads_campaigns
-- Permite que qualquer um (anon e authenticated) veja campanhas ativas
CREATE POLICY "Public campaigns are viewable by everyone" 
ON ads_campaigns FOR SELECT 
USING (true); 

-- Permite que usuários autenticados (lojistas) criem campanhas
CREATE POLICY "Users can insert their own campaigns" 
ON ads_campaigns FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Permite que usuários autenticados atualizem suas próprias campanhas
CREATE POLICY "Users can update their own campaigns" 
ON ads_campaigns FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- Permite que usuários autenticados deletem suas próprias campanhas
CREATE POLICY "Users can delete their own campaigns" 
ON ads_campaigns FOR DELETE
TO authenticated 
USING (auth.uid() = created_by);

-- 4. Criar Políticas para ads_metrics
-- Permite que o dono da campanha veja as métricas
CREATE POLICY "Metrics are viewable by campaign owners" 
ON ads_metrics FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM ads_campaigns 
        WHERE ads_campaigns.id = ads_metrics.campaign_id 
        AND ads_campaigns.created_by = auth.uid()
    )
);

-- Permite que qualquer um insira métricas (views/clicks) - CRÍTICO para funcionar o tracking
CREATE POLICY "Metrics can be inserted by everyone" 
ON ads_metrics FOR INSERT 
WITH CHECK (true);

-- Permite update de métricas (incrementar views/clicks)
CREATE POLICY "Metrics can be updated by everyone" 
ON ads_metrics FOR UPDATE
USING (true);

-- 5. Garantir que a seção de Publicidade esteja no Feed
-- Verifica se já existe 'ads.internal', se não existir, insere.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_feed_sections WHERE type = 'ads.internal') THEN
        INSERT INTO app_feed_sections (type, position, is_active, title, config)
        VALUES (
            'ads.internal', 
            3, -- Posição sugerida (logo após o banner principal e destaques)
            true, 
            'Sugestões para Você', 
            '{"region": "global"}'
        );
    ELSE
        -- Se já existe, garante que está ativo
        UPDATE app_feed_sections 
        SET is_active = true 
        WHERE type = 'ads.internal';
    END IF;
END $$;
