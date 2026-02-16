-- ========================================================
-- IFARMA: CORREÇÃO DE MULTI-TENANCY E ISOLAMENTO DE LOJAS
-- ========================================================

-- 1. Garante RLS na tabela de produtos
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas frouxas antigas
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON public.products;
DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON public.products;

-- 3. Implementa políticas robustas

-- SELECT: 
-- - Clientes (incluindo deslogados) veem todos os produtos ATIVOS de qualquer loja
-- - Lojistas veem TODOS os produtos da sua própria loja (mesmo pausados/sem estoque)
-- - Admins veem tudo
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT
TO public
USING (
  (is_active = true) -- Visão pública do cliente
  OR
  (pharmacy_id = (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())) -- Visão do Lojista
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) -- Visão Admin
);

-- INSERT/UPDATE/DELETE:
-- - Apenas para a própria pharmacy_id (baseado no profile do usuário)
CREATE POLICY "products_merchant_manage_policy" ON public.products
FOR ALL
TO authenticated
USING (
  pharmacy_id = (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
  pharmacy_id = (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- 4. Notificação de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Isolamento de Tenant aplicado com sucesso à tabela de produtos!';
END $$;
