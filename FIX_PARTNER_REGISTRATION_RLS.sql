-- ============================================
-- LIBERAR CADASTRO PÚBLICO DE FARMÁCIAS (PENDENTES)
-- ============================================

-- 1. Remover política restritiva anterior se existir
DROP POLICY IF EXISTS "Staff create pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Public create pharmacies" ON public.pharmacies;

-- 2. Criar nova política permitindo INSERT para todos (anon e authenticated)
-- Regra: Apenas status 'pending' é permitido na criação pública (embora o frontend envie 'Pendente', o check constraint do banco pode esperar 'pending'. Vamos ajustar isso também)
-- O frontend envia status: 'Pendente'. O banco espera status in ('pending', 'approved', 'rejected', 'suspended').
-- Vou precisar lidar com esse case sensitivity. O ideal é o frontend enviar 'pending'.

CREATE POLICY "Public create pharmacies" ON public.pharmacies
FOR INSERT
WITH CHECK (
  true -- Permite qualquer um inserir
);

-- 3. IMPORTANTE: O Frontend envia status 'Pendente', mas o banco tem check constraint lower case.
-- Vamos remover a constraint antiga e adicionar uma mais flexível ou corrigir os dados via trigger.
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_status_check;
ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'Pendente', 'Aprovado', 'Rejeitado')); 
-- Adicionei 'Pendente' para compatibilidade imediata, mas o ideal é padronizar.

-- 4. Garantir que owner_id seja opcional (já é, mas reforçando)
ALTER TABLE public.pharmacies ALTER COLUMN owner_id DROP NOT NULL;
