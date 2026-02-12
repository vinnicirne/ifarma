-- Fix: Associar usuário à farmácia para testes
-- Este script cria uma farmácia de teste e associa ao usuário atual

DO $$
DECLARE
    v_user_id UUID := 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';
    v_pharmacy_id UUID;
BEGIN
    -- Buscar farmácia existente vinculada ao profile
    SELECT pharmacy_id INTO v_pharmacy_id
    FROM profiles
    WHERE id = v_user_id;

    -- Se não tiver farmácia no profile, tentar buscar por CNPJ
    IF v_pharmacy_id IS NULL THEN
        SELECT id INTO v_pharmacy_id
        FROM pharmacies
        WHERE cnpj = '00.000.000/0001-00'
        LIMIT 1;
        
        IF v_pharmacy_id IS NOT NULL THEN
            RAISE NOTICE 'Farmácia existente encontrada: %', v_pharmacy_id;
        END IF;
    END IF;

    -- Se ainda não existir, criar uma farmácia de teste com CNPJ único
    IF v_pharmacy_id IS NULL THEN
        INSERT INTO pharmacies (
            name,
            cnpj,
            phone,
            address,
            latitude,
            longitude,
            city,
            state,
            status,
            is_open
        ) VALUES (
            'Farmácia Express',
            '11.222.333/0001-' || LPAD(floor(random() * 100)::text, 2, '0'), -- CNPJ único
            '(00) 0000-0000',
            'Rua Teste, 123',
            -22.8508527047441,
            -43.0279081889764,
            'Rio de Janeiro',
            'RJ',
            'approved',
            true
        )
        RETURNING id INTO v_pharmacy_id;
        
        RAISE NOTICE 'Farmácia criada: %', v_pharmacy_id;
    ELSE
        RAISE NOTICE 'Usando farmácia existente: %', v_pharmacy_id;
    END IF;

    -- Atualizar profile com pharmacy_id
    UPDATE profiles
    SET pharmacy_id = v_pharmacy_id
    WHERE id = v_user_id;

    RAISE NOTICE 'Profile atualizado! Pharmacy ID: %', v_pharmacy_id;
END $$;

-- Verificar resultado
SELECT 
    p.id as profile_id,
    p.pharmacy_id,
    ph.name as pharmacy_name,
    ph.cnpj
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.id = 'e1cc8c7d-0e64-4f5d-a7eb-0bec15bb856f';

