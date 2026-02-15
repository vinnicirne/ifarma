-- Inserir planos de faturamento iniciais
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
('Gratuito', 'gratuito', 0, 30, 500, 0, false, true),
('Básico', 'basico', 9900, 100, 300, 0, false, true),
('Pro', 'pro', 19900, 500, 200, 0, false, true)
ON CONFLICT (slug) DO NOTHING;
