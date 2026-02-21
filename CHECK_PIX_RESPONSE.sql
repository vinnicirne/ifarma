-- Verificar dados do PIX criado recentemente
SELECT 
    i.id,
    i.pharmacy_id,
    i.asaas_invoice_id,
    i.amount_cents,
    i.status,
    i.due_date,
    i.created_at,
    i.asaas_status,
    i.asaas_invoice_url,
    p.name as pharmacy_name
FROM billing_invoices i
JOIN pharmacies p ON i.pharmacy_id = p.id
WHERE i.created_at >= NOW() - INTERVAL '2 hours'
  AND i.asaas_invoice_id IS NOT NULL
ORDER BY i.created_at DESC
LIMIT 5;

-- Verificar se há logs de erro recentes
SELECT 
    ph.id as pharmacy_id,
    ph.name,
    ph.asaas_customer_id,
    ph.asaas_status,
    ph.asaas_last_error,
    ps.plan_id,
    ps.status as subscription_status,
    bp.name as plan_name,
    bp.monthly_fee_cents
FROM pharmacies ph
JOIN pharmacy_subscriptions ps ON ph.id = ps.pharmacy_id
JOIN billing_plans bp ON ps.plan_id = bp.id
WHERE ps.plan_id = 'c3555c49-79db-4992-84de-673add08f373'  -- TESTANDO PRODUÇÃO
  AND ps.created_at >= NOW() - INTERVAL '2 hours';
