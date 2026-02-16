import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractBearer, authorizeBillingAccess, adminClient } from "../_shared/authz.ts";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") || "";
const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://sandbox.asaas.com/api/v3";

type ActivatePlanRequest = { pharmacy_id: string; plan_id?: string };

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        // --- ENV VAR CHECK ---
        const asaasKey = Deno.env.get("ASAAS_API_KEY");
        const sbUrl = Deno.env.get("SUPABASE_URL");
        const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!asaasKey) {
            console.error("CRITICAL: ASAAS_API_KEY is missing");
            return json({ error: "Configuration Error: ASAAS_API_KEY missing" }, 500);
        }
        if (!sbUrl || !sbKey) {
            console.error("CRITICAL: Supabase credentials missing");
            return json({ error: "Configuration Error: SUPABASE_URL or SERVICE_ROLE_KEY missing" }, 500);
        }

        const token = extractBearer(req);
        if (!token) {
            return json({ error: "Unauthorized - Token missing" }, 401);
        }

        let body: ActivatePlanRequest;
        try {
            body = await req.json();
        } catch {
            return json({ error: "Invalid JSON body" }, 400);
        }

        const { pharmacy_id, plan_id } = body;

        console.log(`[activate-pharmacy-plan] Request for pharmacy=${pharmacy_id}`);

        if (!pharmacy_id || !isUuid(pharmacy_id)) {
            return json({ error: "pharmacy_id inválido" }, 400);
        }
        if (plan_id && !isUuid(plan_id)) {
            return json({ error: "plan_id inválido" }, 400);
        }

        // ✅ Authorization: admin OR owner OR staff(billing/manager)
        const authz = await authorizeBillingAccess({ token, pharmacyId: pharmacy_id });
        if (!authz.allowed) {
            console.warn(`[activate-pharmacy-plan] Access denied for user ${authz.userId}: ${authz.reason}`);
            return json({ error: "Forbidden", reason: authz.reason }, 403);
        }

        const supabaseAdmin = adminClient();

        console.log(`[activate-pharmacy-plan] user=${authz.userId} admin=${authz.isAdmin} pharmacy=${pharmacy_id} plan=${plan_id ?? "auto"}`);

        // 1) Fetch pharmacy
        const { data: pharmacy, error: pErr } = await supabaseAdmin
            .from("pharmacies")
            .select("*")
            .eq("id", pharmacy_id)
            .single();

        if (pErr || !pharmacy) {
            console.error("[activate-pharmacy-plan] Pharmacy not found or error:", pErr);
            return json({ error: "Farmácia não encontrada" }, 404);
        }

        // 2) Find active subscription (avoid single)
        const { data: activeSubs, error: aErr } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .select("id, plan_id, status, asaas_subscription_id, started_at, created_at")
            .eq("pharmacy_id", pharmacy_id)
            .in("status", ["active", "pending_asaas", "trialing"])
            .order("started_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });

        if (aErr) throw aErr;

        const existing = activeSubs?.[0] ?? null;

        // 3) Determine target plan
        let targetPlanId = plan_id ?? existing?.plan_id ?? null;

        if (!targetPlanId) {
            // Try slug=free, else monthly_fee_cents=0
            const { data: freeBySlug } = await supabaseAdmin
                .from("billing_plans")
                .select("id")
                .eq("slug", "free")
                .maybeSingle();

            if (freeBySlug?.id) targetPlanId = freeBySlug.id;
        }

        if (!targetPlanId) {
            const { data: freeByZero } = await supabaseAdmin
                .from("billing_plans")
                .select("id")
                .eq("monthly_fee_cents", 0)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (freeByZero?.id) targetPlanId = freeByZero.id;
        }

        if (!targetPlanId) return json({ error: "Nenhum plano FREE encontrado no sistema" }, 400);

        // 4) Fetch plan
        const { data: plan, error: planErr } = await supabaseAdmin
            .from("billing_plans")
            .select("*")
            .eq("id", targetPlanId)
            .single();

        if (planErr || !plan) return json({ error: "Plano alvo não encontrado" }, 404);

        // 5) Ensure Asaas customer
        let asaasCustomerId: string | null = pharmacy.asaas_customer_id ?? null;

        if (!asaasCustomerId) {
            try {
                console.log("[activate-pharmacy-plan] Creating Asaas customer...");
                asaasCustomerId = await createAsaasCustomer(pharmacy);
                await supabaseAdmin
                    .from("pharmacies")
                    .update({
                        asaas_customer_id: asaasCustomerId,
                        asaas_status: "ok",
                        asaas_last_error: null,
                        asaas_updated_at: new Date().toISOString(),
                    })
                    .eq("id", pharmacy_id);
            } catch (err: any) {
                console.error("[activate-pharmacy-plan] Asaas creation failed:", err);
                await supabaseAdmin
                    .from("pharmacies")
                    .update({
                        asaas_status: "pending",
                        asaas_last_error: err?.message ?? String(err),
                        asaas_updated_at: new Date().toISOString(),
                    })
                    .eq("id", pharmacy_id);
                // não bloqueia FREE; para pago, vai cair em pending_asaas
            }
        }

        // 6) Cancel prior active/pending
        if (activeSubs && activeSubs.length > 0) {
            const { error: cancelErr } = await supabaseAdmin
                .from("pharmacy_subscriptions")
                .update({
                    status: "canceled",
                    canceled_at: new Date().toISOString(),
                    ended_at: new Date().toISOString(),
                })
                .eq("pharmacy_id", pharmacy_id)
                .in("status", ["active", "pending_asaas", "trialing"]);

            if (cancelErr) throw cancelErr;
        }

        // 7) Create Asaas subscription if paid
        const isPaid = (plan.monthly_fee_cents ?? 0) > 0;
        let asaasSubscriptionId: string | null = null;

        if (isPaid && asaasCustomerId) {
            try {
                const today = new Date();
                const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const nextBillingDateStr = nextBillingDate.toISOString().split("T")[0];

                console.log("[activate-pharmacy-plan] Creating Asaas subscription...");
                const asaasSub = await createAsaasSubscription({
                    customer: asaasCustomerId,
                    value: (plan.monthly_fee_cents ?? 0) / 100,
                    nextDueDate: nextBillingDateStr,
                    description: `Plano ${plan.name} - ${pharmacy.name}`,
                });

                asaasSubscriptionId = asaasSub.id ?? null;
            } catch (err) {
                console.error("[activate-pharmacy-plan] Asaas subscription error:", err);
            }
        }

        const status = (isPaid && !asaasSubscriptionId) ? "pending_asaas" : "active";
        const today = new Date();
        const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split("T")[0];

        const subPayload = {
            pharmacy_id,
            plan_id: targetPlanId,
            asaas_customer_id: asaasCustomerId,
            status,
            started_at: new Date().toISOString(),
            next_billing_date: (isPaid ? nextDue : null),
            asaas_subscription_id: asaasSubscriptionId,
            asaas_last_error: (isPaid && !asaasSubscriptionId) ? "Assinatura Asaas não criada" : null,
            asaas_updated_at: new Date().toISOString(),
        };

        const { data: sub, error: insErr } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .upsert(subPayload, { onConflict: 'pharmacy_id' })
            .select()
            .single();

        if (insErr) throw insErr;

        // 8) Ensure billing cycle current month
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const periodStartStr = periodStart.toISOString().split("T")[0];

        const { data: cycle } = await supabaseAdmin
            .from("billing_cycles")
            .select("id")
            .eq("pharmacy_id", pharmacy_id)
            .eq("period_start", periodStartStr)
            .maybeSingle();

        if (!cycle) {
            await supabaseAdmin.from("billing_cycles").insert({
                pharmacy_id,
                period_start: periodStartStr,
                period_end: periodEnd.toISOString().split("T")[0],
                free_orders_used: 0,
                overage_orders: 0,
                overage_amount_cents: 0,
                status: "active",
            });
        }

        return json({ success: true, subscription: sub }, 200);
    } catch (e: any) {
        console.error("[activate-pharmacy-plan] Fatal:", e);
        return json({ error: e?.message ?? "Internal Server Error", stack: e?.stack }, 500);
    }
});

function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// --- Asaas helpers (iguais aos seus, mantidos) ---
async function createAsaasCustomer(pharmacy: any): Promise<string> {
    const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": ASAAS_API_KEY },
        body: JSON.stringify({
            name: pharmacy.name,
            email: pharmacy.owner_email || pharmacy.merchant_email || "email@naoinformado.com",
            cpfCnpj: pharmacy.cnpj,
            mobilePhone: pharmacy.owner_phone || pharmacy.establishment_phone,
        }),
    });

    if (!response.ok) {
        const t = await response.text();
        throw new Error(`Erro Asaas Customer: ${t}`);
    }

    const data = await response.json();
    return data.id;
}

async function createAsaasSubscription(subscription: {
    customer: string; value: number; nextDueDate: string; description: string;
}): Promise<any> {
    const response = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": ASAAS_API_KEY },
        body: JSON.stringify({
            customer: subscription.customer,
            billingType: "BOLETO",
            value: subscription.value,
            nextDueDate: subscription.nextDueDate,
            cycle: "MONTHLY",
            description: subscription.description,
        }),
    });

    if (!response.ok) {
        const t = await response.text();
        throw new Error(`Erro Asaas Subscription: ${t}`);
    }

    return await response.json();
}
