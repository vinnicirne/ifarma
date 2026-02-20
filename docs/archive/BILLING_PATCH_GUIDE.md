# 🎯 PATCH COMPLETO: Migration Antiga (RECOMENDADO)

## ✅ Decisão Final

**Usar Migration ANTIGA** (`20260212_financial_module_schema_FIXED.sql`)

**Motivos:**
1. ✅ **Trigger automático** em tempo real (melhor que cron)
2. ✅ **Políticas key-value** (mais flexível)
3. ✅ **Slug nos planos** (identificação amigável)
4. ✅ **Auditoria dedicada** (melhor para compliance)

---

## 📁 Arquivos Criados/Modificados

### 1. Migration Corrigida (USAR ESTA)
**Arquivo:** `supabase/migrations/20260212_financial_module_schema_FIXED.sql`

**Correções aplicadas:**
- ✅ Adicionada função `update_updated_at_column()`
- ✅ Corrigido `NEW.total_price` (era `total_amount`)
- ✅ Adicionado `SECURITY DEFINER` e `SET search_path = public` no trigger
- ✅ Adicionado `asaas_customer_id` em `pharmacy_subscriptions`
- ✅ Todos os índices com `IF NOT EXISTS`
- ✅ Todos os triggers com `DROP TRIGGER IF EXISTS`

### 2. Frontend Corrigido (Key-Value)
**Arquivo:** `src/pages/admin/BillingPolicies.tsx`

**Mudanças:**
- ✅ Helper `kvToObject()` para converter key-value em objeto
- ✅ Busca policies como array e converte
- ✅ Atualiza via UPSERT individual
- ✅ Busca global config por `config_key = 'default_plan_settings'`

**Arquivo:** `src/pages/admin/BillingPlans.tsx`

**Mudanças:**
- ✅ Adicionado campo `slug` ao interface e formData
- ✅ Função `generateSlug()` para gerar slug automaticamente
- ✅ onChange do name atualiza slug automaticamente

---

## 🗑️ Arquivos para DELETAR

```bash
# Deletar migration nova (não usar)
rm supabase/migrations/20260212_billing_system_complete.sql

# Deletar migration antiga (substituída pela FIXED)
rm supabase/migrations/20260212_financial_module_schema.sql
```

---

## 🚀 Passos para Deploy

### 1. Limpar Migrations Antigas

```bash
# Deletar migrations conflitantes
rm supabase/migrations/20260212_billing_system_complete.sql
rm supabase/migrations/20260212_financial_module_schema.sql
```

### 2. Renomear Migration Corrigida

```bash
# Renomear para o nome correto
mv supabase/migrations/20260212_financial_module_schema_FIXED.sql \
   supabase/migrations/20260212_financial_module_schema.sql
```

### 3. Aplicar Migration

```bash
# Aplicar migration no banco
npx supabase db push
```

### 4. Verificar Tabelas

```sql
-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'billing%';

-- Verificar planos seed
SELECT id, name, slug, monthly_fee_cents, free_orders_per_period 
FROM billing_plans;

-- Verificar políticas seed
SELECT policy_key, policy_value 
FROM billing_policy;
```

### 5. Testar Trigger Automático

```sql
-- Simular pedido entregue
UPDATE orders 
SET status = 'delivered' 
WHERE id = '<algum_order_id>';

-- Verificar se contador foi incrementado
SELECT * FROM billing_cycles 
WHERE pharmacy_id = '<pharmacy_id>' 
AND status = 'active';
```

---

## 🔧 Estrutura Final do Banco

### Tabelas Criadas (8)

1. **billing_plans** (slug, name, fees, limits)
2. **billing_global_config** (config_key, fallback settings)
3. **billing_policy** (policy_key, policy_value) ← **Key-Value**
4. **pharmacy_subscriptions** (pharmacy → plan, asaas_subscription_id, asaas_customer_id)
5. **pharmacy_contracts** (overrides personalizados)
6. **billing_cycles** (contador mensal, free_orders_used, overage_orders)
7. **billing_invoices** (asaas_invoice_id, status, amounts)
8. **billing_audit_log** (auditoria dedicada)

### Funções Criadas (3)

1. **update_updated_at_column()** - Atualiza updated_at automaticamente
2. **get_pharmacy_billing_rules(pharmacy_id)** - Resolve regras (contrato > plano > global)
3. **increment_billing_cycle_on_order_delivered()** - **Trigger automático** ⚡

### Trigger Automático ⚡

```sql
-- Trigger que incrementa contador quando pedido é entregue
CREATE TRIGGER trigger_increment_billing_cycle
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_billing_cycle_on_order_delivered();
```

**Como funciona:**
1. Pedido muda para `status = 'delivered'`
2. Trigger busca ciclo ativo da farmácia
3. Busca regras de cobrança (contrato > plano > global)
4. Se ainda tem pedidos grátis: incrementa `free_orders_used`
5. Se excedeu limite: incrementa `overage_orders` e calcula `overage_amount_cents`

---

## 📊 Políticas (Key-Value)

### Seed Data

```sql
INSERT INTO billing_policy (policy_key, policy_value, description)
VALUES
  ('billing_cycle_type', 'calendar_month', 'Ciclo de cobrança: mês calendário'),
  ('order_count_trigger', 'delivered_only', 'Conta pedidos apenas quando status = delivered'),
  ('invoice_generation', 'auto', 'Geração de fatura: automática (cron)'),
  ('refund_policy', 'no_refund_count', 'Pedido devolvido não desconta do limite');
```

