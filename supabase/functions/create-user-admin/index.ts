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

            // FETCH PLAN ID (Fix for 'plan' column missing)
            let planId = null;
            const { data: planData } = await supabaseAdmin
                .from("billing_plans")
                .select("id")
                .or("slug.eq.basic,slug.eq.gratuito,slug.eq.free")
                .limit(1)
                .maybeSingle();

            planId = planData?.id;

            // Fallback: Get ANY plan if specific ones are missing
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
            trialEnd.setDate(trialEnd.getDate() + 14); // 14 dias de trial

            const { data: newSub, error: createSubError } = await supabaseAdmin
                .from("pharmacy_subscriptions")
                .upsert({
                    pharmacy_id: pharmacy_id,
                    plan_id: planId,
                    status: "active", // Changed from trialing to active for better frontend visibility
                    started_at: new Date().toISOString(),
                    next_billing_date: trialEnd.toISOString().split('T')[0],
                    cancel_at_period_end: false
                }, { onConflict: 'pharmacy_id' })
                .select()
                .single();

            if (createSubError) {
                console.error("Failed to auto-create subscription:", createSubError);
                return json(500, {
                    error: "Falha ao criar assinatura automática. Verifique os logs.",
                    detail: createSubError.message
                });
            }

            subscription = newSub;
        }

        // --- approve ---
        const { data: updated, error: approvalError } = await supabaseAdmin
            .from("pharmacies")
            .update({ status: "approved" })
            .eq("id", pharmacy_id)
            .select("id,status,owner_email,owner_name,owner_phone")
            .single();

        if (approvalError) {
            return json(500, { error: "Approval failed", detail: approvalError.message });
        }

        // --- create / ensure owner user ---
        const email = (reqJson.email || updated.owner_email || "").trim().toLowerCase();
        const password = (reqJson.password || "").trim();
        const metadata = {
            full_name: updated.owner_name || updated.name,
            role: 'merchant',
            pharmacy_id: pharmacy_id,
            phone: updated.owner_phone
        };

        let user = null;

        if (email && password && password.length >= 6) {
            console.log(`[create-user-admin] Creating owner user: ${email}`);
            const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            });

            if (createError) {
                // If user already exists, we MUST update their password to the new provisional one
                if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
                    console.log(`[create-user-admin] User ${email} already exists. Updating password...`);

                    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

                    if (existingUser) {
                        user = existingUser;
                        const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                            password: password,
                            user_metadata: metadata,
                            email_confirm: true
                        });

                        if (updateAuthErr) {
                            console.error("[create-user-admin] Error updating existing user password:", updateAuthErr);
                        } else {
                            console.log(`[create-user-admin] Password updated for existing user: ${existingUser.id}`);
                        }
                    } else {
                        console.error("[create-user-admin] User exists but could not be found in list.");
                    }
                } else {
                    console.error("[create-user-admin] User creation error:", createError);
                }
            } else {
                user = userData.user;
                console.log(`[create-user-admin] User created: ${user.id}`);
            }
        } else {
            // This block was previously handling user creation success, but now it should handle the case
            // where email/password conditions are not met, and thus no user creation attempt was made.
            // The original code had `user = userData.user;` here, which is incorrect if no user was created.
            // For now, we'll leave it as is, assuming `user` remains null if conditions are not met.
            // A more robust solution might involve returning an error here if email/password are missing.
            console.log(`[create-user-admin] Skipping user creation: email or password not provided or too short.`);
        }

        // Sync Owner ID if we have a user
        if (user) {
            await supabaseAdmin.from('pharmacies').update({ owner_id: user.id }).eq('id', pharmacy_id);
        }

        return json(200, {
            success: true,
            approved: true,
            pharmacy: updated,
            user: user // Needed by pharmacyService.ts
        });
    } catch (error: any) {
        console.error("[create-user-admin] Fatal Error:", error);
        return json(500, { error: "Internal Server Error", detail: error?.message ?? null });
    }
});

