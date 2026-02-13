# 💰 Módulo Financeiro (MVP+) - Plano de Implementação

**Objetivo**: Sistema de planos, mensalidade recorrente e cobrança por uso, totalmente configurável via painel Admin.

---

## 🎯 Princípios de Arquitetura

### ✅ Configuração no Painel, Execução no Backend

- **Front-end**: Interface para criar/editar planos, contratos e políticas
- **Backend**: Lê configurações do banco e aplica regras de cobrança
- **Asaas**: Processa pagamentos (recorrência + faturas avulsas)

### 🔒 Prioridade de Regras (Cascata)

```
1. Contrato Personalizado (pharmacy_contracts)
   ↓
2. Plano Contratado (billing_plans)
   ↓
3. Configuração Global (billing_global_config)
```

---

## 📊 Estrutura de Dados

### Tabelas Principais

#### 1. `billing_plans`
Planos padrão (Free, Professional, Premium)

```sql
- id (uuid)
- name (text) - "Free", "Professional", "Premium"
- slug (text) - "free", "professional", "premium"
- monthly_fee_cents (int) - Mensalidade em centavos
- free_orders_per_period (int) - Pedidos grátis por mês
- overage_percent_bp (int) - Percentual em basis points (500 = 5%)
- overage_fixed_fee_cents (int) - Taxa fixa por pedido excedente (opcional)
- block_after_free_limit (bool) - Bloqueia novos pedidos ao atingir limite
- is_active (bool)
- created_at, updated_at
```

#### 2. `billing_global_config`
Configuração global (fallback)

```sql
- id (uuid)
- config_key (text) - "default_plan_settings"
- monthly_fee_cents (int)
- free_orders_per_period (int)
- overage_percent_bp (int)
- overage_fixed_fee_cents (int)
- block_after_free_limit (bool)
- updated_at
```

#### 3. `billing_policy`
Políticas operacionais (como o sistema funciona)

```sql
- id (uuid)
- policy_key (text) - "billing_cycle_type", "order_count_trigger", etc.
- policy_value (text) - "calendar_month", "delivered_only", etc.
- description (text)
- updated_at
```

**Políticas MVP**:
- `billing_cycle_type`: `calendar_month` (1º ao último dia do mês)
- `order_count_trigger`: `delivered_only` (só conta pedidos entregues)
- `invoice_generation`: `auto` (cron automático)
- `refund_policy`: `no_refund_count` (devolvido não desconta)

#### 4. `pharmacy_subscriptions`
Assinatura da farmácia (qual plano está usando)

```sql
- id (uuid)
- pharmacy_id (uuid) FK -> pharmacies
- plan_id (uuid) FK -> billing_plans
- asaas_subscription_id (text) - ID da assinatura no Asaas
- status (text) - "active", "overdue", "canceled"
- started_at (timestamp)
- next_billing_date (date)
- created_at, updated_at
```

#### 5. `pharmacy_contracts`
Contratos personalizados (overrides)

```sql
- id (uuid)
- pharmacy_id (uuid) FK -> pharmacies
- override_monthly_fee_cents (int) - nullable
- override_free_orders (int) - nullable
- override_overage_percent_bp (int) - nullable
- override_overage_fixed_fee_cents (int) - nullable
- override_block_after_limit (bool) - nullable
- valid_from (date)
- valid_until (date) - nullable
- notes (text) - Observações comerciais
- created_by (uuid) FK -> profiles
- created_at, updated_at
```

#### 6. `billing_cycles`
Ciclo mensal de cada farmácia (contador de pedidos)

```sql
- id (uuid)
- pharmacy_id (uuid) FK -> pharmacies
- period_start (date)
- period_end (date)
- free_orders_used (int) - Contador de pedidos grátis
- overage_orders (int) - Pedidos excedentes
- overage_amount_cents (int) - Valor calculado do excedente
- status (text) - "active", "closed", "invoiced"
- closed_at (timestamp)
- created_at, updated_at
```

#### 7. `billing_invoices`
Histórico de faturas (Asaas)

```sql
- id (uuid)
- pharmacy_id (uuid) FK -> pharmacies
- cycle_id (uuid) FK -> billing_cycles (nullable, se for mensalidade)
- invoice_type (text) - "monthly_fee", "overage"
- asaas_invoice_id (text)
- amount_cents (int)
- due_date (date)
- paid_at (timestamp)
- status (text) - "pending", "paid", "overdue", "canceled"
- asaas_invoice_url (text)
- created_at, updated_at
```

#### 8. `billing_audit_log`
Auditoria de mudanças (obrigatório)

