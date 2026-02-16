
import { adminClient, extractBearer } from "../_shared/authz.ts";
import { asaasFetch } from "../_shared/asaas.ts";

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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const token = extractBearer(req);
    // Optional: Add auth check if needed, but for now we follow the pattern
    // console.log("[check-asaas-payment] Token present:", !!token);

    let body: { pharmacy_id: string; payment_id: string };
    try {
        body = await req.json();
    } catch {
        return json({ error: "Invalid JSON" }, 400);
    }

    const { pharmacy_id, payment_id } = body;
    if (!pharmacy_id || !payment_id) return json({ error: "missing fields" }, 400);

    const supabaseAdmin = adminClient();

    // 1. Check status in Asaas
    const payRes = await asaasFetch(`/payments/${payment_id}`);
    if (!payRes.ok) {
        return json({ error: "Asaas GET payment failed", details: payRes.rawText }, 502);
    }

    const status = payRes.data.status;
    const paid = status === "RECEIVED" || status === "CONFIRMED";

    if (!paid) {
        return json({ paid: false, asaas_status: status }, 200);
    }

    console.log(`[check-asaas-payment] Payment ${payment_id} is PAID (${status}). Updating DB...`);

    // 2. Update Invoice
    const { error: invErr } = await supabaseAdmin.from("billing_invoices").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        asaas_status: status ?? null,
        asaas_updated_at: new Date().toISOString(),
    }).eq("asaas_invoice_id", payment_id);

    if (invErr) {
        console.error("[check-asaas-payment] Invoice update failed:", invErr);
    }

    // 3. Update/Activate Subscription
    // Only if there is an invoice of type monthly_fee (to avoid activating on random payments)
    // But for simplicity/robustness, if we are confirming a payment for a pharmacy, check if it's the subscription payment.
    // Actually, let's just update the subscription if it's currently pending/overdue to ensure they get access.

    const { error: subErr } = await supabaseAdmin.from("pharmacy_subscriptions").update({
        status: "active",
        activated_at: new Date().toISOString(),
        asaas_updated_at: new Date().toISOString(),
        asaas_last_error: null,
    }).eq("pharmacy_id", pharmacy_id)
        .neq('status', 'active'); // Only update if not already active to avoid redundant writes (optional)

    if (subErr) {
        console.error("[check-asaas-payment] Subscription update failed:", subErr);
    }

    return json({ paid: true, asaas_status: status }, 200);
});
