import { extractBearer, adminClient, authorizeBillingAccess } from "../_shared/authz.ts";

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

Deno.serve(async (req) => {
    console.log(`[create-staff-user] 📥 Incoming ${req.method} ${req.url}`);

    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const supabaseAdmin = adminClient();
        const token = extractBearer(req);
        if (!token) return json(401, { error: "No Bearer token provided" });

        const body = await req.json().catch(() => null);
        if (!body) return json(400, { error: "Invalid JSON body" });

        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "").trim();
        const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};
        let pharmacy_id = body.pharmacy_id || metadata.pharmacy_id;

        pharmacy_id = typeof pharmacy_id === "string" ? pharmacy_id.trim() : pharmacy_id;
        if (!pharmacy_id) return json(400, { error: "Field 'pharmacy_id' is required" });

        // ✅ 1) Autenticar e Autorizar via Global Helper
        const authz = await authorizeBillingAccess({
            token,
            pharmacyId: pharmacy_id
        });

        if (!authz.allowed) {
            return json(401, { error: "Invalid JWT", detail: authz.detail || authz.reason });
        }

        // ✅ 2) Regra de Negócio: Não-admin só cria para sua própria farmácia
        // O authorizeBillingAccess já checou se o requester é dono/merchant da pharmacy_id fornecida.
        // Se for admin global, ele passa pelo authorize também.

        if (!email || !password || password.length < 6) {
            return json(400, { error: "Email and password (min 6 chars) are required" });
        }

        const requestedRole = String(metadata.role || "staff");
        const validRoles = ["staff", "motoboy", "manager"];
        if (!validRoles.includes(requestedRole)) {
            return json(400, { error: "Invalid role for staff creation" });
        }

        // ✅ 3) Validar Existência da Farmácia
        const { data: pharmacyExists } = await supabaseAdmin
            .from("pharmacies")
            .select("id")
            .eq("id", pharmacy_id)
            .maybeSingle();

        if (!pharmacyExists) return json(404, { error: "Pharmacy not found" });

        // ✅ 4) Criar Usuário no Auth
        console.log(`[create-staff-user] Creating ${requestedRole}: ${email}`);
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { ...metadata, pharmacy_id }
        });

        if (createErr || !created?.user) {
            const msg = createErr?.message ?? "Create user failed";
            if (msg.includes("already")) return json(409, { error: "User already exists", code: "USER_ALREADY_EXISTS" });
            return json(400, { error: msg });
        }

        // ✅ 5) Sincronizar Profile
        const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
            id: created.user.id,
            email,
            role: requestedRole,
            full_name: metadata.full_name || email.split("@")[0],
            pharmacy_id: pharmacy_id,
            phone: metadata.phone || null,
            vehicle_plate: metadata.vehicle_plate || null,
            vehicle_model: metadata.vehicle_model || null,
        });

        if (upsertErr) {
            console.error("[create-staff-user] Profile sync error:", upsertErr);
            // Non-blocking for the response, but ideally we'd log it
        }

        console.log(`[create-staff-user] Success: ${created.user.id}`);
        return json(200, { success: true, user: created.user });

    } catch (e: any) {
        console.error("[create-staff-user] Fatal:", e);
        return json(500, { error: "Internal Server Error", detail: e?.message });
    }
});
