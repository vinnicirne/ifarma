-- ============================================
-- ATUALIZAR TABELA PHARMACIES PARA REGISTRO DE PARCEIROS
-- Adiciona colunas faltantes usadas no PartnerRegistration.tsx
-- ============================================

ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS owner_last_name text,
ADD COLUMN IF NOT EXISTS owner_cpf text,
ADD COLUMN IF NOT EXISTS owner_rg text,
ADD COLUMN IF NOT EXISTS owner_rg_issuer text,
ADD COLUMN IF NOT EXISTS specialty text,
ADD COLUMN IF NOT EXISTS delivery_enabled boolean default false,
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS trade_name text; -- Geralmente mapeado para name, mas o frontend envia trade_name explícito

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner_cpf ON public.pharmacies(owner_cpf);
CREATE INDEX IF NOT EXISTS idx_pharmacies_cnpj ON public.pharmacies(cnpj);