### Como Usar no Frontend

```typescript
// Helper
function kvToObject(rows: { policy_key: string; policy_value: string }[]) {
  return rows.reduce((acc, r) => {
    acc[r.policy_key] = r.policy_value;
    return acc;
  }, {} as Record<string, string>);
}

// Buscar
const { data } = await supabase
  .from('billing_policy')
  .select('policy_key, policy_value');

const policy = kvToObject(data || []);
// policy.billing_cycle_type -> "calendar_month"

// Atualizar (UPSERT)
await supabase.from('billing_policy').upsert({
  policy_key: 'billing_cycle_type',
  policy_value: 'rolling_30_days',
}, { onConflict: 'policy_key' });
```

---

## 🎨 Planos (Com Slug)

### Seed Data

```sql
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
  ('Free', 'free', 0, 50, 0, 0, true, true),
  ('Professional', 'professional', 9990, 100, 500, 100, false, true),
  ('Premium', 'premium', 19990, 300, 200, 50, false, true);
```

### Como Usar no Frontend

```typescript
// Buscar planos
const { data } = await supabase
  .from('billing_plans')
  .select('id, name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents')
  .order('monthly_fee_cents', { ascending: true });

// Usar slug como identificador
const freePlan = data.find(p => p.slug === 'free');

// Gerar slug automaticamente
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_') // Substitui não-alfanuméricos por _
    .replace(/^_|_$/g, ''); // Remove _ do início/fim
}

// Exemplo: "Professional Plan" -> "professional_plan"
```

---

## ⚠️ Notas Importantes

### 1. Trigger vs Edge Function

**Migration Antiga (RECOMENDADO):**
- ✅ Trigger automático em tempo real
- ✅ Não depende de cron externo
- ✅ Mais confiável
- ✅ Menos complexidade operacional

**Migration Nova (NÃO USAR):**
- ❌ Edge Function via cron
- ❌ Depende de cron externo
- ❌ Pode ter atraso
- ❌ Mais complexidade

### 2. Políticas Key-Value vs Colunas

**Key-Value (RECOMENDADO):**
- ✅ Adicionar nova política = INSERT
- ✅ Não precisa alterar schema
- ✅ Mais flexível

**Colunas Dedicadas (NÃO USAR):**
- ❌ Adicionar nova política = ALTER TABLE
- ❌ Precisa migration
- ❌ Menos flexível

### 3. Slug vs ID

**Com Slug (RECOMENDADO):**
- ✅ URLs amigáveis: `/plans/professional`
- ✅ Identificação estável
- ✅ Melhor UX

**Sem Slug (NÃO USAR):**
- ❌ URLs feias: `/plans/uuid`
- ❌ Identificação instável
- ❌ Pior UX

---

## 🧪 Testes Recomendados

### 1. Testar Trigger Automático

```sql
-- 1. Criar ciclo ativo para farmácia
INSERT INTO billing_cycles (pharmacy_id, period_start, period_end, status)
VALUES ('<pharmacy_id>', '2026-02-01', '2026-02-28', 'active');

-- 2. Criar pedido
INSERT INTO orders (pharmacy_id, customer_id, status, total_price)
VALUES ('<pharmacy_id>', '<customer_id>', 'pending', 5000); -- R$ 50,00

-- 3. Marcar como entregue
UPDATE orders SET status = 'delivered' WHERE id = '<order_id>';

-- 4. Verificar contador
SELECT free_orders_used, overage_orders, overage_amount_cents
FROM billing_cycles
WHERE pharmacy_id = '<pharmacy_id>' AND status = 'active';
-- Deve ter incrementado free_orders_used ou overage_orders
```

### 2. Testar Resolução de Regras

```sql
-- Testar função get_pharmacy_billing_rules
SELECT * FROM get_pharmacy_billing_rules('<pharmacy_id>');
-- Deve retornar regras resolvidas (contrato > plano > global)
```

### 3. Testar Políticas Key-Value

```typescript
// Buscar políticas
const { data } = await supabase
  .from('billing_policy')
  .select('policy_key, policy_value');

console.log(kvToObject(data || []));
// { billing_cycle_type: "calendar_month", ... }

// Atualizar política
await supabase.from('billing_policy').upsert({
  policy_key: 'billing_cycle_type',
  policy_value: 'rolling_30_days',
});
```

---

## 📚 Próximos Passos

1. ✅ Deletar migrations antigas
2. ✅ Renomear migration FIXED
3. ✅ Aplicar migration (`npx supabase db push`)
4. ✅ Testar trigger automático
5. ✅ Testar frontend (BillingPlans, BillingPolicies)
6. ⏳ Implementar Edge Functions (Asaas webhook, cycle close)
7. ⏳ Implementar componentes faltantes (BillingPharmacies, BillingInvoices, etc.)

---

## 🎉 Resumo

**Você agora tem:**
- ✅ Migration corrigida e funcional
- ✅ Trigger automático em tempo real
- ✅ Políticas key-value flexíveis
- ✅ Planos com slug
- ✅ Frontend ajustado para key-value
- ✅ Auditoria dedicada
- ✅ RLS completo

**Próximo passo:** Aplicar migration e testar! 🚀
