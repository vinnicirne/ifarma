# 📊 Sistema de Cobrança - Resumo Executivo

**Data:** 2026-02-12  
**Status:** ✅ Pronto para Deploy  
**Tempo estimado de implementação:** 4-5 horas

---

## 🎯 O que foi entregue

Sistema de cobrança **100% configurável via painel Admin**, sem necessidade de mexer em código.

### ✅ Funcionalidades Principais

1. **Planos Editáveis** (Free/Pro/Premium)
   - Mensalidade
   - Pedidos grátis por período
   - % de excedente
   - Taxa fixa por pedido excedente
   - Bloqueio após limite

2. **Políticas Globais Editáveis**
   - Tipo de período (mês calendário vs rolling 30 dias)
   - Contagem (só entregue vs todos)
   - Política de devolução
   - Geração de fatura (auto vs manual)

3. **Contratos Personalizados**
   - Override de qualquer campo do plano
   - Validade (início/fim)
   - Notas

4. **Cálculo Automático**
   - Conta pedidos entregues no período
   - Calcula excedente
   - Gera cobrança no Asaas

5. **Auditoria Completa**
   - Quem mudou
   - O que mudou
   - Quando mudou
   - Valores antigos/novos

---

## 📦 Arquivos Criados (11 arquivos)

### Documentação (3)
- ✅ `docs/billing-system-prd.md` - PRD completo
- ✅ `docs/billing-implementation-checklist.md` - Checklist de implementação
- ✅ `docs/billing-README.md` - README rápido

### Banco de Dados (1)
- ✅ `supabase/migrations/20260212_billing_system_complete.sql`
  - 8 tabelas
  - RLS policies
  - Triggers de auditoria
  - Funções auxiliares (`get_billing_config`, `ensure_billing_cycle`)
  - Seed data (3 planos: Free/Pro/Premium)

### Edge Functions (3)
- ✅ `supabase/functions/billing-cycle-close/index.ts` - Fecha ciclos e gera cobranças (cron)
- ✅ `supabase/functions/billing-asaas-webhook/index.ts` - Recebe webhooks do Asaas
- ✅ `supabase/functions/billing-create-subscription/index.ts` - Cria assinatura

### Frontend (2)
- ✅ `src/pages/admin/BillingPlans.tsx` - Gerenciar planos
- ✅ `src/pages/admin/BillingPolicies.tsx` - Gerenciar políticas

### Faltam (5 componentes - 2h)
- ⏳ `src/pages/admin/BillingPharmacies.tsx` - Lista farmácias + criar/editar contrato
- ⏳ `src/pages/admin/BillingInvoices.tsx` - Lista faturas + dashboard de receita
- ⏳ `src/pages/admin/BillingAudit.tsx` - Log de mudanças
- ⏳ `src/pages/pharmacy/MyPlan.tsx` - Plano atual + pedidos grátis restantes
- ⏳ `src/pages/pharmacy/MyInvoices.tsx` - Faturas pendentes/pagas

---

## 🏗️ Arquitetura (3 Camadas)

```
PAINEL ADMIN → BACKEND (Edge Functions) → ASAAS
     ↓                    ↓                    ↓
  Edita Config      Lê Config do Banco    Gera Cobrança
  Cria Planos       Calcula Excedente     Envia Boleto
  Define Regras     Resolve Prioridades   Notifica Status
```

### Lógica de Resolução de Regras

```
1. Contrato Personalizado (override total)
   ↓ (se não existir)
2. Plano da Assinatura
   ↓ (se não existir)
3. Configuração Global (fallback)
```

---

## 📊 Modelo de Dados (8 Tabelas)

| Tabela | Descrição | Quem Edita |
|--------|-----------|------------|
| `billing_plans` | Planos (Free/Pro/Premium) | Admin |
| `billing_global_config` | Config global (fallback) | Admin |
| `billing_policy` | Políticas operacionais | Admin |
| `pharmacy_subscriptions` | Assinatura da farmácia | Admin |
| `pharmacy_contracts` | Contratos personalizados | Admin |
| `billing_cycles` | Ciclo mensal (contador) | Sistema |
| `billing_invoices` | Faturas (histórico) | Sistema |
| `audit_log` | Auditoria (mudanças) | Sistema |

---

## 🔄 Fluxo de Cobrança (Automático)

### Cron Diário (00:05 horário de Brasília)
```
1. Busca ciclos abertos que terminaram ontem
2. Para cada ciclo:
   a. Busca configuração (contrato > plano > global)
   b. Conta pedidos entregues no período
   c. Calcula excedente (pedidos - grátis)
   d. Calcula taxa (% sobre valor + taxa fixa)
   e. Fecha o ciclo
   f. Gera cobrança no Asaas (se excedente > 0)
   g. Cria registro em billing_invoices
```

