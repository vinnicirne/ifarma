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
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const serviceRoleKey =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
            Deno.env.get("IFARMA_SERVICE_ROLE_KEY") ??
            Deno.env.get("ADMIN_SERVICE_ROLE_KEY") ??
            "";

        if (!supabaseUrl || !serviceRoleKey) {
            return json(500, { error: "Missing env vars" });
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return json(401, { error: "No Bearer token provided" });
        }

        // 1) Auth Check
        const supabaseUser = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        if (userErr || !userData?.user) {
            return json(401, { error: "Invalid JWT", detail: userErr?.message });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 2) Role Check
        const { data: requesterProfile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();

        if (requesterProfile?.role !== "admin") {
            return json(403, { error: "Only admins can update users" });
        }

        // 3) Body Processing
        const { userId, email, password, metadata } = await req.json();
        if (!userId) return json(400, { error: "ID do usuário é obrigatório" });

        console.log(`[update-user-admin] Updating user: ${userId}`);

        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (metadata) updateData.user_metadata = metadata;

        const { data: user, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updateData
        );

        if (updateError) {
            console.error("[update-user-admin] Update error:", updateError);
            return json(400, { error: updateError.message });
        }

        return json(200, { success: true, user });
    } catch (error: any) {
        console.error("[update-user-admin] Internal error:", error.message);
        return json(500, { error: "Internal Server Error", detail: error.message });
    }
});
