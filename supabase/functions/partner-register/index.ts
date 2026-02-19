import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PartnerRegisterBody = {
    plan_id: string;
    pharmacy: {
        trade_name: string;
        cnpj: string;
        legal_name: string;
        establishment_phone: string;

        owner_name: string;
        owner_last_name: string;
        owner_email: string;
        owner_phone: string;
        owner_cpf: string;
        owner_rg: string;
        owner_rg_issuer: string;

        cep: string;
        address: string; // logradouro
        address_number: string;
        neighborhood: string;
        city: string;
        state: string;

        address_complement?: string;
        specialty?: string;
        delivery_enabled?: boolean;
    };
};

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function badRequest(msg: string) {
    return json(400, { success: false, error: msg });
}

function ok(payload: unknown) {
    return json(200, payload);
}

function normalizeDigits(v: string) {
    return (v || "").replace(/\D/g, "");
}

// evita bug de "dia errado" por UTC
function formatDateLocalYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return badRequest("Método inválido.");

    let body: PartnerRegisterBody;
    try {
        body = await req.json();
    } catch {
        return badRequest("JSON inválido.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
        return json(500, { success: false, error: "Server misconfigured (missing env vars)" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const planId = body?.plan_id;
    const p = body?.pharmacy;

    if (!planId) return badRequest("plan_id é obrigatório.");
    if (!p) return badRequest("pharmacy é obrigatório.");

    // validações
    const cnpjDigits = normalizeDigits(p.cnpj);
    if (cnpjDigits.length !== 14) return badRequest("CNPJ inválido.");

    const cepDigits = normalizeDigits(p.cep);
    if (cepDigits.length !== 8) return badRequest("CEP inválido.");

    const requiredFields: Array<[string, string]> = [
        ["trade_name", p.trade_name],
        ["cnpj", p.cnpj],
        ["legal_name", p.legal_name],
        ["establishment_phone", p.establishment_phone],
        ["owner_name", p.owner_name],
        ["owner_last_name", p.owner_last_name],
        ["owner_email", p.owner_email],
        ["owner_phone", p.owner_phone],
        ["owner_cpf", p.owner_cpf],
        ["owner_rg", p.owner_rg],
        ["owner_rg_issuer", p.owner_rg_issuer],
        ["address", p.address],
        ["address_number", p.address_number],
        ["neighborhood", p.neighborhood],
        ["city", p.city],
        ["state", p.state],
    ];

    for (const [k, v] of requiredFields) {
        if (!v || String(v).trim().length === 0) return badRequest(`Campo obrigatório ausente: ${k}`);
    }

    // 1) valida plano ativo
    const { data: plan, error: planErr } = await supabase
        .from("billing_plans")
        .select("id, name, slug, is_active")
        .eq("id", planId)
        .eq("is_active", true)
        .single();

    if (planErr || !plan) return badRequest("Plano inválido ou inativo.");

    // 2) cria farmácia (compatível com seu schema)
    const fullAddress = `${p.address}, ${p.address_number} - ${p.neighborhood}, ${p.city} - ${p.state}`;

    const pharmacyPayload: any = {
        name: p.trade_name,
        address: fullAddress,
        status: "pending", // ✅ recomendo padronizar. Se seu app usa "Pendente", troque aqui.

        owner_name: p.owner_name,
        owner_last_name: p.owner_last_name,
        owner_email: p.owner_email,
        owner_phone: p.owner_phone,
        owner_cpf: p.owner_cpf,
        owner_rg: p.owner_rg,
        owner_rg_issuer: p.owner_rg_issuer,

        cnpj: cnpjDigits, // ✅ salva normalizado para evitar duplicidade com máscara
        legal_name: p.legal_name,
        trade_name: p.trade_name,
        establishment_phone: p.establishment_phone,
        specialty: p.specialty ?? "Farmácia",
        delivery_enabled: !!p.delivery_enabled,

        // ✅ nomes corretos do seu schema
        zip_code: cepDigits,
        street: p.address,
        number: p.address_number,
        complement: p.address_complement ?? null,

        neighborhood: p.neighborhood,
        city: p.city,
        state: p.state,
    };

    const { data: pharmacy, error: phErr } = await supabase
        .from("pharmacies")
        .insert([pharmacyPayload])
        .select()
        .single();

    if (phErr || !pharmacy) {
        const msg =
            phErr?.message?.includes("pharmacies_cnpj_key") || phErr?.message?.includes("cnpj")
                ? "Este CNPJ já está cadastrado."
                : (phErr?.message ?? "Erro ao criar farmácia.");
        return badRequest(msg);
    }

    const pharmacyId = pharmacy.id as string;

    // 3) cria/atualiza assinatura (idempotente - pharmacy_id é UNIQUE)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextBillingDateStr = formatDateLocalYYYYMMDD(nextMonth);

    const { data: subscription, error: subErr } = await supabase
        .from("pharmacy_subscriptions")
        .upsert(
            [{
                pharmacy_id: pharmacyId,
                plan_id: planId,
                status: "active",
                started_at: now.toISOString(),
                next_billing_date: nextBillingDateStr,
                asaas_subscription_id: null,
            }],
            { onConflict: "pharmacy_id" }
        )
        .select()
        .single();

    if (subErr || !subscription) {
        return json(500, {
            success: false,
            error: "Farmácia criada, mas falhou criar assinatura.",
            pharmacy_id: pharmacyId,
            details: subErr?.message ?? null,
        });
    }

    // 4) cria ciclo de billing do mês atual (status do schema é 'open')
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const periodStartStr = formatDateLocalYYYYMMDD(periodStart);
    const periodEndStr = formatDateLocalYYYYMMDD(periodEnd);

    const { data: existingCycle, error: cycleFetchErr } = await supabase
        .from("billing_cycles")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .eq("period_start", periodStartStr)
        .maybeSingle();

    if (cycleFetchErr) {
        // não quebra cadastro se falhar fetch do ciclo
        return ok({
            success: true,
            pharmacy,
            subscription,
            warning: "Falha ao verificar ciclo de billing.",
            message: "Cadastro criado com plano ativo.",
        });
    }

    let cycle = existingCycle;

    if (!existingCycle) {
        const { data: newCycle, error: cycleErr } = await supabase
            .from("billing_cycles")
            .insert([{
                pharmacy_id: pharmacyId,
                period_start: periodStartStr,
                period_end: periodEndStr,
                orders_count: 0,
                free_orders_used: 0,
                overage_orders: 0,
                overage_fee_cents: 0,
                overage_amount_cents: 0,
                status: "active",
            }])
            .select()
            .single();

        if (cycleErr) {
            return ok({
                success: true,
                pharmacy,
                subscription,
                warning: "Ciclo não pôde ser criado automaticamente.",
                message: "Cadastro criado com plano ativo.",
            });
        }

        cycle = newCycle;
    }

    return ok({
        success: true,
        pharmacy,
        subscription,
        cycle,
        message: "Cadastro criado com plano ativo.",
    });
});