```sql
- id (uuid)
- table_name (text) - "billing_plans", "pharmacy_contracts", etc.
- record_id (uuid)
- action (text) - "created", "updated", "deleted"
- old_values (jsonb)
- new_values (jsonb)
- changed_by (uuid) FK -> profiles
- changed_at (timestamp)
```

---

## 🔄 Fluxo de Cobrança (Ciclo Mensal)

### 1️⃣ Início do Mês (Dia 1)
**Edge Function**: `reset-billing-cycles` (cron diário)

```typescript
// Para cada farmácia ativa:
1. Fecha ciclo anterior (se existir)
2. Cria novo ciclo:
   - period_start = 1º do mês
   - period_end = último dia do mês
   - free_orders_used = 0
   - overage_orders = 0
   - status = "active"
```

### 2️⃣ Durante o Mês (Pedido Entregue)
**Database Trigger**: `on_order_delivered`

```typescript
// Quando order.status = "delivered":
1. Busca ciclo ativo da farmácia
2. Resolve regras (contrato > plano > global)
3. Incrementa contador:
   - Se free_orders_used < free_orders_per_period:
     → free_orders_used++
   - Senão:
     → overage_orders++
     → Calcula overage_amount_cents
4. Verifica bloqueio:
   - Se block_after_free_limit = true E free_orders_used >= limite:
     → Marca farmácia como "blocked_new_orders"
```

### 3️⃣ Fim do Mês (Dia 1 do mês seguinte)
**Edge Function**: `close-billing-cycles` (cron diário)

```typescript
// Para cada ciclo do mês anterior:
1. Marca status = "closed"
2. Se overage_orders > 0:
   → Cria fatura no Asaas (invoice_type = "overage")
   → Salva em billing_invoices
3. Marca status = "invoiced"
```

### 4️⃣ Mensalidade Recorrente
**Asaas Subscription**: criada na ativação do plano

```typescript
// Quando farmácia ativa plano:
1. Cria assinatura no Asaas:
   - value = monthly_fee_cents / 100
   - cycle = "MONTHLY"
   - billingType = "BOLETO" ou "PIX"
2. Salva asaas_subscription_id em pharmacy_subscriptions
3. Webhook do Asaas atualiza status (paid/overdue)
```

---

## 🔌 Integração Asaas

### Endpoints Necessários

#### 1. Criar Assinatura (Mensalidade)
```http
POST https://api.asaas.com/v3/subscriptions
{
  "customer": "cus_xxx",
  "billingType": "BOLETO",
  "value": 99.90,
  "nextDueDate": "2026-03-01",
  "cycle": "MONTHLY",
  "description": "Plano Professional - Farmácia XYZ"
}
```

#### 2. Criar Cobrança Avulsa (Excedente)
```http
POST https://api.asaas.com/v3/payments
{
  "customer": "cus_xxx",
  "billingType": "BOLETO",
  "value": 45.50,
  "dueDate": "2026-03-05",
  "description": "Cobrança por uso - 40 pedidos excedentes"
}
```

#### 3. Webhooks (Receber Notificações)
**Edge Function**: `asaas-webhook-handler`

```typescript
// Eventos a escutar:
- PAYMENT_RECEIVED → Atualiza billing_invoices (status = "paid")
- PAYMENT_OVERDUE → Atualiza pharmacy_subscriptions (status = "overdue")
- PAYMENT_DELETED → Atualiza billing_invoices (status = "canceled")
```

---

## 🎨 Telas do Painel

### Admin Global

#### 1. **Gestão de Planos** (`/admin/billing/plans`)
- Lista de planos (Free, Pro, Premium)
- Botão "Criar Plano" / "Editar Plano"
- Formulário:
  - Nome
  - Mensalidade (R$)
  - Pedidos grátis
  - Percentual de excedente (%)
  - Taxa fixa por pedido (R$)
  - Bloquear ao atingir limite? (checkbox)
  - Ativo? (checkbox)

#### 2. **Políticas Operacionais** (`/admin/billing/policies`)
- Lista de políticas (billing_policy)
- Edição inline:
  - Tipo de ciclo: Mês calendário / Rolling 30 dias
  - Quando contar pedido: Entregue / Confirmado
  - Geração de fatura: Automática / Manual
  - Política de devolução: Não desconta / Desconta

#### 3. **Assinaturas de Farmácias** (`/admin/billing/subscriptions`)
- Tabela com:
  - Farmácia
  - Plano atual
  - Status (ativa, inadimplente, cancelada)
  - Próxima cobrança
  - Ações: Ver detalhes / Criar contrato / Cancelar
- Filtros: Status, Plano

#### 4. **Contratos Personalizados** (`/admin/billing/contracts`)
- Lista de contratos ativos
- Botão "Criar Contrato"
- Formulário:
  - Farmácia (select)
  - Sobrescrever mensalidade? (R$)
  - Sobrescrever pedidos grátis? (número)
  - Sobrescrever percentual? (%)
  - Sobrescrever taxa fixa? (R$)
  - Validade (data início / fim)
  - Observações (textarea)

