-- ==========================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE ENDEREÇOS
-- Executar no Editor SQL do Supabase
-- ==========================================================

-- 1. Garantir que a tabela 'user_addresses' existe com a estrutura correta
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    label TEXT,       -- Ex: Casa, Trabalho
    address TEXT,     -- O endereço completo
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantir que a tabela 'profiles' tem a coluna 'address' (para o perfil simples)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE profiles ADD COLUMN address TEXT;
    END IF;
END $$;

-- 3. Configurar Segurança (RLS) para 'user_addresses'
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade/erros
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem criar seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem atualizar seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Usuarios podem deletar seus proprios enderecos" ON user_addresses;
DROP POLICY IF EXISTS "Users can select own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;

-- Criar Novas Políticas
CREATE POLICY "Permitir Select Proprio" ON user_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Permitir Insert Proprio" ON user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir Update Proprio" ON user_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permitir Delete Proprio" ON user_addresses FOR DELETE USING (auth.uid() = user_id);

-- 4. Adicionar ao Realtime (Opcional, mas bom para atualizar a lista na hora)
BEGIN;
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_addresses') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE user_addresses;
      END IF;
  END
  $$;
COMMIT;

NOTIFY pgrst, 'reload config';
