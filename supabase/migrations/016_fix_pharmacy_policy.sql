-- ============================================
-- FIX: PERMISSÕES DE CADASTRO DE FARMÁCIA
-- DATA: 2026-02-01
-- ============================================

-- 1. Garantir que a tabela pharmacies tem RLS habilitado
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- 2. Remover política antiga se existir (para garantir recriação correta)
DROP POLICY IF EXISTS "Public register pharmacy" ON pharmacies;

-- 3. Criar política explícita para INSERT público
-- Permite que qualquer usuário (anon ou autenticado) insira uma farmácia
-- DESDE QUE o status inicial seja 'Pendente'
CREATE POLICY "Public register pharmacy" 
ON pharmacies 
FOR INSERT 
WITH CHECK (status = 'Pendente');

-- 4. Garantir permissões de tabela para roles públicos (Supabase defaults)
GRANT INSERT ON pharmacies TO anon, authenticated, service_role;
GRANT SELECT ON pharmacies TO anon, authenticated, service_role; -- Necessário para alguns checks

-- 5. Se houver sequences (embora seja UUID), garantir uso
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Confirmação
DO $$
BEGIN
    RAISE NOTICE 'Permissões de cadastro corrigidas com sucesso.';
END $$;
