import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types
// ============================================================================

export type AuthzResult = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
  allowed: boolean;
  reason?:
  | "missing_jwt"
  | "invalid_jwt"
  | "profile_not_found"
  | "pharmacy_not_found"
  | "no_access"
  | "unexpected_error";
};

// ============================================================================
// Helpers
// ============================================================================

export function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;

  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let _adminClient: SupabaseClient | null = null;

/**
 * Supabase Admin Client (Service Role)
 * - Use apenas no backend (Edge Function), nunca no frontend.
 * - Cacheia o client por isolamento de runtime.
 */
export function adminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url =
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("SUPABASE_PROJECT_URL") ||
    Deno.env.get("VITE_SUPABASE_URL") ||
    "";

  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") ||
    "";

  if (!url) throw new Error("Missing env var: SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");

  _adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        // opcional: ajuda a identificar chamadas no log do Supabase
        "X-Client-Info": "edge-functions/adminClient",
      },
    },
  });

  return _adminClient;
}

// ============================================================================
// Authorization
// ============================================================================

export async function authorizeBillingAccess(params: {
  token: string | null;
  pharmacyId: string;
}): Promise<AuthzResult> {
  try {
    if (!params.token) {
      return {
        userId: "",
        email: null,
        isAdmin: false,
        allowed: false,
        reason: "missing_jwt",
      };
    }

    const supabase = adminClient();

    const { data: userRes, error: userErr } = await supabase.auth.getUser(params.token);

    if (userErr || !userRes?.user) {
      return {
        userId: "",
        email: null,
        isAdmin: false,
        allowed: false,
        reason: "invalid_jwt",
      };
    }

    const user = userRes.user;

    // 1) Profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, pharmacy_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      // Se quiser logar: console.error("[authz] profile query error:", profErr);
      // mas não bloqueia automaticamente (depende da sua regra).
    }

    if (!profile) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: false,
        reason: "profile_not_found",
      };
    }

    const isAdmin = profile.role === "admin";

    if (isAdmin) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: true,
        allowed: true,
      };
    }

    // 2) Pharmacy ownership
    const { data: pharmacy, error: phErr } = await supabase
      .from("pharmacies")
      .select("id, owner_id")
      .eq("id", params.pharmacyId)
      .maybeSingle();

    if (phErr) {
      // console.error("[authz] pharmacy query error:", phErr);
    }

    if (!pharmacy) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: false,
        reason: "pharmacy_not_found",
      };
    }

    if (pharmacy.owner_id === user.id || (profile.role === 'merchant' && profile.pharmacy_id === params.pharmacyId)) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: true,
      };
    }

    return {
      userId: user.id,
      email: user.email ?? null,
      isAdmin: false,
      allowed: false,
      reason: "no_access",
    };
  } catch (e) {
    console.error("[authz] unexpected error:", e);
    return {
      userId: "",
      email: null,
      isAdmin: false,
      allowed: false,
      reason: "unexpected_error",
    };
  }
}
