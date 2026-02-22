-- Migration para adicionar colunas de auditoria na tabela pharmacies
-- Necessário para o novo sistema de aprovação de farmácias com trilha de auditoria

ALTER TABLE IF EXISTS public.pharmacies 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Comentário para documentação das colunas
COMMENT ON COLUMN public.pharmacies.approved_by IS 'ID do administrador que aprovou o estabelecimento';
COMMENT ON COLUMN public.pharmacies.approved_at IS 'Data e hora em que a aprovação foi realizada';
