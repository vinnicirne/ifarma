# 🚀 GUIA RÁPIDO - INÍCIO IMEDIATO

## ⚡ 3 Passos para Começar

### 1️⃣ EXECUTAR MIGRAÇÕES (5 minutos)

Acesse o **Supabase Dashboard** → **SQL Editor**

**Passo A:** Cole e execute:
```
supabase/migrations/20240210_advanced_catalog.sql
```
✅ Aguarde: "Query executed successfully"

**Passo B:** Cole e execute:
```
supabase/migrations/20240210_anvisa_catalog_10k.sql
```
✅ Aguarde: "Catálogo ANVISA atualizado com sucesso"

**Passo C (Opcional):** Verificar instalação:
```
supabase/migrations/VERIFICACAO_INSTALACAO.sql
```
✅ Deve mostrar ~10.027 produtos no catálogo

---

### 2️⃣ TESTAR FUNCIONALIDADES (10 minutos)

#### A) Testar Categorias Hierárquicas
1. Acesse: `http://localhost:5173/dashboard/categories`
2. Clique em **"+ NOVA CATEGORIA"**
3. Crie: "Medicamentos" (sem pai)
4. Crie: "Analgésicos" (pai: Medicamentos)
5. ✅ Veja a hierarquia funcionando

#### B) Testar Coleções
1. Acesse: `http://localhost:5173/dashboard/collections`
2. Clique em **"+ NOVA COLEÇÃO"**
3. Crie: "Dor e Febre" (tipo: Por Sintoma)
4. ✅ Veja o badge colorido

#### C) Testar Inventário Avançado
1. Acesse: `http://localhost:5173/gestor/products`
2. Clique em **"ADICIONAR PRODUTO"**
3. Digite "Dipirona" na busca ANVISA
4. Selecione um resultado
5. ✅ Campos preenchidos automaticamente
6. Preencha: Dosagem, Tags, Instruções
7. Salve
8. ✅ Produto criado com dados ricos

#### D) Testar Cadastro Motoboy (Corrigido)
1. Acesse: `http://localhost:5173/gestor/equipe`
2. Clique em **"CADASTRAR NA EQUIPE"**
3. Selecione: "Motoboy"
4. Deixe um campo vazio → ✅ Veja erro específico
5. Preencha tudo → ✅ Cadastro funciona

---

### 3️⃣ POPULAR DADOS INICIAIS (5 minutos)

Execute no **SQL Editor**:

```sql
-- Criar coleções principais
INSERT INTO public.collections (name, slug, type) VALUES
('Gripe e Resfriado', 'gripe-resfriado', 'symptom'),
('Dor e Febre', 'dor-febre', 'symptom'),
('Infantil', 'infantil', 'audience'),
('Gestante', 'gestante', 'audience'),
('Imunidade', 'imunidade', 'symptom'),
('Black Friday', 'black-friday', 'campaign')
ON CONFLICT (slug) DO NOTHING;

-- Criar badges
INSERT INTO public.badges (name, slug, color) VALUES
('Mais Vendido', 'mais-vendido', '#f59e0b'),
('Melhor Preço', 'melhor-preco', '#10b981'),
('Entrega Rápida', 'entrega-rapida', '#3b82f6'),
('Recomendado', 'recomendado', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;
```

---

## 🎯 CHECKLIST DE SUCESSO

Marque conforme completa:

- [ ] Migração `20240210_advanced_catalog.sql` executada
- [ ] Migração `20240210_anvisa_catalog_10k.sql` executada
- [ ] Verificação mostra ~10.027 produtos
- [ ] Categorias hierárquicas funcionando
- [ ] Coleções criadas e visíveis
- [ ] Inventário com novos campos
- [ ] Busca ANVISA retorna resultados
- [ ] Cadastro motoboy validando campos
- [ ] Sidebar mostra link "COLEÇÕES"

---

## 🆘 PROBLEMAS COMUNS

### ❌ "Relation 'product_catalog' does not exist"
**Solução:** Execute `20240210_anvisa_catalog_10k.sql`

### ❌ "Column 'parent_id' does not exist"
**Solução:** Execute `20240210_advanced_catalog.sql`

### ❌ Busca ANVISA não retorna nada
**Solução:** 
```sql
SELECT COUNT(*) FROM product_catalog;
-- Deve retornar ~10027
```

### ❌ Botão Cadastrar Motoboy não funciona
**Solução:** Preencha TODOS os campos (incluindo Nome no topo)

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para detalhes técnicos, consulte:
- `IMPLEMENTACAO_CATALOGO_AVANCADO.md` (este diretório)

---

## ✅ PRONTO!

Agora você tem:
- ✅ 10.000+ produtos no catálogo ANVISA
- ✅ Sistema de categorias hierárquicas
- ✅ Coleções por sintoma/público
- ✅ Inventário com campos ricos
- ✅ Busca inteligente
- ✅ Cadastro de motoboy corrigido

**Próximo passo:** Comece a cadastrar produtos reais nas farmácias!

---

**Tempo Total:** ~20 minutos
**Dificuldade:** ⭐⭐ (Fácil)
**Status:** ✅ Pronto para Produção
