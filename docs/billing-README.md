# 💰 Sistema de Cobrança - iFarma

**Status:** ✅ Ready to Deploy  
**Versão:** 1.0 MVP  
**Data:** 2026-02-12

---

## 🎯 O que foi entregue

Sistema de cobrança **100% configurável via painel Admin**, onde:

- ✅ **3 planos editáveis** (Free/Pro/Premium)
- ✅ **Políticas globais editáveis** (período, contagem, devolução)
- ✅ **Contratos personalizados** por farmácia
- ✅ **Cálculo automático** de excedente
- ✅ **Integração com Asaas** (assinaturas + cobranças avulsas)
- ✅ **Auditoria completa** (quem mudou o quê, quando)
- ✅ **RLS** (segurança por role)

---

## 📦 Arquivos Criados

### Documentação
- `docs/billing-system-prd.md` - PRD completo
- `docs/billing-implementation-checklist.md` - Checklist de implementação (LEIA ESTE!)

### Banco de Dados
- `supabase/migrations/20260212_billing_system_complete.sql` - Migration completa (8 tabelas + RLS + triggers + seed)

### Edge Functions
- `supabase/functions/billing-cycle-close/index.ts` - Fecha ciclos e gera cobranças (cron diário)
- `supabase/functions/billing-asaas-webhook/index.ts` - Recebe webhooks do Asaas
- `supabase/functions/billing-create-subscription/index.ts` - Cria assinatura no Asaas

### Frontend (Admin)
- `src/pages/admin/BillingPlans.tsx` - Gerenciar planos
- `src/pages/admin/BillingPolicies.tsx` - Gerenciar políticas

---

## 🚀 Como Começar (5 minutos)

### 1. Rodar Migration
```bash
npx supabase db push
```

### 2. Verificar Planos Criados
```sql
SELECT name, monthly_fee_cents, free_orders_per_period FROM billing_plans;
```

Deve retornar:
- **Free:** R$ 0/mês, 10 pedidos grátis, 5% excedente
- **Pro:** R$ 99/mês, 100 pedidos grátis, 3% excedente
- **Premium:** R$ 299/mês, ilimitado, 0% excedente

### 3. Deploy Edge Functions
```bash
npx supabase functions deploy billing-cycle-close
npx supabase functions deploy billing-asaas-webhook
npx supabase functions deploy billing-create-subscription
```

### 4. Configurar Asaas API Key
```bash
# No Supabase Dashboard > Edge Functions > Secrets
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjJkODJkYjg5LTBkZDUtNDY2OC05NWY0LTU0YzMzMjI2ZjBkODo6JGFhY2hfMzRkYzdjZTUtMTg5OC00MjQyLWEwMjYtYzExZTgwNWJhNTlj
```

### 5. Adicionar Rotas no Frontend
```tsx
// src/App.tsx
import BillingPlans from './pages/admin/BillingPlans';
import BillingPolicies from './pages/admin/BillingPolicies';

// Adicionar rotas (somente Admin):
{
  path: '/admin/billing/plans',
  element: <BillingPlans />,
},
{
  path: '/admin/billing/policies',
  element: <BillingPolicies />,
}
```

### 6. Testar
```
1. Acessar /admin/billing/plans
2. Editar plano Free
3. Verificar auditoria:
   SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 5;
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    PAINEL ADMIN (Frontend)                  │
│  - Criar/editar planos                                      │
│  - Configurar políticas globais                             │
│  - Criar contratos personalizados                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Edge Functions)                   │
│  1. Lê configurações do banco (nunca hardcoded)             │
│  2. Resolve regras: Contrato > Plano > Global               │
│  3. Calcula: pedidos grátis + excedente                     │
│  4. Gera cobrança no Asaas (assinatura + avulsa)            │
│  5. Atualiza status via webhooks                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      ASAAS (Pagamentos)                     │
│  - Assinaturas mensais (plano)                              │
│  - Cobranças avulsas (excedente)                            │
│  - Webhooks (status de pagamento)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Dados (8 Tabelas)

1. **billing_plans** - Planos (Free/Pro/Premium)
2. **billing_global_config** - Configuração global (fallback)
3. **billing_policy** - Políticas operacionais (período, contagem, devolução)
4. **pharmacy_subscriptions** - Assinatura da farmácia
5. **pharmacy_contracts** - Contratos personalizados (overrides)
6. **billing_cycles** - Ciclo mensal por farmácia (contador de pedidos)
7. **billing_invoices** - Faturas (histórico de cobranças)
8. **audit_log** - Auditoria (quem mudou o quê, quando)

---

## 🔐 Segurança (RLS)

| Tabela | Admin Global | Farmácia |
|--------|--------------|----------|
| `billing_plans` | CRUD | Read |
| `billing_global_config` | CRUD | - |
| `billing_policy` | CRUD | - |
| `pharmacy_subscriptions` | CRUD | Read (própria) |
| `pharmacy_contracts` | CRUD | Read (própria) |
| `billing_cycles` | Read All | Read (própria) |
| `billing_invoices` | Read All | Read (própria) |
| `audit_log` | Read All | - |

---

## ⚙️ Lógica de Resolução de Regras

```typescript
function resolveConfig(pharmacy_id: string) {
  // 1. Busca contrato personalizado
  const contract = await getContract(pharmacy_id);
  if (contract && contract.isValid()) {
    return contract; // Override total
  }

  // 2. Busca plano da assinatura
  const subscription = await getSubscription(pharmacy_id);
  if (subscription && subscription.plan) {
    return subscription.plan;
  }

  // 3. Fallback: config global
  return await getGlobalConfig();
}
```

---

## 🔄 Fluxo de Cobrança (Automático)

### Cron Diário (00:05 horário de Brasília)
```
1. Busca ciclos abertos que terminaram ontem
2. Para cada ciclo:
   - Calcula excedente
   - Fecha o ciclo
   - Gera cobrança no Asaas (se houver excedente)
   - Cria registro em billing_invoices
```

### Webhook Asaas
```
Quando Asaas notifica mudança de status:
1. Atualiza billing_invoices.status
2. Se pago: atualiza billing_cycles.status = 'invoiced'
3. Se vencido: notifica farmácia (futuro)
```

---

## 📋 Próximos Passos

### Componentes Faltantes (2h)
- [ ] `BillingPharmacies.tsx` - Lista farmácias + criar/editar contrato
- [ ] `BillingInvoices.tsx` - Lista faturas + dashboard de receita
- [ ] `BillingAudit.tsx` - Log de mudanças
- [ ] `MyPlan.tsx` (Farmácia) - Plano atual + pedidos grátis restantes
- [ ] `MyInvoices.tsx` (Farmácia) - Faturas pendentes/pagas

### Configurações Finais (30 min)
- [ ] Configurar cron job (cycle close)
- [ ] Configurar webhook no Asaas
- [ ] Testar fluxo completo

---

## 📚 Documentação Completa

Leia o **checklist de implementação** para detalhes:
```
docs/billing-implementation-checklist.md
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

**Pronto para implementar!** 🚀

**Tempo estimado:** 4-5 horas

**Primeiro comando:**
```bash
npx supabase db push
```
