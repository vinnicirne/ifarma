# Deploy da Edge Function - Método Alternativo (Supabase Dashboard)

## ⚠️ Problema Identificado

O deploy via CLI falhou por dois motivos:
1. Falta de privilégios no projeto
2. Docker não está rodando

## ✅ Solução: Deploy via Dashboard

### Passo 1: Acessar Edge Functions no Supabase

1. Acesse: https://supabase.com/dashboard/project/ztxdqzqmfwgdnqpwfqwf
2. No menu lateral, clique em **Edge Functions**
3. Clique em **Create a new function**

### Passo 2: Criar a Function

1. **Nome da função:** `send-push-notification`
2. **Código:** Cole o conteúdo abaixo

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // Parse request body
    const { tokens, title, body, data } = await req.json()

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum token fornecido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Preparar mensagem FCM
    const message = {
      registration_ids: tokens,
      notification: {
        title,
        body,
        icon: '/icon.png',
        badge: '/badge.png',
        click_action: data?.url || '/',
        tag: data?.orderId || 'notification'
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      priority: 'high',
      time_to_live: 86400 // 24 horas
    }

    console.log('Enviando notificação FCM:', message)

    // Enviar para Firebase Cloud Messaging
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`
      },
      body: JSON.stringify(message)
    })

    const result = await response.json()

    console.log('Resposta FCM:', result)

    // Verificar tokens inválidos e removê-los
    if (result.results) {
      const invalidTokens: string[] = []
      
      result.results.forEach((res: any, index: number) => {
        if (res.error === 'InvalidRegistration' || res.error === 'NotRegistered') {
          invalidTokens.push(tokens[index])
        }
      })

      // Remover tokens inválidos do banco
      if (invalidTokens.length > 0) {
        await supabase
          .from('device_tokens')
          .delete()
          .in('token', invalidTokens)
        
        console.log('Tokens inválidos removidos:', invalidTokens.length)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        invalidTokensRemoved: result.failure || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```

### Passo 3: Deploy

1. Clique em **Deploy**
2. Aguarde o deploy finalizar
3. Verifique se aparece "Deployed successfully"

### Passo 4: Verificar

1. Na lista de Edge Functions, clique em `send-push-notification`
2. Verifique se o status está **Active**
3. Copie a URL da função (você vai precisar para testar)

---

## 🧪 Testar a Edge Function

### Teste via Dashboard

1. Na página da função, clique em **Invoke**
2. Cole o JSON de teste:

```json
{
  "tokens": ["token_teste"],
  "title": "🔔 Teste de Notificação",
  "body": "Esta é uma notificação de teste!",
  "data": {
    "orderId": "test-123",
    "url": "/order-tracking/test-123"
  }
}
```

3. Clique em **Send Request**
4. Verifique a resposta

### Teste via Código

No console do navegador (depois de ter um token registrado):

```javascript
const { supabase } = await import('./src/lib/supabase');

const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    tokens: ['seu_token_aqui'],
    title: '🔔 Teste',
    body: 'Notificação de teste!',
    data: {
      orderId: 'test-123',
      url: '/order-tracking/test-123'
    }
  }
});

console.log('Resultado:', data, error);
```

---

## ✅ Checklist Final

- [ ] Criar função `send-push-notification` no Dashboard
- [ ] Colar o código TypeScript
- [ ] Fazer deploy
- [ ] Verificar status Active
- [ ] Testar com JSON de exemplo
- [ ] Integrar `useNotifications()` no App.tsx
- [ ] Testar notificação real com pedido

---

## 📝 Próximo Passo

Depois do deploy, adicione no `App.tsx`:

```typescript
import { useNotifications } from './hooks/useNotifications';

function App() {
  useNotifications(); // ← Adicione esta linha no início
  
  // ... resto do código
}
```
