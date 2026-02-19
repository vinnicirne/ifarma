-- Fix: Garantir que pedidos atribuídos cheguem ao motoboy
-- Problema: Pedidos atribuídos em /gestor/orders não aparecem no dashboard do motoboy

-- 1. Verificar e corrigir o RPC assign_order_to_motoboy
CREATE OR REPLACE FUNCTION public.assign_order_to_motoboy(p_order_id UUID, p_motoboy_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_motoboy RECORD;
    v_result JSONB;
BEGIN
    -- Buscar pedido
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pedido não encontrado');
    END IF;
    
    -- Buscar motoboy
    SELECT * INTO v_motoboy FROM profiles WHERE id = p_motoboy_id AND role = 'motoboy';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Motoboy não encontrado');
    END IF;
    
    -- Atualizar pedido com status correto para o motoboy ver
    UPDATE orders SET
        motoboy_id = p_motoboy_id,
        status = 'aguardando_retirada',  -- Status que o motoboy espera ver
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Atualizar perfil do motoboy
    UPDATE profiles SET
        current_order_id = p_order_id,
        updated_at = NOW()
    WHERE id = p_motoboy_id;
    
    -- Retornar sucesso
    v_result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'motoboy_id', p_motoboy_id,
        'status', 'aguardando_retirada'
    );
    
    RETURN v_result;
END;
$$;

-- 2. Garantir permissão para execução
GRANT EXECUTE ON FUNCTION public.assign_order_to_motoboy TO authenticated, service_role;

-- 3. Atualizar RLS policy existente (se necessário)
-- A policy "Motoboys can view assigned orders" já existe
-- Se precisar atualizar, use DROP POLICY primeiro

-- 4. Testar manualmente (descomente e substitua os IDs)
-- SELECT public.assign_order_to_motoboy('order-id-aqui', 'motoboy-id-aqui');

-- 5. Verificar pedidos recentes atribuídos
SELECT 
    o.id,
    o.motoboy_id,
    o.status,
    o.created_at,
    p.full_name as motoboy_name
FROM orders o
LEFT JOIN profiles p ON p.id = o.motoboy_id
WHERE o.created_at >= NOW() - INTERVAL '2 hours'
AND o.motoboy_id IS NOT NULL
ORDER BY o.created_at DESC;
