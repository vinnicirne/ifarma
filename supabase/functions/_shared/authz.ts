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
  detail?: string;
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

let _adminClient: SupabaseClient | null = null;

/**
 * Supabase Admin Client (Service Role)
 * - Use apenas no backend (Edge Function), nunca no frontend.
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
        "X-Client-Info": "edge-functions/adminClient",
      },
    },
  });

  return _adminClient;
}

// ============================================================================
// Authorization
// ============================================================================

/**
 * ✅ Valida o JWT corretamente:
 * - chama /auth/v1/user com ANON KEY + Authorization Bearer token
 * - depois usa service role só para ler profiles/pharmacies
 */
export async function authorizeBillingAccess(params: {
  token: string | null;
  pharmacyId?: string; // ✅ Agora explicitamente opcional
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

    const url =
      Deno.env.get("SUPABASE_URL") ||
      Deno.env.get("SUPABASE_PROJECT_URL") ||
      Deno.env.get("VITE_SUPABASE_URL") ||
      "";

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_ANON_PUBLIC_KEY") ||
      Deno.env.get("VITE_SUPABASE_ANON_KEY") ||
      "";

    if (!url || !anonKey) {
      console.error("[authz] Missing environment variables for validation");
      throw new Error("Missing env vars: SUPABASE_URL / SUPABASE_ANON_KEY");
    }

    // ✅ 1) Validação REAL do JWT no GoTrue do Supabase (usando ANON KEY)
    const gotrueRes = await fetch(`${url}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${params.token}`,
      },
    });

    if (!gotrueRes.ok) {
      const detail = await gotrueRes.text().catch(() => null);
      console.error("[authz] JWT Validation failed:", detail);
      return {
        userId: "",
        email: null,
        isAdmin: false,
        allowed: false,
        reason: "invalid_jwt",
        detail: detail ?? "Token rejected by Supabase Auth",
      };
    }

    const user = await gotrueRes.json(); // { id, email, user_metadata, ... }
    const roleFromMeta = user?.app_metadata?.role || user?.user_metadata?.role || "";
    const isAdminByMeta = roleFromMeta === "admin";

    // ✅ 2) Checar perfil e role via adminClient
    const supabase = adminClient();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, pharmacy_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("[authz] profile query error:", profErr);
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: isAdminByMeta, // Fallback para metadados se o DB falhar
        allowed: isAdminByMeta, // Admins via meta podem passar
        reason: isAdminByMeta ? undefined : "unexpected_error",
        detail: profErr.message,
      };
    }

    const isAdmin = isAdminByMeta || profile?.role === "admin";
    const userPharmacyId = profile?.pharmacy_id;

    if (!profile && !isAdminByMeta) {
      console.warn(`[authz] No profile found for user ${user.id} and no admin metadata found.`);
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: false,
        reason: "no_access",
        detail: "User profile record missing and no admin privileges detected.",
      };
    }

    // ✅ Admins: Acesso total sem necessidade de pharmacyId
    if (isAdmin) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: true,
        allowed: true,
      };
    }

    // ✅ Não-Admins: Exigir pharmacyId no contexto
    const pharmacyId = (params.pharmacyId || "").trim();
    if (!pharmacyId) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: false,
        reason: "no_access",
        detail: "Contexto de Farmácia (pharmacyId) é obrigatório para não-administradores."
      };
    }

    // ✅ Verificação de propriedade/associação para comerciantes
    const { data: pharmacy, error: phErr } = await supabase
      .from("pharmacies")
      .select("id, owner_id")
      .eq("id", pharmacyId)
      .maybeSingle();

    if (phErr) {
      console.error("[authz] pharmacy query error:", phErr);
      return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: false,
        reason: "unexpected_error",
        detail: phErr.message,
      };
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

    const isOwner = pharmacy.owner_id === user.id;
    const isAssociated = profile.pharmacy_id === pharmacyId;

    if (isOwner || isAssociated) {
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
      detail: "Usuário não possui permissão para acessar esta farmácia."
    };
  } catch (e: any) {
    console.error("[authz] unexpected error:", e);
    return {
      userId: "",
      email: null,
      isAdmin: false,
      allowed: false,
      reason: "unexpected_error",
      detail: e?.message,
    };
  }
}
