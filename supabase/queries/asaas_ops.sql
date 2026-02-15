-- ============================================================================
-- OPERATIONS: Asaas Integration Troubleshooting & Maintenance
-- ============================================================================

-- 1) Listar farmácias com Asaas pendente (com último erro)
select
  p.id as pharmacy_id,
  p.name,
  p.cnpj,
  p.owner_email,
  p.owner_phone,
  p.asaas_status,
  p.asaas_customer_id,
  p.asaas_last_error,
  p.asaas_updated_at,
  p.created_at
from pharmacies p
where coalesce(p.asaas_status, 'pending') <> 'ok'
order by p.created_at desc
limit 200;

-- 2) Listar assinaturas pendentes no Asaas (plano pago) + detalhes do plano
select
  s.id as subscription_id,
  s.pharmacy_id,
  p.name as pharmacy_name,
  p.cnpj,
  s.plan_id,
  bp.name as plan_name,
  bp.monthly_fee_cents,
  s.status as subscription_status,
  s.asaas_subscription_id,
  s.next_billing_date,
  s.asaas_last_error,
  s.asaas_updated_at,
  s.started_at
from pharmacy_subscriptions s
join pharmacies p on p.id = s.pharmacy_id
join billing_plans bp on bp.id = s.plan_id
where bp.monthly_fee_cents > 0
  and (s.status = 'pending_asaas' or s.asaas_subscription_id is null)
order by s.started_at desc
limit 200;

-- 3) Pendências “mais críticas”: pagos + sem customer Asaas
select
  p.id as pharmacy_id,
  p.name,
  p.cnpj,
  p.owner_email,
  bp.name as plan_name,
  bp.monthly_fee_cents,
  p.asaas_customer_id,
  p.asaas_status,
  p.asaas_last_error,
  p.created_at
from pharmacies p
join pharmacy_subscriptions s on s.pharmacy_id = p.id
join billing_plans bp on bp.id = s.plan_id
where bp.monthly_fee_cents > 0
  and s.status in ('pending_asaas', 'active')
  and (p.asaas_customer_id is null or coalesce(p.asaas_status,'pending') <> 'ok')
order by bp.monthly_fee_cents desc, p.created_at desc
limit 200;

-- 4) Ver “duplicidade/perigo”: mais de 1 assinatura ativa por farmácia (diagnóstico)
select
  pharmacy_id,
  count(*) as active_subscriptions
from pharmacy_subscriptions
where status = 'active'
group by pharmacy_id
having count(*) > 1
order by active_subscriptions desc;

-- 5) Marcar como resolvido manualmente (Templates de Update)

-- 5.1 Atualizar asaas_customer_id e status da farmácia
/*
update pharmacies
set
  asaas_customer_id = 'cus_XXXXXXXXXXXX',
  asaas_status = 'ok',
  asaas_last_error = null,
  asaas_updated_at = now()
where id = 'PHARMACY_UUID_AQUI';
*/

-- 5.2 Atualizar assinatura local para ativa
/*
update pharmacy_subscriptions
set
  asaas_subscription_id = 'sub_XXXXXXXXXXXX',
  status = 'active',
  next_billing_date = date_trunc('month', now())::date + interval '1 month', -- 1º do próximo mês
  asaas_last_error = null,
  asaas_updated_at = now()
where id = 'SUBSCRIPTION_UUID_AQUI';
*/

-- 6) Relatório rápido “resumo pendências”
select
  coalesce(p.asaas_status, 'pending') as asaas_status,
  count(*) as pharmacies
from pharmacies p
group by 1
order by 2 desc;

-- 7) Consulta na View de Pendências (criada na migration)
select * from v_asaas_pending limit 200;
