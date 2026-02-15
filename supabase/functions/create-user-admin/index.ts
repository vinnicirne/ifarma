import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

        // ✅ precisa existir (pra validar JWT do usuário)
        const anonKey =
            Deno.env.get("SUPABASE_ANON_KEY") ??
            Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? // fallback comum
            "";

        const serviceRoleKey =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
            Deno.env.get("IFARMA_SERVICE_ROLE_KEY") ??
            Deno.env.get("ADMIN_SERVICE_ROLE_KEY") ??
            "";

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            return json(500, {
                error: "Missing env vars",
                detail: {
                    SUPABASE_URL: !!supabaseUrl,
                    SUPABASE_ANON_KEY: !!anonKey,
                    SERVICE_ROLE_KEY: !!serviceRoleKey,
                },
            });
        }

        // --- AUTH HEADER ---
        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return json(401, { error: "No Bearer token provided" });
        }

        // ✅ 1) Client do usuário (anon + Authorization do request)
        const supabaseUser = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: {
                headers: {
                    Authorization: authHeader, // 👈 ESSENCIAL
                },
            },
        });

        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        const requester = userData?.user;

        if (userErr || !requester) {
            return json(401, {
                error: "Invalid JWT",
                detail: userErr?.message ?? null,
            });
        }

        // ✅ 2) Client admin (service role)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // --- requester profile ---
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", requester.id)
            .single();

        if (profileError || !requesterProfile) {
            return json(403, {
                error: "Profile not found or error fetching profile",
                detail: profileError?.message ?? null,
            });
        }

        const isAdmin = requesterProfile.role === "admin";
        if (!isAdmin) return json(403, { error: "Only admin can approve a pharmacy" });

        // --- BODY ---
        let reqJson: any = {};
        try {
            reqJson = await req.json();
        } catch {
            return json(400, { error: "Invalid JSON body" });
        }

        let pharmacy_id = reqJson.pharmacy_id || reqJson?.metadata?.pharmacy_id;
        pharmacy_id = typeof pharmacy_id === "string" ? pharmacy_id.trim() : pharmacy_id;
        if (!pharmacy_id) return json(400, { error: "Field 'pharmacy_id' is required" });

        const approve_pharmacy = reqJson.approve_pharmacy === true;
        if (!approve_pharmacy) {
            return json(400, { error: "Missing flag 'approve_pharmacy: true'" });
        }

        // --- subscription gate ---
        const { data: subscription, error: subError } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .select("status")
            .eq("pharmacy_id", pharmacy_id)
            .maybeSingle();

        if (subError) {
            return json(500, { error: "Error checking subscription", detail: subError.message });
        }

        if (!subscription || !["active", "trialing"].includes(subscription.status)) {
            return json(409, {
                error: "Farmácia sem assinatura ativa (ou trial). Corrija o plano antes de aprovar.",
                code: "NO_ACTIVE_SUBSCRIPTION",
                status: subscription?.status ?? null,
            });
        }

        // --- approve ---
        const { data: updated, error: approvalError } = await supabaseAdmin
            .from("pharmacies")
            .update({ status: "approved" })
            .eq("id", pharmacy_id)
            .select("id,status")
            .single();

        if (approvalError) {
            return json(500, { error: "Approval failed", detail: approvalError.message });
        }

        return json(200, { success: true, approved: true, pharmacy: updated });
    } catch (error: any) {
        return json(500, { error: "Internal Server Error", detail: error?.message ?? null });
    }
});

