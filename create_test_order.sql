-- SCRIPT DE TESTE: CRIAR PEDIDO "EM ROTA"
-- Substitua 'SEU_ID_DE_USUARIO_AQUI' pelo seu UUID (veja no rodapé do dashboard)
-- Ou apenas rode e depois atribua manualmente se preferir.

DO $$
DECLARE
  v_motoboy_id UUID := auth.uid(); -- Pega o ID de quem está rodando (se estiver logado no Editor SQL)
  -- SE PREFERIR FIXAR: v_motoboy_id UUID := '00000000-0000-0000-0000-000000000000';
  v_pharmacy_id UUID;
BEGIN
  -- 1. Pega uma farmácia qualquer
  SELECT id INTO v_pharmacy_id FROM pharmacies LIMIT 1;

  -- 2. Cria o pedido de teste
  INSERT INTO orders (
    pharmacy_id,
    motoboy_id,
    status,
    client_name,
    address,
    delivery_lat,
    delivery_lng,
    delivery_fee,
    created_at
  ) VALUES (
    v_pharmacy_id,
    v_motoboy_id, -- Atribui a VOCÊ mesmo
    'pronto_entrega', -- Status inicial para você aceitar/iniciar
    'Teste Cliente VIP',
    'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
    -23.561414, -- Lat (MASP)
    -46.655881, -- Lng (MASP)
    12.50,
    NOW()
  );
END $$;
