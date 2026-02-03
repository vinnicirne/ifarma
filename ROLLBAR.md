# 🔍 Rollbar - Monitoramento de Erros

Sistema de monitoramento de erros configurado para web e Android.

---

## 📱 Plataformas Suportadas

### Web (React)
- **Biblioteca:** `@rollbar/react` v0.11.1
- **Provider:** Integrado no App.tsx
- **ErrorBoundary:** Captura erros React automaticamente

### Android (Nativo)
- **Biblioteca:** `com.rollbar:rollbar-android:1.10.3`
- **Configuração:** AndroidManifest.xml + build.gradle

---

## ⚙️ Configuração

### Access Token
```
84893746147940e8bb3ee1bbcce4eb14
```

### Ambiente
- **Desenvolvimento:** `development`
- **Produção:** `production`

---

## 🚀 Como Funciona

### Web (React)

O Rollbar captura automaticamente:
- ✅ Erros não capturados (uncaught errors)
- ✅ Promises rejeitadas (unhandled rejections)
- ✅ Erros de componentes React (via ErrorBoundary)

**Arquitetura:**
```
App.tsx
  └─ RollbarProvider (config)
      └─ RollbarErrorBoundary
          └─ Router
              └─ AppRoutes
```

### Android

O Rollbar será inicializado automaticamente no MainActivity:
```java
import com.rollbar.android.Rollbar;

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Rollbar.init(this);
}
```

---

## 📊 Dados Capturados

### Automático
- Stack traces completos
- Ambiente (dev/prod)
- Versão do código
- Browser/device info

### Sensível (Filtrado)
- ❌ `password`
- ❌ `access_token`
- ❌ `secret`
- ❌ `api_key`
- ❌ `token`

### Erros Ignorados
- `ResizeObserver loop limit exceeded`
- `Non-Error promise rejection captured`
- `Request aborted`

---

## 🧪 Como Testar

### Web
1. Execute o app em desenvolvimento
2. Force um erro (ex: acessar propriedade de `null`)
3. Verifique no dashboard do Rollbar

### Android
1. Build do APK
2. Instale no dispositivo
3. Force um crash
4. Verifique no dashboard do Rollbar

---

## 📍 Arquivos Importantes

- `src/lib/rollbar.ts` - Configuração web
- `src/App.tsx` - Integração Provider
- `android/app/build.gradle` - Dependência Android
- `android/app/src/main/AndroidManifest.xml` - Token Android

---

## 🔗 Dashboard Rollbar

Acesse: [https://rollbar.com](https://rollbar.com)

Use o access token para visualizar erros em tempo real.

---

**Última atualização:** 03/02/2026
