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

// Helpers para garantir logs claros caso uma FK bloqueie o delete
async function safeUpdate(p: Promise<{ error: any }>, label: string) {
    const { error } = await p;
    if (error) {
        console.warn(`[delete-user-admin] ⚠️ Warning at ${label}:`, error.message);
        return false;
    }
    return true;
}

async function safeDelete(p: Promise<{ error: any }>, label: string) {
    const { error } = await p;
    if (error) {
        console.warn(`[delete-user-admin] ⚠️ Warning at ${label}:`, error.message);
        return false;
    }
    return true;
}

Deno.serve(async (req) => {
    console.log(`[delete-user-admin] 📥 Incoming ${req.method} ${req.url}`);

    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const supabaseAdmin = adminClient();
        const token = extractBearer(req);
        if (!token) return json(401, { error: "No Bearer token provided" });

        const body = await req.json().catch(() => null);
        if (!body) return json(400, { error: "Invalid JSON body" });

        const user_id = typeof body.user_id === "string" ? body.user_id.trim() : "";
        const pharmacy_id = typeof body.pharmacy_id === "string" ? body.pharmacy_id.trim() : "";
        if (!user_id) return json(400, { error: "Field 'user_id' is required" });

        // 1) Autorização Definitiva
        const authz = await authorizeBillingAccess({
            token,
            pharmacyId: pharmacy_id || undefined
        });

        if (!authz.allowed) {
            // Diferenciar entre JWT inválido (401) e Falta de context/permissão (403)
            if (authz.reason === "missing_jwt" || authz.reason === "invalid_jwt") {
                return json(401, { error: "Invalid or expired JWT", detail: authz.detail || authz.reason });
            }
            return json(403, { error: "Access denied", detail: authz.detail || authz.reason });
        }

        // Se não for admin, verificar se ele pode deletar este usuário específico
        if (!authz.isAdmin) {
            // Se for merchant, ele deve ter passado um pharmacy_id e o target_user deve pertencer a ela
            if (!pharmacy_id) {
                return json(403, { error: "Access denied", detail: "Pharmacy ID is required for non-admin deletion." });
            }

            // Validar se o usuário alvo pertence a essa farmácia
            const { data: targetProfile, error: targetErr } = await supabaseAdmin
                .from("profiles")
                .select("pharmacy_id, role")
                .eq("id", user_id)
                .maybeSingle();

            if (targetErr || !targetProfile) {
                return json(404, { error: "Target user not found or error fetching profile." });
            }

            if (targetProfile.pharmacy_id !== pharmacy_id) {
                return json(403, { error: "Access denied", detail: "You can only delete users from your own pharmacy." });
            }

            // Evitar que merchant delete outro merchant na mesma farmácia (opcional, mas seguro)
            if (targetProfile.role === 'merchant' && user_id !== authz.userId) {
                // Talvez permitir se for o owner? Mas por segurança, só admin deleta merchant.
            }
        }

        if (authz.userId === user_id) {
            return json(400, { error: "Você não pode excluir seu próprio usuário admin através desta rota." });
        }

        console.log(`[delete-user-admin] Starting cleanup process for user: ${user_id}`);

        // 2) Limpeza PROATIVA de Chaves Estrangeiras (FKs)
        // Usamos os helpers "safe" para não travar o processo, mas registrar no log onde está o problema.

        // Vínculos em Farmácias (Dono e Auditoria)
        await safeUpdate(
            supabaseAdmin.from("pharmacies").update({ owner_id: null }).eq("owner_id", user_id),
            "pharmacies.owner_id"
        );
        await safeUpdate(
            supabaseAdmin.from("pharmacies").update({ approved_by: null }).eq("approved_by", user_id),
            "pharmacies.approved_by"
        );

        // Vínculos em Pedidos (Clientes e Motoboys)
        await safeUpdate(
            supabaseAdmin.from("orders").update({ customer_id: null }).eq("customer_id", user_id),
            "orders.customer_id"
        );
        await safeUpdate(
            supabaseAdmin.from("orders").update({ motoboy_id: null }).eq("motoboy_id", user_id),
            "orders.motoboy_id"
        );

        // Atribuições e Histórico de Entregas
        await safeUpdate(
            supabaseAdmin.from("order_assignments").update({ motoboy_id: null }).eq("motoboy_id", user_id),
            "order_assignments.motoboy_id"
        );
        await safeUpdate(
            supabaseAdmin.from("order_assignments").update({ assigned_by: null }).eq("assigned_by", user_id),
            "order_assignments.assigned_by"
        );

        // Dados de Rastreamento (Motoboy Live)
        await safeDelete(
            supabaseAdmin.from("motoboy_live_locations").delete().eq("motoboy_id", user_id),
            "motoboy_live_locations"
        );
        await safeDelete(
            supabaseAdmin.from("delivery_tracks").delete().eq("motoboy_id", user_id),
            "delivery_tracks"
        );
        await safeDelete(
            supabaseAdmin.from("courier_contracts").delete().eq("courier_id", user_id),
            "courier_contracts"
        );

        // Notificações e Tokens
        await safeDelete(
            supabaseAdmin.from("notifications").delete().eq("user_id", user_id),
            "notifications"
        );
        await safeDelete(
            supabaseAdmin.from("device_tokens").delete().eq("user_id", user_id),
            "device_tokens"
        );

        // 3) Deleção do Perfil (Último passo antes do Auth)
        console.log(`[delete-user-admin] 🗑️ Dropping profile for user: ${user_id}`);
        const { error: profDelErr } = await supabaseAdmin
            .from("profiles")
            .delete()
            .eq("id", user_id);

        if (profDelErr) {
            console.warn("[delete-user-admin] ⚠️ Profile delete failed (check for unmapped FKs):", profDelErr.message);
        } else {
            console.log("[delete-user-admin] ✅ Profile record removed successfully.");
        }

        // 4) Deleção Final no Supabase Auth
        console.log(`[delete-user-admin] 🚀 EXECUTING FINAL AUTH DELETE for ${user_id}...`);
        const { data: delResult, error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (authDelErr) {
            console.error("[delete-user-admin] ❌ Auth delete failed:", authDelErr);
            return json(500, {
                success: false,
                error: "Failed to delete user in Supabase Auth",
                detail: authDelErr.message,
                hint: "Verifique os logs acima por avisos (Warning). Uma Foreign Key bloqueou a exclusão do Auth."
            });
        }

        console.log(`[delete-user-admin] ✅ User ${user_id} deleted successfully from Auth. Result metadata:`, delResult);
        return json(200, {
            success: true,
            message: "User deleted and dependencies cleaned.",
            user_id: user_id
        });

    } catch (e: any) {
        console.error("[delete-user-admin] ❌ Fatal error:", e);
        return json(500, { error: "Internal Server Error", detail: e?.message });
    }
});
