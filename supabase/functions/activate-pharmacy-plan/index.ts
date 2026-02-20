
// ============================================================================
// EDGE FUNCTION: Activate Pharmacy Plan (Restored Logic + Fixes)
// ============================================================================

import { extractBearer, adminClient, authorizeBillingAccess } from "../_shared/authz.ts";
import { asaasFetch } from "../_shared/asaas.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function toYMD(d: Date) {
    return d.toISOString().slice(0, 10);
}

function firstDayNextMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function firstDayInMonths(d: Date, monthsAhead: number) {
    return new Date(d.getFullYear(), d.getMonth() + monthsAhead, 1);
}

Deno.serve(async (req) => {
    // 0. Handle CORS Preflight
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const token = extractBearer(req);
        // console.warn("[activate-pharmacy-plan] TEST MODE: JWT ignored. Token present:", !!token);

        // 1. Parse Body
        let body: { pharmacy_id: string; plan_id?: string };
        try {
            body = await req.json();
            console.log("[activate-pharmacy-plan] Body received:", JSON.stringify(body));
        } catch (e: any) {
            console.error("[activate-pharmacy-plan] Invalid JSON body:", e);
            return json({ error: "Invalid JSON body", details: e?.message }, 400);
        }

        const { pharmacy_id, plan_id } = body;

        if (!pharmacy_id || !isUuid(pharmacy_id)) {
            console.error(`[activate-pharmacy-plan] Invalid pharmacy_id: ${pharmacy_id}`);
            return json({ error: "pharmacy_id inválido ou ausente" }, 400);
        }

        // 2. Authorization Check (Improved Security)
        const authz = await authorizeBillingAccess({ token, pharmacyId: pharmacy_id });

        if (!authz.allowed) {
            console.error("[activate-pharmacy-plan] Unauthorized access attempt:", authz.reason);
            return json({ error: "Acesso negado", reason: authz.reason }, 401);
        }

        // 3. Init Admin Client
        const supabaseAdmin = adminClient();

        // 2.1 Fast Path: Check if already active
        const { data: currentSub } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .select("status, plan_id")
            .eq("pharmacy_id", pharmacy_id)
            .maybeSingle();

        if (currentSub?.status === 'active') {
            const requestedPlan = plan_id || currentSub.plan_id;
            // Only allow if upgrading/changing, otherwise return success
            // For now, simple idempotent check: if active, assume success.
            // (Refinement: check if plan_id matches)
            if (!plan_id || plan_id === currentSub.plan_id) {
                console.log(`[activate-pharmacy-plan] Subscription already active for pharmacy ${pharmacy_id}. Returning success.`);
                return json({ success: true, message: "Subscription already active" });
            }
        }

        console.log(`[activate-pharmacy-plan] Fetching pharmacy: ${pharmacy_id}`);

        // 3. Fetch Pharmacy
        const { data: pharmacy, error: pErr } = await supabaseAdmin
            .from("pharmacies")
            .select("*")
            .eq("id", pharmacy_id)
            .single();

        if (pErr) {
            console.error("[activate-pharmacy-plan] Pharmacy fetch error:", pErr);
            return json({ error: "Erro ao buscar farmácia", details: pErr }, 500);
        }
        if (!pharmacy) {
            console.warn(`[activate-pharmacy-plan] Pharmacy not found: ${pharmacy_id}`);
            return json({ error: "Farmácia não encontrada" }, 404);
        }

        // 4. Resolve Plan
        let targetPlanId = plan_id ?? null;

        if (!targetPlanId) {
            // Try explicit 'free' slug
            const { data: freeBySlug } = await supabaseAdmin
                .from("billing_plans")
                .select("id")
                .eq("slug", "free")
                .maybeSingle();
            if (freeBySlug?.id) targetPlanId = freeBySlug.id;
        }

        if (!targetPlanId) {
            // Try cheapest plan (usually free)
            const { data: freeByZero } = await supabaseAdmin
                .from("billing_plans")
                .select("id")
                .eq("monthly_fee_cents", 0)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            if (freeByZero?.id) targetPlanId = freeByZero.id;
        }

        if (!targetPlanId) {
            console.error("[activate-pharmacy-plan] No plan found via ID, slug 'free', or price 0.");
            return json({ error: "Nenhum plano encontrado. Informe plan_id." }, 400);
        }

        const { data: plan, error: planErr } = await supabaseAdmin
            .from("billing_plans")
            .select("*")
            .eq("id", targetPlanId)
            .single();

        if (planErr || !plan) {
            console.error(`[activate-pharmacy-plan] Plan not found: ${targetPlanId}`);
            return json({ error: "Plano não encontrado" }, 404);
        }

        const isPaidPlan = (plan.monthly_fee_cents ?? 0) > 0;
        console.log(`[activate-pharmacy-plan] Selected Plan: ${plan.name} (${targetPlanId}). Paid: ${isPaidPlan}`);

        // 5. Free Plan Logic
        if (!isPaidPlan) {
            console.log("[activate-pharmacy-plan] Activating Free Plan...");
            const payload = {
                pharmacy_id,
                plan_id: targetPlanId,
                status: "active",
                started_at: new Date().toISOString(),
                next_billing_date: null,
                canceled_at: null,
                ended_at: null,
                asaas_customer_id: null,
                asaas_subscription_id: null,
                asaas_last_error: null,
                asaas_updated_at: new Date().toISOString(),
            };

            const { data: sub, error: upsertErr } = await supabaseAdmin
                .from("pharmacy_subscriptions")
                .upsert(payload, { onConflict: "pharmacy_id" })
                .select()
                .single();

            if (upsertErr) return json({ error: upsertErr.message }, 500);

            // --- NEW: Ensure Billing Cycle exists ---
            try {
                const today = new Date();
                const periodStart = today.toISOString().split('T')[0];
                const periodEnd = new Date(today);
                periodEnd.setDate(periodEnd.getDate() + 30);
                const periodEndStr = periodEnd.toISOString().split('T')[0];

                await supabaseAdmin
                    .from('billing_cycles')
                    .upsert({
                        pharmacy_id,
                        period_start: periodStart,
                        period_end: periodEndStr,
                        status: 'active',
                        free_orders_used: 0,
                        overage_orders: 0,
                        overage_amount_cents: 0,
                    }, { onConflict: 'pharmacy_id,period_start' });
            } catch (err) {
                console.error("[activate-pharmacy-plan] Billing Cycle Insurance failed (non-blocking):", err);
            }
            // ----------------------------------------

            return json({ success: true, subscription: sub, pix: null });
        }

        // 6. Paid Plan Logic
        // Validate CNPJ
        if (!pharmacy.cnpj) {
            console.error(`[activate-pharmacy-plan] Missing CNPJ for pharmacy ${pharmacy_id}`);
            return json({ error: "CNPJ é obrigatório para ativar planos pagos. Atualize o cadastro da farmácia." }, 400);
        }

        // Ensure Asaas Customer
        let asaasCustomerId: string | null = pharmacy.asaas_customer_id ?? null;

        // Sanitize phone
        const rawPhone = pharmacy.owner_phone || pharmacy.establishment_phone || pharmacy.contact_phone;

        const customerPayload = {
            name: pharmacy.name,
            email: pharmacy.owner_email || pharmacy.merchant_email || pharmacy.email || "email@ifarma.com",
            cpfCnpj: pharmacy.cnpj.replace(/\D/g, ''), // Send digits only if preferred, though usually API handles it
            mobilePhone: rawPhone,
            externalReference: pharmacy_id,
        };

        if (!asaasCustomerId) {
            const customerRes = await asaasFetch("/customers", {
                method: "POST",
                body: JSON.stringify(customerPayload),
            });

            if (!customerRes.ok) {
                console.error("[activate-pharmacy-plan] Asaas Customer Creation Failed:", customerRes.rawText);
                return json({ error: "Erro ao criar cliente no Asaas", details: customerRes.rawText }, 502);
            }

            asaasCustomerId = customerRes.data.id;

            // Update pharmacy 
            await supabaseAdmin.from("pharmacies").update({
                asaas_customer_id: asaasCustomerId,
                asaas_status: "ok",
                asaas_last_error: null,
                asaas_updated_at: new Date().toISOString(),
            }).eq("id", pharmacy_id);
        } else {
            // Sync existing
            await asaasFetch(`/customers/${asaasCustomerId}`, {
                method: "POST",
                body: JSON.stringify(customerPayload),
            });
        }

        // 7. Dates
        const today = new Date();
        const firstPaymentDue = toYMD(firstDayNextMonth(today));
        const subscriptionStart = toYMD(firstDayInMonths(today, 2));

        // 8. Idempotent Invoice
        const { data: existingInvoice } = await supabaseAdmin
            .from("billing_invoices")
            .select("*")
            .eq("pharmacy_id", pharmacy_id)
            .eq("invoice_type", "monthly_fee")
            .eq("due_date", firstPaymentDue)
            // .eq("status", "pending") // Removed to check for paid ones too
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 8.1 If already paid effectively, just ensure subscription and return
        if (existingInvoice?.status === 'paid') {
            console.log("[activate-pharmacy-plan] Invoice already paid locally. Returning success.");
            // Ensure subscription is active (fast-path)
            await supabaseAdmin.from("pharmacy_subscriptions").update({ status: 'active' }).eq('pharmacy_id', pharmacy_id);
            return json({ success: true, message: "Plan already active" });
        }

        let pixPaymentId: string | null = existingInvoice?.asaas_invoice_id ?? null;
        let createdNewPix = false;
        let pixQrBase64: string | null = null;
        let pixCopyPaste: string | null = null;
        let pixInvoiceUrl: string | null = existingInvoice?.asaas_invoice_url ?? null;

        // 9. Check if valid PIX still useful (FIX for "invalid_action")
        if (pixPaymentId) {
            console.log(`[activate-pharmacy-plan] Checking existing PIX: ${pixPaymentId}`);
            const qrRes = await asaasFetch(`/payments/${pixPaymentId}/pixQrCode`);

            if (qrRes.ok) {
                // Success - we have the QR code
                pixQrBase64 = qrRes.data.encodedImage;
                pixCopyPaste = qrRes.data.payload;
            } else {
                console.warn(`[activate-pharmacy-plan] PIX Query Failed: ${qrRes.status} - ${qrRes.rawText}`);

                // Check if it's actually PAID
                const payRes = await asaasFetch(`/payments/${pixPaymentId}`);
                const status = payRes.ok ? payRes.data.status : null;

                if (status === 'RECEIVED' || status === 'CONFIRMED') {
                    console.log(`[activate-pharmacy-plan] Payment ${pixPaymentId} is actually PAID. Updating DB.`);

                    // Self-heal: Update Invoice
                    await supabaseAdmin.from("billing_invoices")
                        .update({ status: 'paid', asaas_status: status, paid_at: new Date().toISOString() })
                        .eq("asaas_invoice_id", pixPaymentId);

                    // Update Subscription
                    await supabaseAdmin.from("pharmacy_subscriptions")
                        .update({ status: 'active', activated_at: new Date().toISOString() })
                        .eq("pharmacy_id", pharmacy_id);

                    return json({ success: true, message: "Payment confirmed during check" });
                }

                // If invalid/cannot be paid/overdue, cancel and recreate
                console.log(`[activate-pharmacy-plan] Invoice ${pixPaymentId} invalid/expired. Cancelling and recreating.`);
                await supabaseAdmin.from("billing_invoices")
                    .update({ status: 'cancelled', asaas_updated_at: new Date().toISOString() })
                    .eq("asaas_invoice_id", pixPaymentId);

                pixPaymentId = null; // Force creation of new PIX
            }
        }

        if (!pixPaymentId) {
            console.log("[activate-pharmacy-plan] Generating PIX...");
            const pixRes = await asaasFetch("/payments", {
                method: "POST",
                body: JSON.stringify({
                    customer: asaasCustomerId,
                    billingType: "PIX",
                    value: (plan.monthly_fee_cents ?? 0) / 100,
                    dueDate: firstPaymentDue,
                    description: `1ª mensalidade plano ${plan.name} - ${pharmacy.name}`,
                    externalReference: `${pharmacy_id}:${firstPaymentDue}:monthly_fee`,
                }),
            });

            if (!pixRes.ok) {
                console.error("[activate-pharmacy-plan] Asaas PIX Failed:", pixRes.rawText);
                return json({ error: "Falha ao criar PIX no Asaas", details: pixRes.rawText }, 502);
            }

            pixPaymentId = pixRes.data.id;
            createdNewPix = true;
            pixInvoiceUrl = pixRes.data.invoiceUrl ?? null;

            const { error: invErr } = await supabaseAdmin.from("billing_invoices").insert({
                pharmacy_id,
                invoice_type: "monthly_fee",
                asaas_invoice_id: pixPaymentId,
                amount_cents: plan.monthly_fee_cents,
                due_date: firstPaymentDue,
                status: "pending",
                asaas_invoice_url: pixRes.data.invoiceUrl ?? null,
                asaas_status: pixRes.data.status ?? null,
                asaas_updated_at: new Date().toISOString(),
            });

            if (invErr) {
                console.error("[activate-pharmacy-plan] Billing Insert Failed:", invErr);
                return json({ error: "Falha ao salvar invoice no banco", details: invErr.message }, 500);
            }
        }

        // 10. QR Code already handled above


        // 11. Subscription Spec (Idempotent)
        let asaasError: string | null = null;
        const { data: existingSub } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .select("id, asaas_subscription_id")
            .eq("pharmacy_id", pharmacy_id)
            .maybeSingle();

        let asaasSubscriptionId: string | null = existingSub?.asaas_subscription_id ?? null;

        if (!asaasSubscriptionId) {
            console.log("[activate-pharmacy-plan] Generating Subscription...");
            const subRes = await asaasFetch("/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    customer: asaasCustomerId,
                    billingType: "BOLETO",
                    value: (plan.monthly_fee_cents ?? 0) / 100,
                    cycle: "MONTHLY",
                    description: `Plano ${plan.name} - ${pharmacy.name}`,
                    nextDueDate: subscriptionStart,
                    externalReference: pharmacy_id,
                }),
            });

            if (!subRes.ok) {
                asaasError = `Falha ao criar assinatura: ${subRes.rawText}`;
                console.error("[activate-pharmacy-plan] Subscription failed:", asaasError);
            } else {
                asaasSubscriptionId = subRes.data.id;
            }
        }

        // 12. Upsert Subscription (Pending Payment)
        const status = asaasError ? "failed_asaas" : "pending_asaas";

        const subPayload = {
            pharmacy_id,
            plan_id: targetPlanId,
            status,
            asaas_customer_id: asaasCustomerId,
            asaas_subscription_id: asaasSubscriptionId,
            asaas_last_error: asaasError,
            asaas_updated_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            next_billing_date: firstPaymentDue,
            canceled_at: null,
            ended_at: null,
        };

        const { data: sub, error: upsertErr } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .upsert(subPayload, { onConflict: "pharmacy_id" })
            .select()
            .single();

        if (upsertErr) {
            console.error("[activate-pharmacy-plan] Subscription Upsert Failed:", upsertErr);
            return json({ error: upsertErr.message }, 500);
        }

        // --- NEW: Ensure Billing Cycle exists ---
        try {
            const today = new Date();
            const periodStart = today.toISOString().split('T')[0];
            const periodEnd = new Date(today);
            periodEnd.setDate(periodEnd.getDate() + 30);
            const periodEndStr = periodEnd.toISOString().split('T')[0];

            await supabaseAdmin
                .from('billing_cycles')
                .upsert({
                    pharmacy_id,
                    period_start: periodStart,
                    period_end: periodEndStr,
                    status: 'active',
                    free_orders_used: 0,
                    overage_orders: 0,
                    overage_amount_cents: 0,
                }, { onConflict: 'pharmacy_id,period_start' });
        } catch (err) {
            console.error("[activate-pharmacy-plan] Billing Cycle Insurance failed (non-blocking):", err);
        }
        // ----------------------------------------

        return json({
            success: !asaasError,
            subscription: sub,
            asaas_error: asaasError,
            pix: pixPaymentId && pixQrBase64 ? {
                qr_base64: pixQrBase64,
                copy_paste: pixCopyPaste,
                payment_id: pixPaymentId,
                invoice_url: pixInvoiceUrl,
            } : null,
        }, asaasError ? 400 : 200);

    } catch (e: any) {
        console.error("[activate-pharmacy-plan] Fatal Error:", e);
        return json({ error: e?.message || "Internal Server Error" }, 500);
    }
});
