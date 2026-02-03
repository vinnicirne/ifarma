# 📁 Estrutura de Arquivos SQL - Projeto Ifarma

Este diretório mantém apenas os arquivos SQL essenciais. A estrutura completa foi reorganizada!

## 📌 Arquivos no Root (3)

### `schema_completo.sql`
**Schema completo do banco de dados**  
- Definição de todas as tabelas
- RLS policies básicas
- Indexes e constraints
- **Uso:** Deploy inicial ou recriação total

### `reset_database.sql`
**Script de reset total do banco**  
- Deleta todas as tabelas
- Limpa dados
- **⚠️ CUIDADO:** Uso apenas em desenvolvimento!

### `manual_approve_pharmacy.sql`
**Aprovação manual de farmácias**  
- Script administrativo útil
- Bypass do workflow normal quando necessário

---

## 🗂️ Estrutura Organizada

### `supabase/migrations/`
**Migrations numeradas e ordenadas** (50+ arquivos)  
Formato: `001_nome_descritivo.sql`

Categorias:
- `001-010`: Schema base e colunas
- `011-030`: RLS policies
- `031-050`: Updates e melhorias

### `supabase/seeds/dev/`
**Dados de teste e desenvolvimento** (10 arquivos)
- `create_admin.sql` - Criar usuário admin
- `create_test_order.sql` - Pedidos de teste
- `create_product_catalog.sql` - Catálogo exemplo
- etc.

### `supabase/archive/old_fixes/`
**Fixes antigos e históricos** (15+ arquivos)
- Versões anteriores de correções
- Fixes supersedidos
- **Uso:** Referência histórica

### `supabase/archive/diagnostics/`
**Scripts de diagnóstico** (8 arquivos)
- `verify_*.sql` - Verificações
- `check_*.sql` - Checagens
- `diagnose_*.sql` - Diagnósticos
- **Uso:** Troubleshooting

---

## 🚀 Como Usar

### Deploy Fresh (Novo Banco)
```bash
# Execute na ordem:
psql -f schema_completo.sql
psql -f supabase/migrations/*.sql
psql -f supabase/seeds/dev/*.sql  # Opcional
```

### Reset Completo (Dev)
```bash
psql -f reset_database.sql
psql -f schema_completo.sql
```

### Nova Migration
1. Criar arquivo: `supabase/migrations/0XX_descricao.sql`
2. Numerar sequencialmente
3. Aplicar: `psql -f supabase/migrations/0XX_descricao.sql`

---

## 📊 Estatísticas

- **Antes da reorganização:** 93 arquivos SQL no root ❌
- **Depois da reorganização:** 3 arquivos SQL no root ✅
- **Migrations organizadas:** 50+ arquivos
- **Seeds de dev:** 10 arquivos
- **Arquivos arquivados:** 23 arquivos

**Resultado:** -87% de desordem! 🎉

---

**Última atualização:** 03/02/2026  
**Responsável:** Limpeza digital automatizada
