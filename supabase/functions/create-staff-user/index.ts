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
        const serviceRoleKey =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
            Deno.env.get("IFARMA_SERVICE_ROLE_KEY") ??
            Deno.env.get("ADMIN_SERVICE_ROLE_KEY") ??
            "";

        if (!supabaseUrl || !serviceRoleKey) {
            return json(500, { error: "Missing env vars: SUPABASE_URL / SERVICE_ROLE_KEY" });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // AUTH
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json(401, { error: "No authorization header provided" });

        const token = authHeader.replace("Bearer ", "");
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        const requester = authData?.user;

        if (authError || !requester) {
            return json(401, { error: "Invalid token", detail: authError?.message ?? null });
        }

        // REQUESTER PROFILE
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("role, pharmacy_id")
            .eq("id", requester.id)
            .single();

        if (profileError || !requesterProfile) {
            return json(403, { error: "Profile not found or error fetching profile" });
        }

        const isAdmin = requesterProfile.role === "admin";

        // BODY
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            return json(400, { error: "Invalid JSON body" });
        }

        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "").trim();
        const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};
        let pharmacy_id = body.pharmacy_id || metadata.pharmacy_id;

        pharmacy_id = typeof pharmacy_id === "string" ? pharmacy_id.trim() : pharmacy_id;
        if (pharmacy_id === "") pharmacy_id = null;

        if (!email || !password || password.length < 6) {
            return json(400, { error: "Email and password (min 6 chars) are required" });
        }

        const requestedRole = String(metadata.role || "merchant");
        const validRoles = ["merchant", "staff", "motoboy", "operator"];

        if (!validRoles.includes(requestedRole)) {
            return json(400, { error: "Invalid role" });
        }

        // Não-admin só pode criar usuários para sua própria farmácia
        if (!isAdmin) {
            if (!requesterProfile.pharmacy_id) {
                return json(403, { error: "Unauthorized: You do not have a pharmacy assigned" });
            }
            if (pharmacy_id && pharmacy_id !== requesterProfile.pharmacy_id) {
                return json(403, { error: "Unauthorized: You can only manage your own pharmacy" });
            }
            // Força pharmacy_id do requester se não for admin
            pharmacy_id = requesterProfile.pharmacy_id;
        }

        // Se a role exige pharmacy_id, deve ter
        if (["merchant", "staff", "motoboy", "operator"].includes(requestedRole) && !pharmacy_id) {
            return json(400, { error: "Field 'pharmacy_id' is required for this role" });
        }

        // ✅ Validar se a farmácia existe
        if (pharmacy_id) {
            const { data: pharmacyExists, error: phErr } = await supabaseAdmin
                .from("pharmacies")
                .select("id")
                .eq("id", pharmacy_id)
                .maybeSingle();

            if (phErr) return json(500, { error: "Error checking pharmacy", detail: phErr.message });
            if (!pharmacyExists) return json(404, { error: "Pharmacy not found" });
        }

        // CREATE USER
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata,
        });

        if (createErr || !created?.user) {
            console.error("CREATE USER ERROR:", JSON.stringify(createErr, null, 2));
            const msg = createErr?.message ?? "Create user failed";
            let status = 400;
            let code = "ERROR";
            if (msg.includes("already")) { status = 409; code = "USER_ALREADY_EXISTS"; }

            return json(status, { error: msg, code, details: createErr });
        }

        // UPSERT PROFILE
        const profilePayload: any = {
            id: created.user.id,
            email,
            role: requestedRole,
            full_name: metadata.full_name || email.split("@")[0],
        };
        const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
            ...profilePayload,
            pharmacy_id: pharmacy_id || null, // Explicitly include pharmacy_id
            vehicle_plate: metadata.vehicle_plate || null,
            vehicle_model: metadata.vehicle_model || null,
            cnh_url: metadata.cnh_url || null,
        });
        if (upsertErr) {
            return json(500, { error: "Profile upsert failed", detail: upsertErr.message });
        }

        return json(200, { success: true, user: created.user });

    } catch (err: any) {
        return json(500, { error: "Internal server error", detail: err.message });
    }
});
