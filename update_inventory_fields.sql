-- ============================================
-- ATUALIZAÇÃO DE INVENTÁRIO (PREÇOS E FOTOS)
-- ============================================

-- 1. Adicionar colunas necessárias na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10, 2);

-- 2. Criar storage para fotos de produtos (caso não exista via painel)
-- Nota: O bucket deve ser criado via Interface do Supabase (Storage -> New Bucket -> 'products')
-- Mas aqui estão as políticas de acesso público (RLS para Storage)

-- Política para permitir que qualquer um veja as fotos dos produtos
-- Observe que para o storage as políticas são aplicadas em storage.objects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Produtos: Acesso Público'
    ) THEN
        CREATE POLICY "Produtos: Acesso Público" ON storage.objects
            FOR SELECT USING (bucket_id = 'products');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas: Upload de Fotos'
    ) THEN
        CREATE POLICY "Lojistas: Upload de Fotos" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'products' 
                AND auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- 3. Atualizar registros existentes para manter consistência
UPDATE products SET original_price = price WHERE original_price IS NULL;
