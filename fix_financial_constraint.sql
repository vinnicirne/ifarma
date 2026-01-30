-- ============================================
-- IFARMA - Fix para Erro 400 no Simulador
-- Problema: Constraint de 'type' impedia o tipo 'global_charge'
-- ============================================

-- 1. Atualizar a constraint para aceitar novos tipos de transação
ALTER TABLE pharmacy_transactions 
DROP CONSTRAINT IF EXISTS pharmacy_transactions_type_check;

ALTER TABLE pharmacy_transactions 
ADD CONSTRAINT pharmacy_transactions_type_check 
CHECK (type IN ('charge', 'free', 'service_fee', 'global_charge'));

-- 2. Garantir que as configurações globais existem para o trigger não falhar no cast
INSERT INTO system_settings (key, value, description)
VALUES 
    ('global_charge_per_order', 'false', 'Ativa cobrança de taxa fixa padrão para todas as lojas'),
    ('global_fixed_fee', '0.00', 'Valor da taxa fixa padrão por pedido'),
    ('global_charge_percentage', 'false', 'Ativa cobrança de percentual padrão para todas as lojas'),
    ('global_percentage_fee', '0.00', 'Percentual padrão por pedido')
ON CONFLICT (key) DO NOTHING;

-- Notificação de sucesso (log amigável se rodar via console)
DO $$ 
BEGIN 
    RAISE NOTICE 'Constraint financeira atualizada com sucesso para suportar Regras Globais.';
END $$;
