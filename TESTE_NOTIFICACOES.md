# 🧪 Guia de Teste - Notificações Push

## ✅ Status: Servidor Rodando (REINICIADO)
- URL: http://localhost:5175/ ⬅️ **NOVA PORTA**
- Status: ✅ Online
- Variáveis de ambiente: ✅ Carregadas

---

## 📋 Checklist de Teste

### Teste 1: Permissão e Registro de Token ⏳

**Passos:**
1. ✅ Abrir http://localhost:5174/
2. ⏳ Fazer login ou criar conta
3. ⏳ Aceitar permissão de notificações (popup do navegador)
4. ⏳ Abrir Console do Navegador (F12)
5. ⏳ Verificar mensagem: "Token FCM obtido: ..."
6. ⏳ Verificar no Supabase se token foi salvo em `device_tokens`

**Verificação no Supabase:**
```sql
SELECT * FROM device_tokens ORDER BY created_at DESC LIMIT 5;
```

---

### Teste 2: Notificação Manual (Console) ⏳

**No Console do Navegador:**
```javascript
// Importar função
const { sendOrderNotification } = await import('./src/utils/notifications');

// Obter seu user_id
const { data: { session } } = await supabase.auth.getSession();
console.log('Seu user_id:', session.user.id);

// Enviar notificação de teste
await sendOrderNotification(
  'test-order-123',
  session.user.id,
  '🔔 Teste de Notificação',
  'Esta é uma notificação de teste do sistema!'
);
```

**Resultado Esperado:**
- ✅ Notificação aparece no navegador
- ✅ Console mostra: "Notificação enviada com sucesso"

---

### Teste 3: Notificação Real (Pedido) ⏳

**Passos:**
1. ⏳ Fazer login como **cliente**
2. ⏳ Criar um pedido (adicionar produto ao carrinho e finalizar)
3. ⏳ Anotar o ID do pedido
4. ⏳ Fazer login como **lojista** (outra aba)
5. ⏳ Ir para Dashboard do Lojista → Pedidos
6. ⏳ Atualizar status do pedido para "preparando"
7. ⏳ Verificar se notificação chegou na aba do cliente

**Mensagens Esperadas por Status:**
- `preparando` → "🔔 Pedido em Preparo"
- `em_rota` → "🚴 Pedido a Caminho"
- `entregue` → "✅ Pedido Entregue"

---

## 🐛 Troubleshooting

### Permissão Negada
Se você negou a permissão acidentalmente:
1. Clique no ícone de cadeado na barra de endereço
2. Permissões → Notificações → Permitir
3. Recarregue a página

### Token Não Aparece
1. Verifique se `.env` está configurado corretamente
2. Verifique se `VITE_FIREBASE_VAPID_KEY` está presente
3. Limpe cache do navegador e recarregue

### Notificação Não Chega
1. Verifique logs da Edge Function no Supabase
2. Verifique se `FIREBASE_SERVER_KEY` está nos secrets
3. Teste manualmente via console primeiro

---

## 📊 Logs Importantes

### Console do Navegador
```
✅ "Permissão de notificação concedida"
✅ "Token FCM obtido: ..."
✅ "Token salvo com sucesso no Supabase"
✅ "Notificação recebida: ..."
```

### Edge Function Logs (Supabase)
```
✅ "Enviando notificação FCM: ..."
✅ "Resposta FCM: { success: 1, failure: 0 }"
```

---

## ✅ Critérios de Sucesso

- [ ] Permissão de notificação concedida
- [ ] Token FCM gerado e salvo no Supabase
- [ ] Notificação manual funciona (via console)
- [ ] Notificação real funciona (ao atualizar pedido)
- [ ] Notificação aparece mesmo com app em background

---

## 📝 Próximos Passos Após Testes

1. Adicionar ícone personalizado (`/icon.png`)
2. Adicionar badge (`/badge.png`)
3. Implementar notificações para lojistas
4. Implementar notificações para motoboys
5. Adicionar sons customizados
