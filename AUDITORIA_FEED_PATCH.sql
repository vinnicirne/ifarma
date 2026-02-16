-- =====================================================
-- IFARMA - PATCH AUDITORIA FEED
-- Descrição: Criação de Bucket e Políticas para Feed do App
-- =====================================================

-- 1. Criar bucket app-assets (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-assets',
    'app-assets',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Public read access for app-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage app-assets" ON storage.objects;

-- 3. Política: Leitura Pública
CREATE POLICY "Public read access for app-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'app-assets');

-- 4. Política: Admins/Staff gerenciam tudo
CREATE POLICY "Admins can manage app-assets"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'app-assets' 
    AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator', 'support')))
);

-- Comentário de Auditoria
-- Nota: Removido comentário em storage.objects por questões de permissão