### Webhook Asaas
```
Quando Asaas notifica mudança de status:
1. Atualiza billing_invoices.status
2. Se pago: atualiza billing_cycles.status = 'invoiced'
3. Se vencido: notifica farmácia (futuro)
```

---

## 🚀 Como Começar (Ordem de Execução)

### Fase 1: Banco de Dados (30 min)
```bash
# 1. Rodar migration
npx supabase db push

# 2. Verificar planos criados
# SQL: SELECT name, monthly_fee_cents FROM billing_plans;

# 3. Testar RLS
node test_rls_access.js
```

### Fase 2: Edge Functions (45 min)
```bash
# 1. Deploy functions
npx supabase functions deploy billing-cycle-close
npx supabase functions deploy billing-asaas-webhook
npx supabase functions deploy billing-create-subscription

# 2. Configurar secrets
# No Dashboard: ASAAS_API_KEY = $aact_prod_...

# 3. Configurar cron (no Dashboard)
# 4. Configurar webhook no Asaas
```

### Fase 3: Frontend (1h)
```tsx
// 1. Adicionar rotas
import BillingPlans from './pages/admin/BillingPlans';
import BillingPolicies from './pages/admin/BillingPolicies';

// 2. Adicionar menu Admin
<Link to="/admin/billing/plans">💳 Planos</Link>
<Link to="/admin/billing/policies">⚙️ Políticas</Link>

// 3. Testar telas
```

### Fase 4: Testes (1h)
```
1. Teste: Resolução de regras (contrato > plano > global)
2. Teste: Cálculo de excedente
3. Teste: Geração de fatura no Asaas
4. Teste: Webhook de pagamento
```

### Fase 5: Componentes Faltantes (2h)
```
1. BillingPharmacies.tsx
2. BillingInvoices.tsx
3. BillingAudit.tsx
4. MyPlan.tsx (Farmácia)
5. MyInvoices.tsx (Farmácia)
```

---

## 🔐 Segurança

### RLS (Row Level Security)
- ✅ Admin Global: CRUD em planos, políticas, contratos
- ✅ Farmácia: Read apenas (próprios dados)
- ✅ Auditoria: Log de mudanças

### Variáveis de Ambiente
- ✅ `ASAAS_API_KEY` - Não hardcoded
- ✅ `ASAAS_WEBHOOK_TOKEN` - Opcional

---

## 📈 Monitoramento (Pós-Deploy)

### Logs
```bash
# Ver logs de billing-cycle-close
npx supabase functions logs billing-cycle-close

# Ver logs de billing-asaas-webhook
npx supabase functions logs billing-asaas-webhook
```

### Queries de Monitoramento
```sql
-- Ciclos fechados hoje
SELECT * FROM billing_cycles WHERE closed_at::date = CURRENT_DATE;

-- Faturas pendentes
SELECT * FROM billing_invoices WHERE status = 'pending' ORDER BY due_date;

-- Farmácias com excedente este mês
SELECT p.name, bc.overage_orders, bc.overage_fee_cents
FROM billing_cycles bc
JOIN pharmacies p ON p.id = bc.pharmacy_id
WHERE bc.period_start = date_trunc('month', CURRENT_DATE)
AND bc.overage_orders > 0;
```

---

## 🎯 Critérios de Sucesso

MVP completo quando:
- ✅ Planos editáveis no painel
- ✅ Políticas editáveis no painel
- ✅ Ciclos fecham automaticamente (cron)
- ✅ Excedente calculado corretamente
- ✅ Fatura gerada no Asaas
- ✅ Webhook atualiza status
- ✅ Auditoria registra mudanças
- ✅ RLS protege dados

---

## 📚 Documentação

- **PRD Completo:** `docs/billing-system-prd.md`
- **Checklist de Implementação:** `docs/billing-implementation-checklist.md`
- **README Rápido:** `docs/billing-README.md`

---

## 🚨 Importante

### Asaas Sandbox vs Produção
```
Sandbox: https://api-sandbox.asaas.com/v3
Produção: https://api.asaas.com/v3

Trocar ASAAS_API_KEY quando for pra produção!
```

### Backup Antes de Deploy
```bash
npx supabase db dump > backup_$(date +%Y%m%d).sql
```

---

## 📞 Próximo Passo

**Começar agora:**
```bash
npx supabase db push
```

**Tempo total:** 4-5 horas

**Ordem:** Banco → Edge Functions → Frontend → Testes → Componentes Faltantes

---

**Pronto para implementar!** 🚀
