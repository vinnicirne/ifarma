-- ============================================
-- IFARMA - Configurações Financeiras Globais e Gateways
-- Data: 2026-01-29
-- ============================================

-- 1. Inserir chaves para Configurações Financeiras Globais e Gateways
INSERT INTO system_settings (key, value, description)
VALUES 
    ('global_charge_per_order', 'false', 'Ativa cobrança de taxa fixa padrão para todas as lojas'),
    ('global_fixed_fee', '0.00', 'Valor da taxa fixa padrão por pedido'),
    ('global_charge_percentage', 'false', 'Ativa cobrança de percentual padrão para todas as lojas'),
    ('global_percentage_fee', '0.00', 'Percentual padrão por pedido'),
    ('mp_public_key', '', 'Mercado Pago - Chave Pública'),
    ('mp_access_token', '', 'Mercado Pago - Access Token (Secreto)'),
    ('asaas_api_key', '', 'Asaas - API Key (Secreto)')
ON CONFLICT (key) DO NOTHING;

-- 2. Atualizar a função de processamento financeiro para suportar Regras Globais
CREATE OR REPLACE FUNCTION process_order_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_fees RECORD;
    v_taxa DECIMAL(10, 2) := 0;
    v_tipo TEXT := 'charge';
    v_free_rem INT;
    
    -- Variáveis para regras globais
    v_global_charge_fixed BOOLEAN;
    v_global_fixed_fee DECIMAL(10, 2);
    v_global_charge_percent BOOLEAN;
    v_global_percent_fee DECIMAL(5, 2);
BEGIN
    -- 1. Verificar pedidos grátis (Prioridade Máxima)
    SELECT free_orders_remaining INTO v_free_rem FROM pharmacies WHERE id = NEW.pharmacy_id;
    
    IF v_free_rem > 0 THEN
        v_taxa := 0;
        v_tipo := 'free';
        UPDATE pharmacies SET 
            free_orders_remaining = free_orders_remaining - 1,
            orders_count = orders_count + 1
        WHERE id = NEW.pharmacy_id;
        
        -- Registrar transação grátis e sair
        INSERT INTO pharmacy_transactions (pharmacy_id, order_id, order_value, fee_amount, type, description)
        VALUES (NEW.pharmacy_id, NEW.id, NEW.total_price, v_taxa, v_tipo, 'Pedido grátis (saldo promocional)');
        RETURN NEW;
    END IF;

    -- 2. Tentar buscar regra personalizada da loja
    SELECT * INTO v_fees FROM pharmacy_fees WHERE pharmacy_id = NEW.pharmacy_id AND active = true;
    
    IF FOUND AND (v_fees.charge_per_order OR v_fees.charge_percentage) THEN
        -- Aplicar Regra da Loja
        IF v_fees.charge_per_order THEN v_taxa := v_taxa + v_fees.fixed_fee; END IF;
        IF v_fees.charge_percentage THEN v_taxa := v_taxa + (NEW.total_price * v_fees.percentage_fee / 100); END IF;
        v_tipo := 'charge';
    ELSE
        -- 3. Caso não tenha regra da loja, buscar Regras Globais
        SELECT (value = 'true') INTO v_global_charge_fixed FROM system_settings WHERE key = 'global_charge_per_order';
        SELECT COALESCE(value::decimal, 0) INTO v_global_fixed_fee FROM system_settings WHERE key = 'global_fixed_fee';
        SELECT (value = 'true') INTO v_global_charge_percent FROM system_settings WHERE key = 'global_charge_percentage';
        SELECT COALESCE(value::decimal, 0) INTO v_global_percent_fee FROM system_settings WHERE key = 'global_percentage_fee';

        IF v_global_charge_fixed THEN v_taxa := v_taxa + v_global_fixed_fee; END IF;
        IF v_global_charge_percent THEN v_taxa := v_taxa + (NEW.total_price * v_global_percent_fee / 100); END IF;
        
        v_tipo := 'global_charge';
    END IF;

    -- 4. Registrar transação e atualizar contador
    UPDATE pharmacies SET orders_count = orders_count + 1 WHERE id = NEW.pharmacy_id;

    INSERT INTO pharmacy_transactions (
        pharmacy_id, 
        order_id, 
        order_value, 
        fee_amount, 
        type, 
        description
    ) VALUES (
        NEW.pharmacy_id,
        NEW.id,
        NEW.total_price,
        v_taxa,
        v_tipo,
        CASE 
            WHEN v_tipo = 'global_charge' THEN 'Cobrança baseada na regra global do sistema' 
            ELSE 'Cobrança baseada no contrato individual da loja' 
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
