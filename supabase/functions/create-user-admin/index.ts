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
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const token = extractBearer(req);
        console.log(`[create-user-admin] Auth Token received: ${token ? 'YES' : 'NO'} (${token?.substring(0, 15)}... len: ${token?.length})`);

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log(`[create-user-admin] Token Role: ${payload.role}, User: ${payload.sub}`);
            } catch (err: any) {
                console.log(`[create-user-admin] Could not decode token payload: ${err.message}`);
            }
        }

        if (!token) {
            return json(401, { error: "No Bearer token provided" });
        }

        // ✅ 1) Usar helper compartilhado para validar JWT e Permissões
        // Precisamos do pharmacy_id do body para validar se o admin tem acesso (embora admin sempre tenha)
        let reqJson: any = {};
        try {
            reqJson = await req.json();
        } catch {
            return json(400, { error: "Invalid JSON body" });
        }

        let pharmacy_id = reqJson.pharmacy_id || reqJson?.metadata?.pharmacy_id;
        pharmacy_id = typeof pharmacy_id === "string" ? pharmacy_id.trim() : pharmacy_id;

        const authz = await authorizeBillingAccess({
            token,
            pharmacyId: pharmacy_id || undefined
        });

        if (!authz.allowed) {
            console.error(`[create-user-admin] Unauthorized access blocked: ${authz.reason}`);
            return json(401, {
                error: "Invalid JWT",
                detail: authz.detail || authz.reason,
                message: "Sessão expirada ou sem permissão de administrador."
            });
        }

        if (!authz.isAdmin) {
            return json(403, { error: "Only admin can approve a pharmacy" });
        }

        const supabaseAdmin = adminClient();

        const approve_pharmacy = reqJson.approve_pharmacy === true;
        let pharmacyData = null; // To hold pharmacy data, whether approved or just fetched for user creation

        if (approve_pharmacy) {
            if (!pharmacy_id) return json(400, { error: "Field 'pharmacy_id' is required to approve a pharmacy" });

            // --- subscription gate (Auto-Fix) ---
            let { data: subscription, error: subError } = await supabaseAdmin
                .from("pharmacy_subscriptions")
                .select("*")
                .eq("pharmacy_id", pharmacy_id)
                .maybeSingle();

            if (subError) {
                console.error("Error checking subscription:", subError);
                return json(500, { error: "Error checking subscription", detail: subError.message });
            }

            // AUTO-FIX: Se não tiver assinatura ou status for inválido, criar Trial automaticamente
            if (!subscription || !["active", "trialing"].includes(subscription.status)) {
                console.log(`[Auto-Fix] Creating trial subscription for pharmacy ${pharmacy_id}`);

                let planId = null;
                const { data: planData } = await supabaseAdmin
                    .from("billing_plans")
                    .select("id")
                    .or("slug.eq.basic,slug.eq.gratuito,slug.eq.free")
                    .limit(1)
                    .maybeSingle();

                planId = planData?.id;

                if (!planId) {
                    const { data: anyPlan } = await supabaseAdmin
                        .from("billing_plans")
                        .select("id")
                        .limit(1)
                        .maybeSingle();
                    planId = anyPlan?.id;
                }

                if (!planId) {
                    return json(500, { error: "Sistema sem planos de cobrança cadastrados. Crie um plano antes." });
                }

                const trialEnd = new Date();
                trialEnd.setDate(trialEnd.getDate() + 14);

                const { data: newSub, error: createSubError } = await supabaseAdmin
                    .from("pharmacy_subscriptions")
                    .upsert({
                        pharmacy_id: pharmacy_id,
                        plan_id: planId,
                        status: "active",
                        started_at: new Date().toISOString(),
                        next_billing_date: trialEnd.toISOString().split('T')[0],
                        cancel_at_period_end: false
                    }, { onConflict: 'pharmacy_id' })
                    .select()
                    .single();

                if (createSubError) {
                    console.error("Failed to auto-create subscription:", createSubError);
                    return json(500, {
                        error: "Falha ao criar assinatura automática",
                        detail: createSubError.message
                    });
                }

                subscription = newSub;
            }

            // --- approve ---
            // Trava de segurança: só permite aprovar o que está pendente (anti-replay/abuso)
            const { data: updated, error: approvalError } = await supabaseAdmin
                .from("pharmacies")
                .update({
                    status: "approved"
                    // 🚩 Audit columns temporarily removed to avoid "column not found" error
                    // approved_by: authz.userId,
                    // approved_at: new Date().toISOString()
                })
                .eq("id", pharmacy_id)
                .eq("status", "pending") // 🚩 CRITICAL: Só aprova se estiver pendente
                .select("id,status,owner_email,owner_name,owner_phone")
                .maybeSingle();

            if (approvalError) {
                console.error("[create-user-admin] Approval error:", approvalError);
                return json(500, { error: "Approval failed", detail: approvalError.message });
            }

            if (!updated) {
                // Se não retornou nada, é porque o filtro .eq("status", "pending") falhou (ou ID inexistente)
                console.warn(`[create-user-admin] Pharmacy ${pharmacy_id} was not approved (likely not in 'pending' status)`);
                return json(400, {
                    error: "Invalid state",
                    message: "Esta farmácia não está pendente ou já foi aprovada anteriormente."
                });
            }
            pharmacyData = updated;
            console.log(`[create-user-admin] Pharmacy ${pharmacy_id} successfully approved by ${authz.userId}`);
        } else {
            // If not approving, just fetch the pharmacy data to get owner details for user creation
            if (pharmacy_id) {
                const { data, error } = await supabaseAdmin
                    .from("pharmacies")
                    .select("id,status,owner_email,owner_name,owner_phone,name")
                    .eq("id", pharmacy_id)
                    .maybeSingle();
                if (error) {
                    console.error("[create-user-admin] Error fetching pharmacy data:", error);
                    return json(500, { error: "Error fetching pharmacy data", detail: error.message });
                }
                pharmacyData = data;
            }
        }

        // --- create / ensure owner user ---
        // Use pharmacyData if available, otherwise fall back to reqJson for email/name
        const email = (reqJson.email || pharmacyData?.owner_email || "").trim().toLowerCase();
        const password = (reqJson.password || "").trim();

        const metadata = {
            full_name: reqJson.metadata?.full_name || reqJson.full_name || pharmacyData?.owner_name || pharmacyData?.name || "",
            role: reqJson.metadata?.role || reqJson.role || 'merchant',
            pharmacy_id: pharmacy_id || null,
            phone: reqJson.metadata?.phone || reqJson.phone || pharmacyData?.owner_phone || ""
        };

        let user = null;

        if (email && password && password.length >= 6) {
            console.log(`[create-user-admin] Creating user: ${email}`);
            const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            });

            if (createError) {
                if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
                    console.log(`[create-user-admin] User ${email} already exists. Finding ID...`);

                    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

                    if (existingUser) {
                        user = existingUser;
                        console.log(`[create-user-admin] Found existing userId=${existingUser.id}. Updating metadata...`);

                        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                            user_metadata: metadata,
                            email_confirm: true
                        });
                    }
                } else {
                    console.error("[create-user-admin] User creation error:", createError);
                }
            } else {
                user = userData.user;
                console.log(`[create-user-admin] User created: ${user.id}`);
            }
        }

        // Sync Owner ID (Only if we have a pharmacy)
        if (user && pharmacy_id) {
            await supabaseAdmin.from('pharmacies').update({
                owner_id: user.id,
                owner_email: email // Garante sincronia do email oficial de acesso 
            }).eq('id', pharmacy_id);
        }

        return json(200, {
            success: true,
            approved: approve_pharmacy,
            pharmacy: pharmacyData,
            user: user
        });
    } catch (error: any) {
        console.error("[create-user-admin] Fatal Error:", error);
        return json(500, { error: "Internal Server Error", detail: error?.message ?? null });
    }
});

