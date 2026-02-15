import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthzResult = {
    userId: string;
    email: string | null;
    isAdmin: boolean;
    allowed: boolean;
    reason?: string;
};

export function extractBearer(req: Request): string | null {
    const h = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!h) return null;
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}

export async function authorizeBillingAccess(params: {
    token: string;
    pharmacyId: string;
}): Promise<AuthzResult> {
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(params.token);
    if (uErr || !u?.user) {
        return { userId: "", email: null, isAdmin: false, allowed: false, reason: "invalid_jwt" };
    }

    const user = u.user;

    // admin?
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const isAdmin = profile?.role === "admin";

    if (isAdmin) {
        return { userId: user.id, email: user.email ?? null, isAdmin: true, allowed: true };
    }

    // owner?
    const { data: pharmacy } = await supabaseAdmin
        .from("pharmacies")
        .select("id, owner_id")
        .eq("id", params.pharmacyId)
        .maybeSingle();

    if (!pharmacy) {
        return { userId: user.id, email: user.email ?? null, isAdmin: false, allowed: false, reason: "pharmacy_not_found" };
    }

    if (pharmacy.owner_id === user.id) {
        return { userId: user.id, email: user.email ?? null, isAdmin: false, allowed: true };
    }

    // staff billing/manager?
    const { data: member } = await supabaseAdmin
        .from("pharmacy_members")
        .select("role")
        .eq("pharmacy_id", params.pharmacyId)
        .eq("user_id", user.id)
        .maybeSingle();

    const can = member?.role === "billing" || member?.role === "manager";

    return {
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        allowed: !!can,
        reason: can ? undefined : "no_access",
    };
}

export function adminClient() {
    return createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}
