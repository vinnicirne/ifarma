import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractBearer, authorizeBillingAccess, adminClient } from "../_shared/authz.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function genPassword(len = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEmail(v: unknown) {
    if (typeof v !== "string") return "";
    return v.trim().toLowerCase();
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        // Diagnostic: prove which project we are targeting
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        console.log(`[provision-merchant-access] Target SUPABASE_URL=${supabaseUrl}`);

        const token = extractBearer(req);
        if (!token) return json({ error: "Unauthorized" }, 401);

        let body: any;
        try {
            body = await req.json();
        } catch {
            return json({ error: "Invalid JSON body" }, 400);
        }

        const pharmacy_id = body?.pharmacy_id;
        const force_reset = !!body?.force_reset;

        if (!pharmacy_id || typeof pharmacy_id !== "string" || !isUuid(pharmacy_id)) {
            return json({ error: "pharmacy_id inválido" }, 400);
        }

        // Admin-only
        const authz = await authorizeBillingAccess({ token, pharmacyId: pharmacy_id });
        if (!authz.allowed || !authz.isAdmin) {
            return json({ error: "Forbidden", reason: "Somente administradores podem provisionar acesso." }, 403);
        }

        const sb = adminClient();

        // Fetch pharmacy (include owner_id + owner_email)
        const { data: pharmacy, error: pErr } = await sb
            .from("pharmacies")
            .select("id, name, owner_id, owner_email, owner_name, owner_phone")
            .eq("id", pharmacy_id)
            .single();

        if (pErr) throw pErr;
        if (!pharmacy) return json({ error: "Pharmacy not found" }, 404);

        const email = normalizeEmail(pharmacy.owner_email);
        console.log(`[provision-merchant-access] pharmacy=${pharmacy.id} owner_id=${pharmacy.owner_id ?? "null"} owner_email=${email || "EMPTY"} force_reset=${force_reset}`);

        if (!email) {
            return json({ error: "A farmácia não possui um e-mail (owner_email) cadastrado." }, 400);
        }

        let password: string | null = null;
        let userId: string | null = pharmacy.owner_id;

        const metadata = {
            full_name: pharmacy.owner_name || pharmacy.name,
            role: "merchant",
            pharmacy_id: pharmacy.id,
            phone: pharmacy.owner_phone,
        };

        // 1. Determine User ID if not known
        if (!userId) {
            console.log(`[provision-merchant-access] Searching for existing user by email=${email}`);
            let page = 1;
            while (true) {
                const { data: listRes, error: listErr } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
                if (listErr) {
                    console.error("[provision-merchant-access] listUsers error:", listErr);
                    break;
                }
                const users = listRes?.users ?? [];
                if (users.length === 0) break;

                const found = users.find(u => normalizeEmail(u.email) === email);
                if (found) {
                    userId = found.id;
                    break;
                }
                if (users.length < 1000) break;
                page++;
            }
        }

        // 2. Create or Update
        if (!userId) {
            console.log(`[provision-merchant-access] Creating new user: ${email}`);
            password = genPassword(12);
            const { data: createData, error: createError } = await sb.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata,
            });

            if (createError) throw createError;
            userId = createData.user.id;
        } else {
            console.log(`[provision-merchant-access] Updating existing user: ${userId}`);

            const updatePayload: any = { user_metadata: metadata };
            if (force_reset) {
                password = genPassword(12);
                updatePayload.password = password;
                console.log("[provision-merchant-access] Password reset forced.");
            }

            const { error: updateErr } = await sb.auth.admin.updateUserById(userId, updatePayload);
            if (updateErr) throw updateErr;
        }

        if (!userId) return json({ error: "Falha ao determinar o ID do usuário." }, 500);


        // Write profile (must succeed)
        console.log(`[provision-merchant-access] Upserting profile id=${userId}`);
        const { error: profErr } = await sb.from("profiles").upsert({
            id: userId,
            email,
            full_name: pharmacy.owner_name || pharmacy.name,
            role: "merchant",
            phone: pharmacy.owner_phone,
            pharmacy_id: pharmacy.id,
        });
        if (profErr) {
            console.error("[provision-merchant-access] profiles upsert error:", profErr);
            throw profErr;
        }

        // Link owner_id + normalize owner_email (must succeed)
        console.log(`[provision-merchant-access] Updating pharmacies.owner_id=${userId} owner_email=${email}`);
        const { error: ownErr } = await sb
            .from("pharmacies")
            .update({ owner_id: userId, owner_email: email })
            .eq("id", pharmacy.id);

        if (ownErr) {
            console.error("[provision-merchant-access] pharmacies update error:", ownErr);
            throw ownErr;
        }

        return json({
            success: true,
            email,
            // Se password for null, significa que o usuário já existia e a senha foi mantida.
            temporary_password: password,
            user_id: userId,
        }, 200);
    } catch (e: any) {
        console.error("[provision-merchant-access] Fatal Error:", e?.message ?? e);
        return json({ error: e?.message ?? "Internal Server Error" }, 500);
    }
});

