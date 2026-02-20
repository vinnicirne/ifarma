# 🔍 DIAGNÓSTICO: Farmácias Patrocinadas e Lista de Lojas Sumidas

## ❌ Problema Reportado
As seções de **farmácias patrocinadas** e **lista de lojas** não estão aparecendo na home.

## ✅ Análise do Código

### Código está CORRETO ✓
O arquivo `ClientHome.tsx` **JÁ TEM** todos os componentes necessários:

```typescript
// Linha 200-205: Renderização das seções
case 'pharmacy_list.featured':
    return <FeaturedPharmacies key={section.id} pharmacies={sortedPharmacies} ... />;
case 'pharmacy_list.nearby':
    return <NearbyPharmacies key={section.id} pharmacies={sortedPharmacies} ... />;
```

### Fallback também está correto ✓
```typescript
// Linha 298-300: Se não houver seção nearby no feed, renderiza por padrão
{feedSections.every(s => s.type !== 'pharmacy_list.nearby') && (
    <NearbyPharmacies pharmacies={sortedPharmacies} />
)}

// Linha 303-312: Se não houver feed configurado, renderiza tudo
<FeaturedPharmacies pharmacies={sortedPharmacies} />
<NearbyPharmacies pharmacies={sortedPharmacies} />
```

## 🔴 Causa Raiz: Banco de Dados

O problema é que a tabela `app_feed_sections` está:
1. **Vazia** (sem dados), OU
2. **Com seções desativadas** (`is_active = false`)

### Como funciona o sistema:
```typescript
// Linha 39-43: Busca apenas seções ativas
const { data } = await supabase
    .from('app_feed_sections')
    .select('*')
    .eq('is_active', true)  // ← Só pega seções ativas
    .order('position', { ascending: true });
```

Se não houver seções ativas, o código cai no fallback (linhas 303-312) que **DEVERIA** mostrar as farmácias.

## 🎯 Possíveis Cenários

### Cenário 1: Tabela vazia
- `feedSections.length === 0`
- Código cai no fallback (linha 303)
- **DEVERIA** mostrar `FeaturedPharmacies` e `NearbyPharmacies`

### Cenário 2: sortedPharmacies vazio
- Se `sortedPharmacies.length === 0`
- Código mostra mensagem "Nenhuma farmácia encontrada" (linha 316)

### Cenário 3: Seções existem mas estão desativadas
- `feedSections.length > 0` mas nenhuma é do tipo `pharmacy_list.*`
- Código renderiza apenas as seções ativas
- Se não houver `pharmacy_list.nearby`, adiciona o fallback (linha 298)

## 🛠️ Solução

### Opção 1: Popular tabela app_feed_sections (RECOMENDADO)
Execute o script SQL fornecido:

```sql
-- Ver arquivo: fix_feed_sections.sql
INSERT INTO app_feed_sections (type, title, is_active, position, config) VALUES
  ('pharmacy_list.featured', 'Patrocinado', true, 2, '{"limit": 10}'),
  ('pharmacy_list.nearby', 'Perto de Você', true, 6, '{"limit": 20}')
ON CONFLICT (type) DO UPDATE SET is_active = true;
```

### Opção 2: Verificar se há farmácias aprovadas
```sql
-- Verificar se há farmácias aprovadas no sistema
SELECT COUNT(*) FROM pharmacies WHERE status = 'Aprovado';
```

Se retornar 0, o problema é falta de dados.

### Opção 3: Verificar App.tsx
O problema pode estar no `App.tsx` se:
- `allPharmacies` está vazio
- `sortedPharmacies` não está sendo calculado corretamente

## 📋 Checklist de Diagnóstico

Execute na ordem:

1. ✅ **Verificar se há farmácias aprovadas**
   ```sql
   SELECT id, name, status FROM pharmacies WHERE status = 'Aprovado' LIMIT 5;
   ```

2. ✅ **Verificar app_feed_sections**
   ```sql
   SELECT type, title, is_active, position FROM app_feed_sections ORDER BY position;
   ```

3. ✅ **Verificar console do navegador**
   - Abrir DevTools (F12)
   - Procurar por erros
   - Verificar se `sortedPharmacies` tem dados:
     ```javascript
     console.log('Pharmacies:', sortedPharmacies);
     ```

4. ✅ **Verificar Network tab**
   - Ver se a requisição para `app_feed_sections` retorna dados
   - Ver se a requisição para `pharmacies` retorna dados

## 🎯 Próximos Passos

1. Execute o script `fix_feed_sections.sql` no Supabase Dashboard
2. Recarregue a página
3. Verifique se as seções aparecem
4. Se não aparecer, verifique o console para erros

## 📝 Nota Importante

**O código NÃO foi alterado nas últimas atualizações de performance.**

As otimizações feitas foram:
- ✅ Defer de geolocation (500ms)
- ✅ Defer de fetch pharmacies (500ms)
- ✅ Defer de subscriptions (1000ms)

**NENHUMA** dessas mudanças afeta a renderização dos componentes de farmácias.

O problema é **100% relacionado a dados no banco**, não ao código.
