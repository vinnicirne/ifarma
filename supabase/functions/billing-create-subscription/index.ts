// ============================================================================
// EDGE FUNCTION: billing-create-subscription
// Cria assinatura de plano para farmácia (customer no Asaas + subscription)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3'; // Trocar para produção

interface RequestBody {
    pharmacy_id: string;
    plan_id: string;
}

Deno.serve(async (req) => {
    try {
        // 1. Parse request
        const { pharmacy_id, plan_id }: RequestBody = await req.json();

        if (!pharmacy_id || !plan_id) {
            return new Response(
                JSON.stringify({ error: 'pharmacy_id and plan_id are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`🔄 Criando assinatura: farmácia ${pharmacy_id}, plano ${plan_id}`);

        // 2. Criar cliente Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Buscar farmácia
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

        // 4. Buscar plano
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

        console.log(`📋 Farmácia: ${pharmacy.name}, Plano: ${plan.name}`);

        // 5. Verificar se já existe assinatura ativa
        const { data: existingSub } = await supabase
            .from('pharmacy_subscriptions')
            .select('*')
            .eq('pharmacy_id', pharmacy_id)
            .eq('status', 'active')
            .single();

        if (existingSub) {
            return new Response(
                JSON.stringify({ error: 'Pharmacy already has an active subscription' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 6. Criar customer no Asaas (se não existir)
        let asaasCustomerId = '';

        try {
            const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY,
                },
                body: JSON.stringify({
                    name: pharmacy.name,
                    email: pharmacy.email || pharmacy.owner_email,
                    phone: pharmacy.phone || pharmacy.owner_phone,
                    cpfCnpj: pharmacy.cnpj,
                    postalCode: pharmacy.zip_code,
                    address: pharmacy.street,
                    addressNumber: pharmacy.number,
                    complement: pharmacy.complement,
                    province: pharmacy.neighborhood,
                    externalReference: pharmacy_id,
                }),
            });

            if (!customerResponse.ok) {
                const error = await customerResponse.text();
                throw new Error(`Asaas customer creation failed: ${error}`);
            }

            const customer = await customerResponse.json();
            asaasCustomerId = customer.id;
            console.log(`✅ Customer criado no Asaas: ${asaasCustomerId}`);

        } catch (err: any) {
            console.error('❌ Erro ao criar customer no Asaas:', err);
            return new Response(
                JSON.stringify({ error: 'Failed to create Asaas customer', details: err.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 7. Criar subscription no Asaas (se plano tem mensalidade)
        let asaasSubscriptionId = '';

        if (plan.monthly_fee_cents > 0) {
            try {
                const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': ASAAS_API_KEY,
                    },
                    body: JSON.stringify({
                        customer: asaasCustomerId,
                        billingType: 'BOLETO',
                        value: plan.monthly_fee_cents / 100,
                        cycle: 'MONTHLY',
                        description: `Plano ${plan.name} - ${pharmacy.name}`,
                        nextDueDate: getNextBillingDate(),
                    }),
                });

                if (!subscriptionResponse.ok) {
                    const error = await subscriptionResponse.text();
                    throw new Error(`Asaas subscription creation failed: ${error}`);
                }

                const subscription = await subscriptionResponse.json();
                asaasSubscriptionId = subscription.id;
                console.log(`✅ Subscription criada no Asaas: ${asaasSubscriptionId}`);

            } catch (err: any) {
                console.error('❌ Erro ao criar subscription no Asaas:', err);
                // Continuar mesmo se falhar (plano pode ser free)
            }
        }

        // 8. Criar subscription no banco
        const { data: newSub, error: subError } = await supabase
            .from('pharmacy_subscriptions')
            .insert({
                pharmacy_id,
                plan_id,
                asaas_customer_id: asaasCustomerId,
                asaas_subscription_id: asaasSubscriptionId || null,
                status: 'active',
                started_at: new Date().toISOString(),
                next_billing_date: getNextBillingDate(),
            })
            .select()
            .single();

        if (subError) throw subError;

        console.log(`✅ Subscription criada no banco: ${newSub.id}`);

        // 9. Criar primeiro ciclo de cobrança
        const today = new Date();
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const { data: cycle, error: cycleError } = await supabase
            .from('billing_cycles')
            .insert({
                pharmacy_id,
                period_start: periodStart.toISOString().split('T')[0],
                period_end: periodEnd.toISOString().split('T')[0],
                status: 'active',
                free_orders_used: 0,
                overage_orders: 0,
                overage_amount_cents: 0,
            })
            .select()
            .single();

        if (cycleError) throw cycleError;

        console.log(`✅ Ciclo criado: ${cycle.id}`);

        return new Response(
            JSON.stringify({
                message: 'Subscription created successfully',
                subscription: newSub,
                cycle: cycle,
                asaas_customer_id: asaasCustomerId,
                asaas_subscription_id: asaasSubscriptionId || null,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Erro ao criar subscription:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});

// ============================================================================
// HELPER: Calcular próxima data de cobrança (primeiro dia do próximo mês)
// ============================================================================

function getNextBillingDate(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
}
