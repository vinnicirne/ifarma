-- Execute este script no SQL Editor do Supabase para corrigir o erro de permissão

-- Habilitar RLS na tabela de farmácias (se ainda não estiver)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos (opcional, mas recomendado para limpar)
DROP POLICY IF EXISTS "Leitura pública de farmácias" ON pharmacies;
DROP POLICY IF EXISTS "Gerenciamento total para autenticados" ON pharmacies;

-- Criar política de leitura pública (qualquer um pode ver as farmácias)
CREATE POLICY "Leitura pública de farmácias" 
ON pharmacies FOR SELECT 
USING (true);

-- Criar política de permissão total (INSERT, UPDATE, DELETE) para usuários logados
CREATE POLICY "Gerenciamento total para autenticados" 
ON pharmacies FOR ALL 
USING (auth.role() = 'authenticated');
