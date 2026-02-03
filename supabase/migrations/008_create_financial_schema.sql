-- ============================================
-- IFARMA - Sistema de Regras Financeiras por Loja
-- Data: 2026-01-29
-- ============================================

-- 1. Alterar tabela de farmácias para rastreamento básico
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_orders_remaining INTEGER DEFAULT 0;

-- 2. Tabela de regras financeiras por loja
CREATE TABLE IF NOT EXISTS pharmacy_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE UNIQUE,
    
    -- Cobrança fixa por pedido
    charge_per_order BOOLEAN DEFAULT false,
    fixed_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Cobrança percentual
    charge_percentage BOOLEAN DEFAULT false,
    percentage_fee DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Pedidos grátis (quantidade inicial configurada)
    free_orders_initial INTEGER DEFAULT 0,
    
    -- Taxa de serviço mensal (futuro/administrativo)
    service_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de transações financeiras (log de cobranças)
CREATE TABLE IF NOT EXISTS pharmacy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    order_value DECIMAL(10, 2) NOT NULL,
    fee_amount DECIMAL(10, 2) NOT NULL,
    
    type TEXT CHECK (type IN ('charge', 'free', 'service_fee')),
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de histórico de mudanças nas configurações (Auditoria)
CREATE TABLE IF NOT EXISTS pharmacy_fee_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES profiles(id),
    old_config JSONB,
    new_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Habilitar RLS e Realtime
ALTER TABLE pharmacy_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_fee_history ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_fees;
ALTER PUBLICATION supabase_realtime ADD TABLE pharmacy_transactions;

-- 6. Políticas RLS
-- Admins podem fazer tudo
CREATE POLICY "Admins podem gerenciar regras financeiras" ON pharmacy_fees
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins podem ver transações" ON pharmacy_transactions
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lojistas podem ver suas próprias regras e transações
CREATE POLICY "Lojistas podem ver suas próprias regras" ON pharmacy_fees
    FOR SELECT USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));

CREATE POLICY "Lojistas podem ver suas próprias transações" ON pharmacy_transactions
    FOR SELECT USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));

-- 7. Função e Trigger para cálculo automático de taxas
CREATE OR REPLACE FUNCTION process_order_financials()
RETURNS TRIGGER AS $$
DECLARE
    v_fees RECORD;
    v_taxa DECIMAL(10, 2) := 0;
    v_tipo TEXT := 'charge';
    v_free_rem INT;
BEGIN
    -- 1. Buscar regras da farmácia
    SELECT * INTO v_fees FROM pharmacy_fees WHERE pharmacy_id = NEW.pharmacy_id AND active = true;
    
    -- Se não houver regra configurada, sai sem cobrar nada (opcional: definir regra padrão)
    IF NOT FOUND THEN
        UPDATE pharmacies SET orders_count = orders_count + 1 WHERE id = NEW.pharmacy_id;
        RETURN NEW;
    END IF;

    -- 2. Verificar pedidos grátis
    SELECT free_orders_remaining INTO v_free_rem FROM pharmacies WHERE id = NEW.pharmacy_id;
    
    IF v_free_rem > 0 THEN
        v_taxa := 0;
        v_tipo := 'free';
        -- Decrementar saldo de pedidos grátis
        UPDATE pharmacies SET 
            free_orders_remaining = free_orders_remaining - 1,
            orders_count = orders_count + 1
        WHERE id = NEW.pharmacy_id;
    ELSE
        -- 3. Calcular taxas
        IF v_fees.charge_per_order THEN
            v_taxa := v_taxa + v_fees.fixed_fee;
        END IF;
        
        IF v_fees.charge_percentage THEN
            v_taxa := v_taxa + (NEW.total_price * v_fees.percentage_fee / 100);
        END IF;
        
        -- Atualizar apenas contador total
        UPDATE pharmacies SET orders_count = orders_count + 1 WHERE id = NEW.pharmacy_id;
    END IF;

    -- 4. Registrar transação
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
        CASE WHEN v_tipo = 'free' THEN 'Pedido grátis (saldo promocional)' ELSE 'Cobrança por pedido processado' END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparada após a inserção de um pedido
DROP TRIGGER IF EXISTS trg_process_order_financials ON orders;
CREATE TRIGGER trg_process_order_financials
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION process_order_financials();

-- 8. Inicializar regras para farmácias existentes (opcional/padrão)
INSERT INTO pharmacy_fees (pharmacy_id, active)
SELECT id, true FROM pharmacies
ON CONFLICT (pharmacy_id) DO NOTHING;
