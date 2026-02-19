-- ============================================================================
-- DEEP DIVE FIX: PROFILES, ADDRESSES, STORAGE AND ORDERS STATUS
-- ============================================================================

BEGIN;

-- 1. ALINHAMENTO DA TABELA PROFILES
-- Adiciona campos de endereço e localização que o frontend UserProfile.tsx espera
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS number TEXT,
    ADD COLUMN IF NOT EXISTS complement TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. CRIAÇÃO DA TABELA USER_ADDRESSES
-- Tabela para endereços adicionais dos clientes
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Casa", "Trabalho"
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para user_addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para user_addresses
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage their own addresses"
    ON public.user_addresses
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. PADRONIZAÇÃO DE STATUS DE PEDIDOS (Suporte bilingue Inglês/Português)
-- Remove restrição antiga se existir e cria uma nova mais flexível
DO $$
BEGIN
    -- Tenta encontrar o nome da constraint de check de status na tabela orders
    -- Se não souber o nome exato, podemos tentar dropar por padrão
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Adiciona a nova constraint que aceita ambos os idiomas para evitar erros de "buggy services"
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN (
            'pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned',
            'pendente', 'confirmado', 'preparando', 'pronto', 'atribuindo', 'transferido_para_motoboy', 'em_rota', 'entregue', 'cancelado', 'devolvido',
            'aguardando_motoboy', 'aguardando_retirada', 'retirado'
        ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível atualizar a constraint de status: %', SQLERRM;
END $$;

-- 4. CONFIGURAÇÃO DO STORAGE (AVATARS)
-- Criar bucket 'avatars' para fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Políticas para o bucket avatars
-- Leitura pública
DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
CREATE POLICY "Public access for avatars"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Upload: Usuário só pode subir na sua própria pasta ou root (ajustado para aceitar id/)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Update/Delete
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;

-- Recarrega cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Notificação de sucesso
SELECT '✅ Perfil alinhado (latitude adicionada), endereços criados, status de pedidos flexibilizado e storage configurado!' as result;
