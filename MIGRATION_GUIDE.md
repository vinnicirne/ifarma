# 🔧 Migration System - Guia Completo

Este guia explica como usar o sistema de migrations do Ifarma com tracking automático e testes de integridade.

---

## 📋 Índice

1. [Instalação do Supabase CLI](#instalação)
2. [Sistema de Migration Tracking](#migration-tracking)
3. [Criando Novas Migrations](#criando-migrations)
4. [Aplicando Migrations](#aplicando-migrations)
5. [Testes de Integridade](#testes-de-integridade)
6. [Comandos Úteis](#comandos-úteis)

---

## 🚀 Instalação

### 1. Instalar Supabase CLI

**Windows (via npm):**
```bash
npm install -g supabase
```

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

### 2. Inicializar Projeto
```bash
# Na raiz do projeto
supabase init
```

### 3. Linkar com Projeto Remoto
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

---

## 📊 Migration Tracking

### Tabela `schema_migrations`

O sistema cria automaticamente uma tabela para rastrear todas as migrations:

```sql
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE,      -- Ex: 001_initial_schema
    name VARCHAR(500),                -- Nome descritivo
    applied_at TIMESTAMP,             -- Quando foi aplicada
    checksum VARCHAR(64),             -- Hash MD5 do arquivo
    execution_time_ms INTEGER,        -- Tempo de execução
    applied_by VARCHAR(255),          -- Quem aplicou
    status VARCHAR(20)                -- success/failed/rolled_back
);
```

### Instalar Migration Tracking

```bash
psql -h YOUR_HOST -U postgres -d YOUR_DATABASE -f supabase/migrations/000_schema_migrations.sql
```

---

## ➕ Criando Novas Migrations

### 1. Usando Supabase CLI (Recomendado)

```bash
# Criar nova migration
supabase migration new add_new_feature

# Isso cria: supabase/migrations/TIMESTAMP_add_new_feature.sql
```

### 2. Manualmente

Criar arquivo em `supabase/migrations/` com formato:

```
NNN_description.sql
```

**Exemplo:**
```
051_add_reviews_table.sql
```

### 3. Template de Migration

```sql
-- Migration: 051_add_reviews_table
-- Description: Adicionar sistema de reviews de farmácias
-- Author: Nome do Dev
-- Date: 2026-02-03

-- UP Migration
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_reviews_pharmacy ON reviews(pharmacy_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read reviews"
    ON reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create own reviews"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Registrar migration
SELECT register_migration(
    '051_add_reviews_table',
    'Adicionar sistema de reviews de farmácias',
    md5('051_add_reviews_table_content')::varchar,
    NULL
);

-- DOWN Migration (comentado por padrão)
-- DROP TABLE IF EXISTS reviews;
```

---

## ▶️ Aplicando Migrations

### Método 1: Supabase CLI (Recomendado)

```bash
# Aplicar todas as migrations pendentes
supabase db push

# Ver status das migrations
supabase migration list

# Aplicar migration específica
supabase db push --include-all
```

### Método 2: Direct SQL

```bash
# Aplicar migration específica
psql -h YOUR_HOST -U postgres -d YOUR_DATABASE \
  -f supabase/migrations/051_add_reviews_table.sql

# Aplicar todas as migrations (Linux/macOS)
for file in supabase/migrations/*.sql; do
    psql -h YOUR_HOST -U postgres -d YOUR_DATABASE -f "$file"
done

# Aplicar todas (Windows PowerShell)
Get-ChildItem supabase\migrations\*.sql | ForEach-Object {
    psql -h YOUR_HOST -U postgres -d YOUR_DATABASE -f $_.FullName
}
```

### Método 3: Verificar Antes de Aplicar

```bash
# Gerar diff entre local e remoto
supabase db diff

# Preview antes de aplicar
supabase db push --dry-run
```

---

## 🧪 Testes de Integridade

### Executar Teste Completo

```bash
psql -h YOUR_HOST -U postgres -d YOUR_DATABASE \
  -f supabase/tests/schema_integrity_test.sql
```

**O teste verifica:**
- ✅ Tabelas essenciais existem
- ✅ RLS está habilitado
- ✅ Índices críticos estão presentes
- ✅ Foreign keys estão íntegras
- ✅ Realtime está configurado
- ✅ Migrations foram aplicadas

### Saída Esperada

```
========================================
IFARMA - SCHEMA INTEGRITY TEST
========================================

1. Verificando tabelas essenciais...
✅ Todas as tabelas essenciais existem
Total de tabelas no schema public: 25

2. Verificando Row Level Security (RLS)...
✅ Tabelas com RLS habilitado: 20
✅ Todas as tabelas críticas têm RLS

3. Verificando índices...
✅ Total de índices criados: 45
✅ Índices críticos presentes

4. Verificando Foreign Keys...
✅ Total de Foreign Keys: 18
✅ Nenhum registro órfão encontrado

5. Verificando Realtime...
✅ Tabelas com Realtime habilitado: 8

6. Verificando Migrations...
✅ Total de migrations aplicadas: 51
Última migration: 051_add_reviews_table - Reviews system
Aplicada em: 2026-02-03 13:30:00

========================================
✅ Teste de integridade concluído!
========================================
```

---

## 🛠️ Comandos Úteis

### Verificar Migrations Aplicadas

```sql
-- Listar todas as migrations
SELECT version, name, applied_at, status
FROM schema_migrations
ORDER BY applied_at DESC;

-- Última migration
SELECT * FROM get_latest_migration();

-- Ver histórico com performance
SELECT * FROM migration_history;
```

### Verificar se Migration Foi Aplicada

```sql
-- Via função
SELECT is_migration_applied('051_add_reviews_table');

-- Via query direta
SELECT EXISTS (
    SELECT 1 FROM schema_migrations 
    WHERE version = '051_add_reviews_table' 
    AND status = 'success'
);
```

### Registrar Migration Manualmente

```sql
-- Registrar migration já aplicada
SELECT register_migration(
    '051_add_reviews_table',
    'Adicionar sistema de reviews',
    md5('hash_content')::varchar,
    1500  -- tempo em ms
);
```

### Reverter Migration (Rollback)

```sql
-- Marcar como rolled_back
UPDATE schema_migrations
SET status = 'rolled_back'
WHERE version = '051_add_reviews_table';

-- Executar SQL de reversão
-- (ver seção DOWN Migration do arquivo)
```

---

## 📝 Workflow Recomendado

### 1. Desenvolvimento Local

```bash
# 1. Criar migration
supabase migration new my_feature

# 2. Editar arquivo criado
code supabase/migrations/TIMESTAMP_my_feature.sql

# 3. Testar localmente
supabase db reset  # recria banco local
supabase db push   # aplica migrations

# 4. Verificar integridade
psql -f supabase/tests/schema_integrity_test.sql
```

### 2. Deploy para Staging

```bash
# 1. Commitar migration
git add supabase/migrations/
git commit -m "feat: add my_feature migration"

# 2. Push para staging
supabase link --project-ref STAGING_PROJECT_ID
supabase db push

# 3. Verificar
supabase db remote changes
```

### 3. Deploy para Produção

```bash
# 1. Backup primeiro!
supabase db dump -f backup_pre_migration.sql

# 2. Link produção
supabase link --project-ref PROD_PROJECT_ID

# 3. Preview
supabase db push --dry-run

# 4. Aplicar
supabase db push

# 5. Verificar integridade
psql -f supabase/tests/schema_integrity_test.sql
```

---

## ⚠️ Melhores Práticas

### ✅ Fazer

- ✅ Sempre usar migrations para mudanças de schema
- ✅ Numerar migrations sequencialmente
- ✅ Incluir comentários descritivos
- ✅ Registrar migration ao final do arquivo
- ✅ Testar em local antes de produção
- ✅ Fazer backup antes de migrations grandes
- ✅ Incluir índices necessários
- ✅ Configurar RLS para novas tabelas

### ❌ Evitar

- ❌ Editar migrations já aplicadas
- ❌ Pular números de versão
- ❌ Aplicar SQL direto sem migration
- ❌ Esquecer de adicionar RLS
- ❌ Não testar rollback
- ❌ Migrations sem registro na tabela
- ❌ Deixar de documentar mudanças críticas

---

## 🔍 Troubleshooting

### Migration não aparece no histórico?

```sql
-- Verificar tabela existe
SELECT * FROM schema_migrations;

-- Se não existir, criar
\i supabase/migrations/000_schema_migrations.sql
```

### Erro "migration already applied"?

```sql
-- Verificar status
SELECT * FROM schema_migrations WHERE version = 'XXX';

-- Se necessário, remover e reaplicar
DELETE FROM schema_migrations WHERE version = 'XXX';
```

### Como resetar tudo?

```bash
# CUIDADO: Apaga tudo!
supabase db reset

# Ou manualmente
psql -f schema_completo.sql
psql -f supabase/migrations/*.sql
```

---

## 📚 Recursos

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Migration Best Practices](https://supabase.com/docs/guides/database/migrations)
- [SQL Style Guide](https://www.sqlstyle.guide/)

---

**Última atualização:** 03/02/2026  
**Mantido por:** Equipe Ifarma
