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
    console.log(`[delete-pharmacy-admin] 📥 Incoming ${req.method} ${req.url}`);

    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const supabaseAdmin = adminClient();
        const token = extractBearer(req);
        if (!token) return json(401, { error: "No Bearer token provided" });

        const body = await req.json().catch(() => null);
        if (!body) return json(400, { error: "Invalid JSON body" });

        const pharmacy_id = typeof body.pharmacy_id === "string" ? body.pharmacy_id.trim() : "";
        if (!pharmacy_id) return json(400, { error: "Field 'pharmacy_id' is required" });

        // 1) Autorização (Só Admin via Metadados ou Banco)
        const authz = await authorizeBillingAccess({ token });
        if (!authz.isAdmin) {
            console.warn(`[delete-pharmacy-admin] ⛔ Unauthorized access attempt by user: ${authz.userId}`);
            return json(403, { error: "Access denied. Admins only." });
        }

        console.log(`[delete-pharmacy-admin] 🚀 Starting deep deletion for pharmacy: ${pharmacy_id}`);

        // 2) Buscar todos os usuários vinculados (incluindo o dono e staff)
        const { data: pharmacy } = await supabaseAdmin
            .from('pharmacies')
            .select('owner_id, name')
            .eq('id', pharmacy_id)
            .maybeSingle();

        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('pharmacy_id', pharmacy_id);

        const idsToDelete = new Set<string>();
        if (pharmacy?.owner_id) idsToDelete.add(pharmacy.owner_id);
        if (profiles) profiles.forEach(p => idsToDelete.add(p.id));

        console.log(`[delete-pharmacy-admin] Found ${idsToDelete.size} unique user IDs to delink/delete.`);

        // 3) Limpar dependências da farmácia antes de deletar a farmácia
        // Pedidos
        console.log(`[delete-pharmacy-admin] 🗑️ Cleaning orders...`);
        await supabaseAdmin.from('orders').delete().eq('pharmacy_id', pharmacy_id);

        // Produtos
        console.log(`[delete-pharmacy-admin] 🗑️ Cleaning products...`);
        await supabaseAdmin.from('products').delete().eq('pharmacy_id', pharmacy_id);

        // Assinaturas e Bilhetes de Reembolso
        console.log(`[delete-pharmacy-admin] 🗑️ Cleaning billing and subscriptions...`);
        await supabaseAdmin.from('pharmacy_subscriptions').delete().eq('pharmacy_id', pharmacy_id);
        await supabaseAdmin.from('billing_cycles').delete().eq('pharmacy_id', pharmacy_id);
        await supabaseAdmin.from('billing_invoices').delete().eq('pharmacy_id', pharmacy_id);

        // Marketing e Banners
        console.log(`[delete-pharmacy-admin] 🗑️ Cleaning marketing assets...`);
        await supabaseAdmin.from('marketing_campaigns').delete().eq('pharmacy_id', pharmacy_id);
        await supabaseAdmin.from('pharmacy_coupons').delete().eq('pharmacy_id', pharmacy_id);

        // Notificações (Sem .catch() pois Postgrest não é uma Promise padrão aqui)
        await supabaseAdmin.from('notifications').delete().eq('pharmacy_id', pharmacy_id);

        // Desvincular perfis da farmácia (para não travar o delete da farmácia)
        console.log(`[delete-pharmacy-admin] 🖇️ Unlinking profiles...`);
        await supabaseAdmin.from('profiles').update({ pharmacy_id: null }).eq('pharmacy_id', pharmacy_id);

        // 4) Deletar a farmácia
        console.log(`[delete-pharmacy-admin] 💥 Removing pharmacy record from database...`);
        const { error: phDelErr } = await supabaseAdmin.from('pharmacies').delete().eq('id', pharmacy_id);

        if (phDelErr) {
            console.error(`[delete-pharmacy-admin] ❌ Error deleting pharmacy:`, phDelErr);
            return json(500, {
                error: "Failed to delete pharmacy record",
                detail: phDelErr.message,
                hint: "Pode haver chaves estrangeiras pendentes no banco."
            });
        }

        // 5) Deletar os usuários do Auth (Limpeza final)
        for (const userId of idsToDelete) {
            console.log(`[delete-pharmacy-admin] 👤 Removing Auth User: ${userId}`);

            // Limpeza básica de dependências do usuário (mesma lógica do delete-user-admin reduzida)
            await supabaseAdmin.from("order_assignments").update({ motoboy_id: null }).eq("motoboy_id", userId);
            await supabaseAdmin.from("motoboy_live_locations").delete().eq("motoboy_id", userId);

            const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authDelErr) {
                console.warn(`[delete-pharmacy-admin] ⚠️ Auth delete failed for user ${userId}:`, authDelErr.message);
            }

            // Deletar perfil manualmente se o cascade falhou
            await supabaseAdmin.from('profiles').delete().eq('id', userId);
        }

        console.log(`[delete-pharmacy-admin] ✅ ALL DONE. Pharmacy ${pharmacy_id} wiped.`);
        return json(200, {
            success: true,
            message: "Pharmacy and all associated data deleted successfully.",
            pharmacy_id: pharmacy_id
        });

    } catch (e: any) {
        console.error("[delete-pharmacy-admin] ❌ Fatal internal error:", e);
        return json(500, { error: "Internal Server Error", detail: e?.message });
    }
});
