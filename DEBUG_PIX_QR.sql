-- Debug para verificar problemas com QR Code PIX

-- 1. Verificar invoices recentes sem QR Code
SELECT 
    i.id,
    i.pharmacy_id,
    i.amount_cents,
    i.status,
    i.asaas_invoice_id,
    i.asaas_status,
    i.due_date,
    i.created_at,
    p.name as pharmacy_name
FROM billing_invoices i
JOIN pharmacies p ON i.pharmacy_id = p.id
WHERE i.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY i.created_at DESC;

-- 2. Verificar subscriptions recentes
SELECT 
    s.id,
    s.pharmacy_id,
    s.plan_id,
    s.status,
    s.started_at,
    s.activated_at,
    s.next_billing_date,
    s.asaas_customer_id,
    s.asaas_subscription_id,
    p.name as pharmacy_name,
    bp.name as plan_name,
    bp.monthly_fee_cents
FROM pharmacy_subscriptions s
JOIN pharmacies p ON s.pharmacy_id = p.id
JOIN billing_plans bp ON s.plan_id = bp.id
WHERE s.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;

-- 3. Verificar billing cycles recentes
SELECT 
    bc.id,
    bc.pharmacy_id,
    bc.period_start,
    bc.period_end,
    bc.status,
    bc.free_orders_used,
    p.name as pharmacy_name
FROM billing_cycles bc
JOIN pharmacies p ON bc.pharmacy_id = p.id
WHERE bc.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY bc.created_at DESC;

-- 4. Verificar se há CNPJ nas farmácias com planos pagos
SELECT 
    p.id,
    p.name,
    p.cnpj,
    p.asaas_customer_id,
    s.plan_id,
    bp.name as plan_name,
    bp.monthly_fee_cents,
    s.status as subscription_status
FROM pharmacies p
LEFT JOIN pharmacy_subscriptions s ON p.id = s.pharmacy_id
LEFT JOIN billing_plans bp ON s.plan_id = bp.id
WHERE bp.monthly_fee_cents > 0
ORDER BY p.name;
