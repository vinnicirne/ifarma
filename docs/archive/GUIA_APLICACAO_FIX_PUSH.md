# 🚀 GUIA DE APLICAÇÃO - CORREÇÃO DE PUSH NOTIFICATIONS

## ✅ PASSO A PASSO PARA APLICAR A CORREÇÃO

### 📍 **PASSO 1**: Abrir Supabase Dashboard

Acesse o SQL Editor do seu projeto:
```
https://gtjhpkakousmdrzjpdat.supabase.co/project/gtjhpkakousmdrzjpdat/sql
```

**OU**:
1. Abra https://supabase.com/dashboard
2. Selecione o projeto `gtjhpkakousmdrzjpdat`
3. No menu lateral, clique em **SQL Editor**

---

### 📍 **PASSO 2**: Criar Nova Query

1. Clique em **"New query"** (botão verde no canto superior direito)
2. Cole o SQL abaixo:

```sql
-- ============================================
-- CORREÇÃO CRÍTICA: POLÍTICAS RLS PARA device_tokens
-- ============================================

DROP POLICY IF EXISTS "Usuários podem registrar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem atualizar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem deletar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Leitura de tokens" ON device_tokens;

CREATE POLICY "Usuários podem registrar tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Leitura de tokens" ON device_tokens
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.jwt() ->> 'role' = 'service_role'
    );
```

---

### 📍 **PASSO 3**: Executar

1. Clique no botão **"RUN"** (ou pressione `Ctrl+Enter`)
2. Aguarde a mensagem de sucesso: ✅ **"Success. No rows returned"**

---

### 📍 **PASSO 4**: Verificar

Execute esta query para confirmar que as políticas foram criadas:

```sql
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'device_tokens'
ORDER BY policyname;
```

**Resultado esperado**: 4 políticas listadas
- `Leitura de tokens` (SELECT)
- `Usuários podem atualizar tokens` (UPDATE)
- `Usuários podem deletar tokens` (DELETE)
- `Usuários podem registrar tokens` (INSERT)

---

### 📍 **PASSO 5**: Testar Push Notification

1. Abra o app no navegador ou dispositivo
2. Aceite a permissão de notificações
3. Verifique no console: `"Native FCM token: ..."` ou `"Token FCM obtido: ..."`
4. Confirme no Supabase que o token foi salvo:

```sql
SELECT * FROM device_tokens ORDER BY created_at DESC LIMIT 5;
```

5. Teste envio de notificação (via dashboard de lojista ou admin)

---

## 🎯 RESULTADO ESPERADO

### ✅ ANTES DA CORREÇÃO
- ❌ Tokens não eram salvos
- ❌ Erro 403 nas Edge Functions
- ❌ Log: "Nenhum token de push encontrado"
- ❌ Push notifications não chegavam

### ✅ DEPOIS DA CORREÇÃO
- ✅ Tokens salvos com sucesso
- ✅ Edge Functions funcionam sem erro
- ✅ Tokens encontrados corretamente
- ✅ Push notifications chegam no dispositivo

---

## 🆘 TROUBLESHOOTING

### Erro: "permission denied for table device_tokens"
**Solução**: Você precisa estar logado como proprietário do projeto ou usar service_role key.

### Erro: "policy already exists"
**Solução**: Normal! O `DROP POLICY IF EXISTS` já cuida disso. Ignore o aviso.

### Tokens ainda não aparecem
**Solução**: 
1. Limpe o cache do navegador
2. Faça logout e login novamente no app
3. Aceite a permissão de notificações novamente

---

## 📞 SUPORTE

Se precisar de ajuda:
1. Verifique os logs do navegador (F12 → Console)
2. Verifique os logs das Edge Functions no Supabase
3. Consulte `AUDITORIA_PUSH_NOTIFICATIONS.md` para detalhes técnicos

---

**Tempo estimado**: 3 minutos  
**Dificuldade**: Fácil  
**Impacto**: CRÍTICO (resolve 100% do problema de push)
