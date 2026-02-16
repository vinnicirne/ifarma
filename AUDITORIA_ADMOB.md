# Auditoria AdMob - Por que os anúncios não aparecem

## Resumo Executivo

| Ambiente | Anúncios aparecem? | Motivo |
|----------|--------------------|--------|
| **localhost (web)** | ❌ Nunca | AdMob é plugin **nativo** – só funciona em APK/iOS |
| **APK (Android)**  | ⚠️ Depende | Exige `admob_enabled`, seção no feed e App ID corretos |

---

## 1. Localhost (Web)

### Causa raiz
O `@capacitor-community/admob` usa o **Google Mobile Ads SDK** só em apps nativos. Não existe implementação web. O código faz retorno antecipado:

```ts
if (!Capacitor.isNativePlatform()) return;
```

### O que foi feito
- Placeholder em DEV: mensagem `"📱 Anúncios aparecem apenas no app (APK)"` quando há seção `admob.banner` no feed.
- Log no console em modo dev explicando que anúncios só aparecem no app.

### Alternativa para web
Para anúncios no site, é necessário usar **Google AdSense** (API e fluxo diferentes do AdMob).

---

## 2. APK (Android)

### Condições para os anúncios aparecerem

1. **`system_settings`**  
   - `admob_enabled` = `'true'` (string)  
   - `admob_banner_id_android` preenchido  
   - `admob_app_id_android` preenchido  

2. **`app_feed_sections`**  
   - Linha com `type = 'admob.banner'`  
   - `is_active = true`  

3. **AndroidManifest.xml**  
   - `com.google.android.gms.ads.APPLICATION_ID` configurado (App ID de teste ou produção)

### Como conferir no APK (Logcat)

```
✅ AdMob SDK Inicializado | Banner ID: ...
📺 AdMob Banner exibido (BOTTOM_CENTER)
```

Se não aparecer:

```
🚫 AdMob desativado em system_settings (admob_enabled !== "true")
⚠️ AdMob showBanner ignorado: adMobEnabled=false
📺 AdMob: Seção admob.banner não encontrada no feed
```

### Migration para garantir configuração

Rodar a migração:

```bash
supabase db push
```

ou executar manualmente:

```sql
-- Arquivo: supabase/migrations/20260216100000_admob_setup.sql
```

---

## 3. Checklist para debug

- [ ] `system_settings`: `admob_enabled` = `'true'`?
- [ ] `system_settings`: `admob_banner_id_android` preenchido?
- [ ] `app_feed_sections`: existe `admob.banner` com `is_active = true`?
- [ ] AndroidManifest: `APPLICATION_ID` configurado?
- [ ] Teste em device físico (emulador pode ter restrições com AdMob)
- [ ] Verificar Logcat no Android Studio para erros do AdMob

---

## 4. IDs de teste do Google (desenvolvimento)

- App ID: `ca-app-pub-3940256099942544~3347511713`
- Banner: `ca-app-pub-3940256099942544/6300978111`

Substituir pelos IDs reais da conta AdMob em produção.
