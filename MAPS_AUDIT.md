# 🗺️ Maps & Tracking System Audit (P0/P1)

**Date:** 2026-02-07
**Auditor:** Backend Specialist Agent
**Scope:** Client Tracking, Admin Dashboard, Motoboy App, Database, API Usage.

---

## 🚨 Critical Findings (P0)

### 1. Route Definition Bug in Motoboy App
- **File:** `src/routes/AppRoutes.tsx`
- **Issue:** The route `/motoboy-route-status` is defined without a parameter, but `MotoboyRouteStatus.tsx` relies on `useParams()` to get `orderId`.
- **Impact:** Accessing this page will result in a "Pedido não encontrado" state or blank map.
- **Fix:** Change route to `/motoboy-route-status/:orderId`.

### 2. Inconsistent Map Providers (UX & Size)
- **Issue:** The application mixes two different map libraries:
    - **Google Maps:** Used in `MotoboyDashboard.tsx` (via `useMotoboyMap`), `UserOrderTracking.tsx`, and `AdminMap.tsx`.
    - **Leaflet (OpenStreetMap):** Used in `MotoboyRouteStatus.tsx`.
- **Impact:**
    - **Bundle Size:** Users download TWO map libraries (heavy).
    - **UX:** Inconsistent visual style and interaction (Google vs MSM/Carto).
    - **Maintenance:** Two codebases for map logic.

### 3. API Cost & Security Risk (Client Tracking)
- **File:** `src/pages/client/UserOrderTracking.tsx`
- **Issue:** Every time a client opens the tracking page, the app calls `google.maps.DirectionsService` (Client-side).
- **Impact:**
    - **High Cost:** If 1000 users track orders 10 times, that's 10,000 API calls.
    - **No Caching:** The route (polyline) rarely changes after pickup, yet it's refetched constantly.
- **Recommendation:** Calculate route **ONCE** on backend (or Edge Function) upon "Start Route" and save the encoded polyline to `orders` table. Client just renders it.

---

## ⚠️ Major Findings (P1)

### 4. Audio Auto-Play Blocking
- **File:** `src/pages/client/UserOrderTracking.tsx` & `MotoboyDashboard.tsx`
- **Issue:** Uses `new Audio().play()` directly.
- **Impact:** Modern browsers (Chrome/Safari) **block** audio that isn't triggered by a user click. The "BI BI" horn or "Proximity Alert" will likely fail silently for many users.
- **Fix:** Use specific "User Interaction" triggers or the Web Audio API with a "Resume" pattern (requires one initial tap).

### 5. API Key Management
- **Issue:** Keys are read from `system_settings` or `import.meta.env`.
- **Risk:** While frontend keys must be public, ensure they are **restricted by HTTP Referrer** (for Web) and **Bundle ID** (for Android/iOS) in the Google Cloud Console immediately.

---

## 🛠️ Audit of Files & Components

| Component | Provider | Status | Issues |
|-----------|----------|--------|--------|
| `AdminMap.tsx` | Google Maps | 🟡 OK | Hardcoded libraries, manual LERP (smoothing) is good but expensive on CPU. |
| `UserOrderTracking.tsx` | Google Maps | 🔴 Review | Recalculates route on client; uses Google Directions ($$$). |
| `MotoboyDashboard.tsx` | Google Maps | 🟡 OK | Complex hook `useMotoboyMap`; Good wake lock usage. |
| `MotoboyRouteStatus.tsx` | **Leaflet** | 🔴 Inconsistent | Uses different provider than Dashboard. Redundant? |
| `googleRoutes.ts` | Server/Fetch | 🔴 Risky | Manual fetch to Google API; no caching; Key passed as arg. |

---

## 🚀 Action Plan & Recommendations

### Phase 1: Immediate Fixes (P0)
1.  **Fix Routes**: Update `AppRoutes.tsx` to include `:orderId` for route status.
2.  **Harmonize Maps**: Decide on **ONE** provider.
    -   *Recommendation:* Use **Google Maps** for everything (Premium UX) *OR* **Leaflet** for everything (Cost savings). Mixing is the worst option.
    -   *Current State:* Lean towards Google Maps as it's used in 3/4 places.
    -   *Action:* Refactor `MotoboyRouteStatus` to use `AdminMap` or `useMotoboyMap`.

### Phase 2: Performance & Cost (P1)
1.  **Backend Route Cache**:
    -   Add `route_polyline` column to `orders` table.
    -   When Motoboy accepts/starts, calculate polyline ONCE via Edge Function.
    -   Save to DB.
    -   Clients just read the string; no API call.
2.  **Optimize Geolocation**:
    -   `useGeolocation` throttling (5s/5m) is good. Keep it.
    -   Ensure `route_history` RLS is active (Fixed in previous turn).

### Phase 3: Reliability
1.  **Audio Manager**: Create a context that requiring a single "Interaction" (Click anywhere) to "unlock" audio context, ensuring alerts play later.

---

**Approval Required:**
Shall I proceed with **Phase 1 (Fix Routes & Harmonize to Google Maps)**? This involves rewriting `MotoboyRouteStatus` to use the existing Google Maps components.
