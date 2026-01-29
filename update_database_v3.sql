-- ============================================
-- ATUALIZAÇÃO CRÍTICA: Registro de Acesso e Vínculo de Dono
-- ============================================

-- 1. Adicionar colunas faltantes em pharmacies
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_access TIMESTAMP WITH TIME ZONE;

-- 2. Garantir que a tabela de perfis tenha o vínculo com a farmácia
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);

-- 3. Criar uma VIEW para facilitar a busca do gestor (opcional, mas recomendado)
CREATE OR REPLACE VIEW v_gestor_info AS
SELECT 
    p.id as profile_id,
    p.email,
    p.full_name,
    ph.id as pharmacy_id,
    ph.name as pharmacy_name,
    ph.last_access
FROM profiles p
JOIN pharmacies ph ON p.pharmacy_id = ph.id;

-- 4. Função para atualizar o último acesso
CREATE OR REPLACE FUNCTION update_pharmacy_last_access(p_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE pharmacies 
    SET last_access = timezone('utc'::text, now())
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner_id ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_last_access ON pharmacies(last_access);

-- ✅ Execute este script no SQL Editor do Supabase para liberar o cadastro de produtos.
