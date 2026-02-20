# Auditoria do Sistema Ifarma - Fevereiro 2026

## Resumo Executivo

Auditoria rigorosa identificou e corrigiu **falhas de schema**, **bugs de frontend** e **inconsistências** entre o banco de dados e o código.

---

## 1. Falhas de Schema (PGRST204)

### Problema
O frontend enviava colunas inexistentes nas tabelas `pharmacies` e `products`, causando erro `Could not find the 'X' column in the schema cache`.

### Correções Aplicadas

| Arquivo | Correção |
|---------|----------|
| **PharmacyDetails.tsx** | Removido `phone` e `rating` do payload de update |
| **StoreCustomization.tsx** | Removido `phone` do update (usar apenas `establishment_phone`) |
| **adminService.ts** | Select alterado de `phone, establishment_phone` para `establishment_phone, owner_phone` |
| **AdminDashboard.tsx** | Fallback de telefone: `establishment_phone \|\| owner_phone` |
| **InventoryControl.tsx** | Removidos do payload: `control_level`, `dosage`, `quantity_label`, `principle_active`, `tags`, `synonyms`, `usage_instructions` |
| **HomeComponents.tsx** | Select de produtos: `promo_price` em vez de `promotional_price` |
| **whatsapp-notifier** (Edge) | Select: `establishment_phone, owner_phone` em vez de `phone` |
| **billing-create-subscription** (Edge) | Fallback: `establishment_phone \|\| owner_phone \|\| phone` |
| **MerchantOrderManagement.tsx** | `pharmacyPhone`: `establishment_phone \|\| owner_phone \|\| phone` |

### Migração Criada
- **`supabase/migrations/20260216000000_schema_alignment.sql`** — Adiciona colunas faltantes (IF NOT EXISTS). Execute para habilitar o catálogo avançado de produtos e campos completos de farmácias.

---

## 2. Bugs de Frontend

| Arquivo | Problema | Correção |
|---------|----------|----------|
| **PharmacyDetails.tsx** | `toast is not defined` | Adicionado `import { toast } from 'react-hot-toast'` |
| **PharmacyDetails.tsx** | `owner_id` não existe em formData | Adicionado `owner_id` ao estado inicial |
| **PharmacyFinanceTab.tsx** | `block_after_limit` não existe em PharmacyContract | Corrigido para `block_after_free_limit` |

---

## 3. Configuração

- **supabase/config.toml**: `project_id = "YOUR_PROJECT_ID"` — Configure com o ID real do projeto no Supabase.
- **Variáveis de ambiente**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_MAPS_API_KEY` — Verificar `.env` e `.env.example`.

---

## 4. Próximos Passos Recomendados

1. **Executar migração de alinhamento** no Supabase (local ou remoto):
   ```bash
   supabase db push
   # ou
   supabase migration up
   ```

2. **Reativar campos de produto** (após migração): Em `InventoryControl.tsx`, reabilitar `dosage`, `principle_active`, `tags`, `control_level`, `usage_instructions` no payload.

3. **Validar Edge Functions**: Garantir que as variáveis `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_API_URL`, etc. estejam configuradas no projeto Supabase.
