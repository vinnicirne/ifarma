// ============================================================================
// EDGE FUNCTION: billing-create-subscription
// Cria assinatura de plano para farmácia (customer no Asaas + subscription)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { asaasFetch } from "../_shared/asaas.ts";

interface RequestBody {
    pharmacy_id: string;
    plan_id: string;
}

Deno.serve(async (req) => {
    try {
        const { pharmacy_id, plan_id }: RequestBody = await req.json();

        if (!pharmacy_id || !plan_id) {
            return new Response(
                JSON.stringify({ error: 'pharmacy_id and plan_id are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Buscar farmácia
        const { data: pharmacy, error: pharmacyError } = await supabase
            .from('pharmacies')
            .select('*')
            .eq('id', pharmacy_id)
            .single();

        if (pharmacyError || !pharmacy) {
            return new Response(
                JSON.stringify({ error: 'Pharmacy not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 2. Buscar plano
        const { data: plan, error: planError } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('id', plan_id)
            .single();

        if (planError || !plan) {
            return new Response(
                JSON.stringify({ error: 'Plan not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. Verificar se já existe assinatura ativa
        const { data: existingSub } = await supabase
            .from('pharmacy_subscriptions')
            .select('*')
            .eq('pharmacy_id', pharmacy_id)
            .in('status', ['active', 'pending_asaas', 'trialing'])
            .maybeSingle();

        if (existingSub) {
            return new Response(
                JSON.stringify({ error: 'Pharmacy already has an active or pending subscription' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 4. Ensure Asaas customer (Idempotency & Sync)
        let asaasCustomerId: string | null = pharmacy.asaas_customer_id ?? null;

        if (!pharmacy.cnpj) {
            return new Response(
                JSON.stringify({ error: 'CNPJ da farmácia é obrigatório para ativar planos no Asaas.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const customerPayload = {
            name: pharmacy.name,
            email: pharmacy.email || pharmacy.owner_email || "email@ifarma.com",
            cpfCnpj: pharmacy.cnpj,
            mobilePhone: pharmacy.owner_phone || pharmacy.establishment_phone,
            externalReference: pharmacy_id
        };

        if (!asaasCustomerId) {
            const customerRes = await asaasFetch("/customers", {
                method: "POST",
                body: JSON.stringify(customerPayload),
            });

            if (customerRes.ok) {
                asaasCustomerId = customerRes.data.id;
            } else {
                return new Response(
                    JSON.stringify({ error: 'Failed to create Asaas customer', details: customerRes.rawText }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }
        } else {
            // Update existing customer to ensure CNPJ/details are synced
            const updateRes = await asaasFetch(`/customers/${asaasCustomerId}`, {
                method: "POST",
                body: JSON.stringify(customerPayload),
            });

            if (!updateRes.ok) {
                console.warn("[billing-create-subscription] Sync Asaas customer failed (non-blocking):", updateRes.rawText);
            }
        }

        if (asaasCustomerId) {
            await supabase.from("pharmacies").update({
                asaas_customer_id: asaasCustomerId,
                asaas_status: "ok",
                asaas_updated_at: new Date().toISOString(),
            }).eq("id", pharmacy_id);
        }

        // 5. Criar subscription no Asaas
        let asaasSubscriptionId = '';
        let asaasError = '';
        const isPaid = (plan.monthly_fee_cents ?? 0) > 0;
        const nextDue = getNextBillingDate();

        if (isPaid && asaasCustomerId) {
            const subRes = await asaasFetch("/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    customer: asaasCustomerId,
                    billingType: 'BOLETO',
                    value: plan.monthly_fee_cents / 100,
                    cycle: 'MONTHLY',
                    description: `Plano ${plan.name} - ${pharmacy.name}`,
                    nextDueDate: nextDue,
                }),
            });

            if (subRes.ok) {
                asaasSubscriptionId = subRes.data.id;
            } else {
                asaasError = subRes.rawText;
            }
        }

        // 6. Criar subscription no banco
        const status = isPaid ? (asaasSubscriptionId ? 'active' : 'pending_asaas') : 'active';

        const { data: newSub, error: subError } = await supabase
            .from('pharmacy_subscriptions')
            .insert({
                pharmacy_id,
                plan_id,
                asaas_customer_id: asaasCustomerId,
                asaas_subscription_id: asaasSubscriptionId || null,
                status: asaasError && !asaasSubscriptionId ? 'failed_asaas' : status,
                asaas_last_error: asaasError || null,
                started_at: new Date().toISOString(),
                next_billing_date: nextDue,
                asaas_updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (subError) throw subError;

        // 7. Criar primeiro ciclo de cobrança
        const today = new Date();
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: cycle, error: cycleError } = await supabase
            .from('billing_cycles')
            .upsert({
                pharmacy_id,
                period_start: periodStart,
                period_end: periodEnd,
                status: 'active',
                free_orders_used: 0,
                overage_orders: 0,
                overage_amount_cents: 0,
            }, { onConflict: 'pharmacy_id,period_start' })
            .select()
            .single();

        if (cycleError) throw cycleError;

        return new Response(
            JSON.stringify({
                message: asaasError ? 'Subscription created with errors' : 'Subscription created successfully',
                subscription: newSub,
                cycle: cycle,
                asaas_error: asaasError || null
            }),
            { status: asaasError && !asaasSubscriptionId ? 400 : 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ FATAL ERROR:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});

function getNextBillingDate(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
}
