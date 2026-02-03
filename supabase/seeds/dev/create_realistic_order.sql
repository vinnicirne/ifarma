-- SCRIPT PARA CRIAR UM PEDIDO REALISTA DE TESTE
-- Substitua 'SEU_MOTOBOY_ID_AQUI' pelo UUID do motoboy logado se necessário, 
-- ou o script tentará pegar o último motoboy criado.

DO $$
DECLARE
    v_pharmacy_id UUID;
    v_motoboy_id UUID;
    v_order_id UUID;
    v_product_1 UUID;
    v_product_2 UUID;
BEGIN
    -- 1. Pegar uma farmácia e um motoboy existente
    SELECT id INTO v_pharmacy_id FROM public.pharmacies LIMIT 1;
    SELECT id INTO v_motoboy_id FROM public.profiles WHERE role = 'motoboy' LIMIT 1;

    -- Se não tiver motoboy, lança erro (ou crie um se preferir)
    IF v_motoboy_id IS NULL THEN
        RAISE NOTICE 'Nenhum motoboy encontrado. Cadastre um usuário motoboy primeiro.';
        RETURN;
    END IF;

    -- 2. Pegar 2 produtos da farmácia (ou globais)
    SELECT id INTO v_product_1 FROM public.products LIMIT 1;
    SELECT id INTO v_product_2 FROM public.products ORDER BY created_at DESC LIMIT 1;

    -- 3. Criar o Pedido (Order)
    INSERT INTO public.orders (
        pharmacy_id,
        client_name,
        client_phone,
        address,
        delivery_fee,
        total_amount,
        status,
        motoboy_id,
        notes,
        created_at,
        delivery_lat,
        delivery_lng
    ) VALUES (
        v_pharmacy_id,
        'João da Silva (Teste)',
        '21999999999',
        'Av. Atlântica, 1500 - Copacabana, Rio de Janeiro',
        12.50, -- Taxa
        85.90, -- Total
        'em_rota', -- Já em rota para aparecer no dashboard
        v_motoboy_id,
        'Entregar na portaria. Cuidado com o cachorro bravo.',
        NOW(),
        -22.969778, -- Copacabana aprox
        -43.186859
    ) RETURNING id INTO v_order_id;

    -- 4. Inserir Itens do Pedido
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES 
    (v_order_id, v_product_1, 2, 25.00), -- 50.00
    (v_order_id, v_product_2, 1, 23.40); -- 23.40 + 12.50 (fee) = 85.90

    RAISE NOTICE 'Pedido de teste criado com sucesso! ID: % | Motoboy: %', v_order_id, v_motoboy_id;
END $$;