#### 5. **Receita e Faturas** (`/admin/billing/revenue`)
- Cards:
  - MRR (Monthly Recurring Revenue)
  - Receita por uso (mês atual)
  - Inadimplência (%)
- Tabela de faturas:
  - Farmácia
  - Tipo (mensalidade / excedente)
  - Valor
  - Vencimento
  - Status
  - Link Asaas

### Painel da Farmácia

#### 1. **Meu Plano** (`/pharmacy/billing/plan`)
- Card com:
  - Nome do plano
  - Mensalidade
  - Pedidos grátis por mês
  - Percentual de excedente
  - Status da assinatura

#### 2. **Uso no Mês** (`/pharmacy/billing/usage`)
- Barra de progresso:
  - Pedidos usados / Limite grátis
  - Pedidos excedentes
  - Valor estimado do mês
- Alerta se próximo do limite

#### 3. **Faturas** (`/pharmacy/billing/invoices`)
- Lista de faturas:
  - Tipo
  - Valor
  - Vencimento
  - Status
  - Link para pagar (Asaas)

---

## 🛠️ Edge Functions

### 1. `reset-billing-cycles`
**Cron**: Diário (00:05 UTC)
**Função**: Cria novos ciclos no início do mês

```typescript
// Pseudo-código:
if (hoje é dia 1 do mês) {
  for (farmácia ativa) {
    criar novo billing_cycle {
      period_start: 1º do mês
      period_end: último dia do mês
      free_orders_used: 0
      overage_orders: 0
      status: "active"
    }
  }
}
```

### 2. `close-billing-cycles`
**Cron**: Diário (01:00 UTC)
**Função**: Fecha ciclos do mês anterior e gera faturas de excedente

```typescript
// Pseudo-código:
if (hoje é dia 1 do mês) {
  ciclos_mes_anterior = buscar ciclos com status "active" e period_end < hoje
  
  for (ciclo in ciclos_mes_anterior) {
    ciclo.status = "closed"
    ciclo.closed_at = agora
    
    if (ciclo.overage_orders > 0) {
      // Criar fatura no Asaas
      fatura = asaas.createPayment({
        customer: farmácia.asaas_customer_id,
        value: ciclo.overage_amount_cents / 100,
        dueDate: hoje + 5 dias,
        description: `Cobrança por uso - ${ciclo.overage_orders} pedidos`
      })
      
      // Salvar no banco
      billing_invoices.insert({
        pharmacy_id: ciclo.pharmacy_id,
        cycle_id: ciclo.id,
        invoice_type: "overage",
        asaas_invoice_id: fatura.id,
        amount_cents: ciclo.overage_amount_cents,
        due_date: fatura.dueDate,
        status: "pending",
        asaas_invoice_url: fatura.invoiceUrl
      })
      
      ciclo.status = "invoiced"
    }
  }
}
```

### 3. `asaas-webhook-handler`
**Endpoint**: `/functions/v1/asaas-webhook`
**Função**: Recebe notificações do Asaas e atualiza status

```typescript
// Pseudo-código:
switch (event.type) {
  case "PAYMENT_RECEIVED":
    billing_invoices.update({
      asaas_invoice_id: event.payment.id,
      status: "paid",
      paid_at: event.payment.paymentDate
    })
    break
    
  case "PAYMENT_OVERDUE":
    fatura = billing_invoices.findBy({ asaas_invoice_id: event.payment.id })
    fatura.status = "overdue"
    
    if (fatura.invoice_type === "monthly_fee") {
      pharmacy_subscriptions.update({
        pharmacy_id: fatura.pharmacy_id,
        status: "overdue"
      })
    }
    break
    
  case "PAYMENT_DELETED":
    billing_invoices.update({
      asaas_invoice_id: event.payment.id,
      status: "canceled"
    })
    break
}
```

### 4. `activate-pharmacy-plan`
**Endpoint**: `/functions/v1/activate-pharmacy-plan`
**Função**: Ativa plano e cria assinatura no Asaas

