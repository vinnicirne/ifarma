# IFARMA - Performance Analysis Report

## 🔴 CRITICAL PERFORMANCE ISSUES DETECTED

### 1. **App.tsx - Multiple Heavy Operations on Mount** (CRITICAL)
**Problem**: O App.tsx executa 7 useEffect hooks simultaneamente ao carregar:
- Auth listener
- Session watchdog (interval de 1 minuto)
- Geolocation request
- Fetch all pharmacies
- Realtime order listener
- Global chat listener  
- Context initialization

**Impact**: Isso causa **travamento inicial** porque todas essas operações competem por recursos.

**Solution**:
```typescript
// BEFORE: All effects run immediately
useEffect(() => { fetchPharmacies() }, []);
useEffect(() => { initLocation() }, []);
useEffect(() => { subscribeToOrders() }, []);

// AFTER: Stagger initialization
useEffect(() => {
  const init = async () => {
    await initAuth();           // Priority 1
    await fetchProfile();       // Priority 2
    setTimeout(() => {
      fetchPharmacies();        // Priority 3 (defer 500ms)
      initLocation();           // Priority 3 (defer 500ms)
    }, 500);
    setTimeout(() => {
      subscribeToOrders();      // Priority 4 (defer 1000ms)
      subscribeToChat();        // Priority 4 (defer 1000ms)
    }, 1000);
  };
  init();
}, []);
```

---

### 2. **Expensive useMemo Calculation** (HIGH)
**Problem**: `sortedPharmacies` useMemo executa um algoritmo complexo de ranqueamento para TODAS as farmácias a cada render:
- Cálculo de distância (Haversine formula)
- Cálculo de horário de funcionamento
- Algoritmo de scoring com 5 fatores
- Randomização para featured pharmacies
- Sort de todo o array

**Impact**: Se houver 100+ farmácias, isso pode travar a UI.

**Solution**:
```typescript
// Add debouncing
import { useDeferredValue } from 'react';

const deferredPharmacies = useDeferredValue(allPharmacies);
const sortedPharmacies = useMemo(() => {
  // ... expensive calculation
}, [deferredPharmacies, userLocation]);
```

---

### 3. **Multiple Realtime Subscriptions** (HIGH)
**Problem**: 3 canais Supabase Realtime abertos simultaneamente:
- `client_orders_${userId}` (orders table)
- `global_messages_${userId}` (order_messages table)
- Cada página adiciona seus próprios canais

**Impact**: Cada subscription consome memória e CPU. Com 3+ canais, isso degrada performance.

**Solution**:
```typescript
// Consolidate into single channel with multiple listeners
const channel = supabase
  .channel(`user_${userId}`)
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'orders' 
  }, handleOrderUpdate)
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'order_messages' 
  }, handleMessage)
  .subscribe();
```

---

### 4. **Session Watchdog Interval** (MEDIUM)
**Problem**: `setInterval` rodando a cada 1 minuto fazendo chamada ao Supabase Auth.

**Impact**: Consome CPU e rede desnecessariamente.

**Solution**:
```typescript
// Increase interval to 5 minutes
const interval = setInterval(checkSession, 5 * 60 * 1000);

// OR: Only check on focus/visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkSession();
});
```

---

### 5. **No Code Splitting** (MEDIUM)
**Problem**: Todas as páginas são carregadas no bundle principal.

**Impact**: Bundle inicial muito grande (provavelmente 500KB+).

**Solution**:
```typescript
// Use React.lazy for route-level code splitting
const ClientHome = lazy(() => import('./pages/client/ClientHome'));
const MerchantOrderManagement = lazy(() => import('./pages/merchant/MerchantOrderManagement'));

<Route path="/" element={
  <Suspense fallback={<LoadingScreen />}>
    <ClientHome />
  </Suspense>
} />
```

---

### 6. **Images Not Optimized** (LOW-MEDIUM)
**Problem**: PWA icons são PNG (275KB cada).

**Impact**: Aumenta tempo de carregamento inicial.

**Solution**:
- Converter para WebP (redução de ~70%)
- Usar responsive images com srcset

---

## 📊 PERFORMANCE METRICS (Estimated)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial Load Time | ~3-5s | <2s | 🔴 |
| Time to Interactive | ~4-6s | <3s | 🔴 |
| Bundle Size | ~800KB | <300KB | 🔴 |
| Realtime Channels | 3+ | 1-2 | 🟡 |
| useEffect Count (App) | 7 | 3-4 | 🔴 |

---

## ✅ IMMEDIATE ACTION PLAN

### Priority 1 (Do Now):
1. ✅ Stagger initialization in App.tsx
2. ✅ Add React.lazy for routes
3. ✅ Consolidate Supabase subscriptions

### Priority 2 (This Week):
4. ✅ Debounce sortedPharmacies calculation
5. ✅ Optimize session watchdog interval
6. ✅ Convert images to WebP

### Priority 3 (Nice to Have):
7. ✅ Add service worker for caching
8. ✅ Implement virtual scrolling for long lists
9. ✅ Add performance monitoring (Lighthouse CI)

---

## 🛠️ TOOLS TO USE

1. **React DevTools Profiler**: Identify slow components
2. **Chrome DevTools Performance**: Record and analyze runtime
3. **Lighthouse**: Audit performance score
4. **Bundle Analyzer**: `npm run build -- --analyze`

---

## 📝 NOTES

- O travamento ao abrir é principalmente causado pelos 7 useEffect rodando simultaneamente
- A ordenação de farmácias é CPU-intensive e deve ser otimizada
- Múltiplas subscriptions Realtime consomem muita memória
- Falta code splitting está aumentando o bundle inicial

**Estimated Performance Gain After Fixes**: 60-70% faster initial load
