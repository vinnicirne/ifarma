import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const token = extractBearer(req);
        if (!token) return json({ error: "Unauthorized" }, 401);

        const body = (await req.json());
        if (!body?.pharmacy_id) return json({ error: "pharmacy_id required" }, 400);

        // Authorization: Admin is required to provision access
        const authz = await authorizeBillingAccess({ token, pharmacyId: body.pharmacy_id });
        if (!authz.allowed || !authz.isAdmin) {
            return json({ error: "Forbidden", reason: "Somente administradores podem provisionar acesso." }, 403);
        }

        const sb = adminClient();

        // Get pharmacy details to get the current email
        const { data: pharmacy, error: pErr } = await sb
            .from("pharmacies")
            .select("id, name, owner_email, owner_name, owner_phone")
            .eq("id", body.pharmacy_id)
            .single();

        if (pErr || !pharmacy) return json({ error: "Pharmacy not found" }, 404);

        const email = pharmacy.owner_email;
        if (!email) return json({ error: "A farmácia não possui um e-mail cadastrado." }, 400);

        const password = genPassword(10);

        // Find existing user by email
        const { data: list, error: lErr } = await sb.auth.admin.listUsers();
        if (lErr) throw lErr;

        const existing = list.users.find((u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase());

        let userId: string;
        const metadata = {
            full_name: pharmacy.owner_name || pharmacy.name,
            role: 'merchant',
            pharmacy_id: pharmacy.id,
            phone: pharmacy.owner_phone
        };

        if (!existing) {
            console.log(`[provision-merchant-access] Creating new user for: ${email}`);
            const { data, error } = await sb.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            });
            if (error) throw error;
            userId = data.user!.id;
        } else {
            console.log(`[provision-merchant-access] User already exists: ${email}. Resetting password.`);
            const { data, error } = await sb.auth.admin.updateUserById(existing.id, {
                password,
                user_metadata: metadata
            });
            if (error) throw error;
            userId = data.user!.id;
        }

        // Link User to Pharmacy in profiles and update owner_id
        await sb.from("profiles").upsert({
            id: userId,
            email,
            full_name: pharmacy.owner_name || pharmacy.name,
            role: 'merchant',
            phone: pharmacy.owner_phone,
            pharmacy_id: pharmacy.id
        });

        await sb.from("pharmacies").update({ owner_id: userId }).eq('id', pharmacy.id);

        return json({
            success: true,
            email,
            temporary_password: password,
            user_id: userId
        });

    } catch (e: any) {
        console.error("[provision-merchant-access] Fatal Error:", e);
        return json({ error: e?.message ?? "Internal Server Error" }, 500);
    }
});
