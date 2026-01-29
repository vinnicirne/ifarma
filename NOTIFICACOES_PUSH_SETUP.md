# Guia de Configuração - Notificações Push

## 📋 Checklist de Configuração

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Preencha as seguintes variáveis do Firebase:
- `VITE_FIREBASE_API_KEY` - API Key do Firebase
- `VITE_FIREBASE_AUTH_DOMAIN` - Auth Domain
- `VITE_FIREBASE_PROJECT_ID` - Project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Storage Bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Messaging Sender ID
- `VITE_FIREBASE_APP_ID` - App ID
- `VITE_FIREBASE_VAPID_KEY` - **VAPID Key que você já tem:**
  ```
  BHQ5mDF6rbQOjwk7CEBFKKyJjqBc3xo_3CMH5oo7uA6wEZVTA6OW0yc8lGa8VsIA-BI6r-J6EwcOaZkfFQ
  ```

### 2. Atualizar Service Worker

Edite o arquivo `public/firebase-messaging-sw.js` e substitua as credenciais do Firebase:

```javascript
firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
});
```

### 3. Configurar Supabase Edge Function

#### 3.1 Adicionar Secret no Supabase

No Supabase Dashboard:
1. Vá em **Settings** → **Edge Functions**
2. Adicione o secret:
   - Nome: `FIREBASE_SERVER_KEY`
   - Valor: Sua chave do servidor Firebase (Server Key)

#### 3.2 Deploy da Edge Function

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Link com seu projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy da função
supabase functions deploy send-push-notification
```

### 4. Integrar no App.tsx

Adicione o hook `useNotifications` no componente principal:

```typescript
import { useNotifications } from './hooks/useNotifications';

function App() {
  // Registrar notificações
  useNotifications();
  
  // ... resto do código
}
```

### 5. Usar Notificações

Para enviar notificações quando o status do pedido mudar:

```typescript
import { notifyOrderStatusChange } from './utils/notifications';

// Ao atualizar status do pedido
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  const { data: order } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select('customer_id')
    .single();

  if (order) {
    await notifyOrderStatusChange(orderId, order.customer_id, newStatus);
  }
};
```

## 🧪 Testar Notificações

### Teste 1: Permissão e Registro de Token

1. Abra o app no navegador
2. Aceite a permissão de notificações
3. Abra o console do navegador
4. Verifique se aparece: "Token FCM obtido: ..."
5. Verifique no Supabase se o token foi salvo em `device_tokens`

### Teste 2: Notificação Manual

Execute no console do navegador:

```javascript
const { supabase } = await import('./src/lib/supabase');
const { sendOrderNotification } = await import('./src/utils/notifications');

await sendOrderNotification(
  'order_id_teste',
  'seu_user_id',
  '🔔 Teste de Notificação',
  'Esta é uma notificação de teste!'
);
```

### Teste 3: Notificação via Atualização de Pedido

1. Crie um pedido no app
2. No dashboard do lojista, atualize o status do pedido
3. Verifique se a notificação foi recebida

## 🐛 Troubleshooting

### Notificações não aparecem

1. **Verificar permissão:**
   ```javascript
   console.log('Permissão:', Notification.permission);
   ```

2. **Verificar token:**
   ```sql
   SELECT * FROM device_tokens WHERE user_id = 'seu_user_id';
   ```

3. **Verificar logs da Edge Function:**
   - Vá em Supabase Dashboard → Edge Functions → Logs

### Service Worker não registra

1. Verifique se o arquivo está em `public/firebase-messaging-sw.js`
2. Certifique-se que o app está rodando em HTTPS (ou localhost)
3. Limpe o cache do navegador

### Erro "Invalid Server Key"

1. Verifique se adicionou o `FIREBASE_SERVER_KEY` nos secrets do Supabase
2. Certifique-se que é a **Server Key** (não a VAPID Key)

## 📱 Próximos Passos

- [ ] Adicionar ícone personalizado (`/icon.png`)
- [ ] Adicionar badge (`/badge.png`)
- [ ] Implementar notificações para lojistas
- [ ] Implementar notificações para motoboys
- [ ] Adicionar sons customizados
- [ ] Implementar notificações agrupadas
- [ ] Adicionar deep linking para notificações
