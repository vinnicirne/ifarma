-- ============================================
-- CORREÇÃO DE ERRO: Check Constraint de PLANO
-- O formulário envia 'Gratuito', mas o banco espera inglês.
-- ============================================

-- 1. Remover a constraint atual
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_plan_check;

-- 2. Adicionar nova constraint mais flexível (aceitando português)
ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_plan_check 
CHECK (plan IN ('basic', 'pro', 'premium', 'enterprise', 'Gratuito', 'free', 'trial')); 

-- Nota: Adicionei 'Gratuito', 'free' e 'trial' para cobrir mais casos.