```typescript
// Pseudo-código:
function activatePlan(pharmacy_id, plan_id) {
  farmácia = pharmacies.findById(pharmacy_id)
  plano = billing_plans.findById(plan_id)
  
  // Criar cliente no Asaas (se não existir)
  if (!farmácia.asaas_customer_id) {
    cliente = asaas.createCustomer({
      name: farmácia.name,
      email: farmácia.email,
      cpfCnpj: farmácia.cnpj
    })
    farmácia.asaas_customer_id = cliente.id
  }
  
  // Criar assinatura (se mensalidade > 0)
  if (plano.monthly_fee_cents > 0) {
    assinatura = asaas.createSubscription({
      customer: farmácia.asaas_customer_id,
      value: plano.monthly_fee_cents / 100,
      cycle: "MONTHLY",
      nextDueDate: próximo dia 1º do mês
    })
    
    pharmacy_subscriptions.insert({
      pharmacy_id,
      plan_id,
      asaas_subscription_id: assinatura.id,
      status: "active",
      started_at: agora,
      next_billing_date: assinatura.nextDueDate
    })
  }
  
  // Criar primeiro ciclo
  billing_cycles.insert({
    pharmacy_id,
    period_start: 1º do mês atual,
    period_end: último dia do mês atual,
    free_orders_used: 0,
    overage_orders: 0,
    status: "active"
  })
}
```

---

## 🔒 RLS (Row Level Security)

### Regras de Acesso

#### Admin Global
```sql
-- Pode ler/editar TUDO
CREATE POLICY "Admin full access" ON billing_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Farmácia
```sql
-- Pode ler apenas próprio plano e faturas
CREATE POLICY "Pharmacy read own subscription" ON pharmacy_subscriptions
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Pharmacy read own invoices" ON billing_invoices
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Pode ler próprio ciclo
CREATE POLICY "Pharmacy read own cycle" ON billing_cycles
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );
```

#### Políticas (Leitura Pública)
```sql
-- Todos podem ler políticas operacionais
CREATE POLICY "Public read policies" ON billing_policy
  FOR SELECT USING (true);
```

---

## 🧪 Checklist de Validação

### Testes Unitários (Backend)

- [ ] Resolver regras (contrato > plano > global)
- [ ] Calcular excedente corretamente
- [ ] Incrementar contador apenas em pedidos entregues
- [ ] Bloquear farmácia ao atingir limite (se configurado)
- [ ] Fechar ciclo e gerar fatura de excedente
- [ ] Processar webhook do Asaas (paid/overdue)

### Testes de Integração

- [ ] Criar assinatura no Asaas (sandbox)
- [ ] Criar cobrança avulsa no Asaas
- [ ] Receber webhook e atualizar status
- [ ] Retry em caso de falha na API Asaas

### Testes de UI

- [ ] Admin: criar plano
- [ ] Admin: editar política operacional
- [ ] Admin: criar contrato personalizado
- [ ] Admin: visualizar receita (MRR + uso)
- [ ] Farmácia: ver plano atual
- [ ] Farmácia: ver uso no mês (barra de progresso)
- [ ] Farmácia: ver faturas e pagar

### Testes de Segurança

- [ ] RLS: farmácia não pode ver planos de outras
- [ ] RLS: farmácia não pode editar billing_plans
- [ ] Auditoria: log de mudanças em contratos

---

## 📅 Cronograma de Implementação

### Fase 1: Estrutura de Dados (2 dias)
- [ ] Criar tabelas SQL
- [ ] Configurar RLS
- [ ] Criar triggers (contador de pedidos)
- [ ] Popular planos padrão (Free/Pro/Premium)

### Fase 2: Edge Functions (3 dias)
- [ ] `activate-pharmacy-plan`
- [ ] `reset-billing-cycles` (cron)
- [ ] `close-billing-cycles` (cron)
- [ ] `asaas-webhook-handler`
- [ ] Testes em sandbox Asaas

### Fase 3: UI Admin (3 dias)
- [ ] Tela: Gestão de Planos
- [ ] Tela: Políticas Operacionais
- [ ] Tela: Assinaturas de Farmácias
- [ ] Tela: Contratos Personalizados
- [ ] Tela: Receita e Faturas

### Fase 4: UI Farmácia (2 dias)
- [ ] Tela: Meu Plano
- [ ] Tela: Uso no Mês
- [ ] Tela: Faturas

### Fase 5: Testes e Deploy (2 dias)
- [ ] Testes unitários
- [ ] Testes de integração (Asaas sandbox)
- [ ] Testes de UI
- [ ] Deploy em produção
- [ ] Monitoramento (logs de erro)

**Total estimado**: 12 dias úteis

---

## 🚨 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Falha na API Asaas | Alto | Retry automático + log de erro + notificação admin |
| Webhook não recebido | Médio | Cron de reconciliação (verifica status no Asaas) |
| Contador de pedidos errado | Alto | Auditoria + possibilidade de ajuste manual |
| Mudança de plano no meio do mês | Médio | Calcular proporcional (futuro) ou bloquear mudança |
| Farmácia inadimplente | Médio | Bloqueio automático após X dias (configurável) |

---

## 📚 Referências

- [Asaas API Docs](https://docs.asaas.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

**Próximo passo**: Criar schema SQL e começar implementação.
