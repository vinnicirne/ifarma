-- ===============================================================
-- CRIAR PEDIDO DE TESTE PARA MOTOBOY
-- Substitua o e-mail abaixo pelo e-mail do motoboy logado (Ex: 'viniciuscirne@gmail.com')
-- ===============================================================

DO $$
DECLARE
    v_motoboy_id UUID;
    v_pharmacy_id UUID;
    v_customer_id UUID;
    v_order_id UUID;
BEGIN
    -- 1. Pegar ID do Motoboy pelo Email (Tenta pegar o primeiro motoboy ativo se não achar pelo email exato)
    -- AJUSTE O EMAIL ABAIXO PARA O SEU:
    SELECT id INTO v_motoboy_id FROM profiles WHERE role = 'motoboy' LIMIT 1;
    
    -- 2. Pegar uma farmácia qualquer
    SELECT id INTO v_pharmacy_id FROM pharmacies LIMIT 1;

    -- 3. Pegar um cliente qualquer (ou criar dummy)
    SELECT id INTO v_customer_id FROM profiles WHERE role = 'customer' LIMIT 1;
    IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id FROM profiles WHERE role = 'admin' LIMIT 1;
    END IF;

    -- 4. Criar o Pedido
    INSERT INTO orders (
        customer_id,
        pharmacy_id,
        motoboy_id,
        status,
        total_price,
        address,
        customer_name,
        payment_method,
        notes,
        created_at
    ) VALUES (
        v_customer_id,
        v_pharmacy_id,
        v_motoboy_id,
        'aguardando_motoboy', -- Status que deve aparecer na lista
        50.00,
        'Rua de Teste, 123 - Centro',
        'Cliente Teste Automatizado',
        'Dinheiro',
        'Pedido gerado via script de teste',
        NOW()
    ) RETURNING id INTO v_order_id;

    -- 5. Resultado
    RAISE NOTICE 'Pedido Criado com Sucesso!';
    RAISE NOTICE 'Order ID: %', v_order_id;
    RAISE NOTICE 'Atribuido ao Motoboy ID: %', v_motoboy_id;

END
$$;
