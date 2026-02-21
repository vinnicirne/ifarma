
/**
 * EDGE FUNCTION: Asaas Webhook Handler
 * 
 * Endpoint: /functions/v1/asaas-webhook
 * Função: Recebe notificações do Asaas e atualiza status de faturas e assinaturas
 */

import { adminClient } from "../_shared/authz.ts";

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization, asaas-access-token",
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

    const webhookToken =
        req.headers.get('asaas-access-token') ||
        req.headers.get('access_token') ||
        '';

    if (ASAAS_WEBHOOK_TOKEN && webhookToken !== ASAAS_WEBHOOK_TOKEN) {
        console.error(`[asaas-webhook] Token inválido. Recebido: ${webhookToken ? '***' : '(vazio)'} / Esperado: ${ASAAS_WEBHOOK_TOKEN ? '***' : '(vazio)'}`);
        return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseAdmin = adminClient();

    let payload: any;
    try {
        payload = await req.json();
    } catch {
        return json({ error: "Invalid JSON" }, 400);
    }

    console.log('[asaas-webhook] Evento recebido:', payload.event, 'ID:', payload.payment?.id || payload.subscription?.id);

    // Asaas geralmente manda { event, payment }
    const event = payload?.event;
    const payment = payload?.payment;

    const paymentId = payment?.id;
    const paymentStatus = payment?.status;

    if (!paymentId) {
        // retorna 200 pra não ficar em loop de retry no Asaas
        return json({ ok: true, ignored: "missing payment.id" }, 200);
    }

    // Ajuste fino aqui se precisar, mas isso cobre bem:
    const paid =
        event === "PAYMENT_RECEIVED" ||
        event === "PAYMENT_CONFIRMED" ||
        paymentStatus === "RECEIVED" ||
        paymentStatus === "CONFIRMED";

    if (!paid) {

        // Handle Overdue/Start cancellations if needed, but for now just ignore or log
        if (event === 'PAYMENT_OVERDUE') {
            await supabaseAdmin
                .from('billing_invoices')
                .update({ status: 'overdue' })
                .eq('asaas_invoice_id', paymentId);
        }

        return json({ ok: true, ignored: "not a paid event", event, paymentStatus }, 200);
    }

    // ------------------------------------------------------------------------
    // ROBUST PAYMENT CONFIRMATION LOGIC
    // ------------------------------------------------------------------------
    console.log(`[asaas-webhook] Pagamento confirmado! Event: ${event}, Status: ${paymentStatus}, Payment ID: ${paymentId}`);

    // 1. Tentar achar a invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
        .from("billing_invoices")
        .select("id, pharmacy_id, invoice_type, status")
        .eq("asaas_invoice_id", paymentId)
        .maybeSingle();

    if (invErr) {
        console.error("[asaas-webhook] Erro ao buscar invoice:", invErr);
        return json({ ok: true, warning: "erro ao buscar invoice" }, 200);
    }

    if (!invoice) {
        console.warn(`[asaas-webhook] Invoice não encontrada pelo ID: ${paymentId}. Tentando self-healing via externalReference...`);

        // --------------------------------------------------------------------
        // SELF-HEALING: Tenta recuperar via externalReference (pharmacy_id:due_date:type)
        // --------------------------------------------------------------------
        const extRef = payment.externalReference || '';
        const parts = extRef.split(':'); // Esperado: [pharmacy_id, due_date, type]

        if (parts.length >= 3 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[0])) {
            const pharmacy_id = parts[0];
            const due_date = parts[1];
            // const type = parts[2]; // usually 'monthly_fee'

            console.log(`[asaas-webhook] Self-healing iniciado para pharmacy: ${pharmacy_id}, due: ${due_date}`);

            // Tenta criar/upsert a invoice para garantir que exista
            const { data: newInv, error: upsertErr } = await supabaseAdmin
                .from("billing_invoices")
                .upsert({
                    pharmacy_id,
                    invoice_type: "monthly_fee",
                    asaas_invoice_id: paymentId,
                    amount_cents: Math.round((payment.value || 99) * 100), // fallback seguro
                    due_date: due_date || new Date().toISOString().slice(0, 10),
                    status: "paid", // Já nasce paga
                    paid_at: payment.paymentDate || new Date().toISOString(),
                    asaas_status: paymentStatus,
                    asaas_invoice_url: payment.invoiceUrl,
                    asaas_updated_at: new Date().toISOString(),
                }, { onConflict: 'asaas_invoice_id' })
                .select()
                .single();

            if (!upsertErr && newInv) {
                console.log(`[asaas-webhook] Self-healing sucesso! Invoice criada/recuperada: ${newInv.id}`);
                // Atribui à variável 'invoice' para o fluxo seguir normalmente
                // (Precisamos garantir que a variável 'invoice' seja let lá em cima ou redefinida aqui se o compilador permitir, 
                // mas como é const no escopo anterior, vamos ter que ajustar a declaração original ou usar outra variável 
                // e fazer o fluxo convergir. O mais limpo é reler ou usar 'newInv' como proxy, mas vamos ajustar o código todo 
                // para usar 'finalInvoice'.)

                // HACK: Re-declarando invoice como 'any' ou ajustando o fluxo. 
                // Melhor: vamos retornar aqui e chamar a função de ativação de subscription diretamente
                // para não ter que refatorar todo o bloco 'const invoice' acima que é const.

                // ATENÇÃO: O código abaixo duplica a lógica de ativação propositalmente para este bloco de fallback,
                // ou poderíamos ter mudado 'const invoice' para 'let invoice' no início. 
                // Dado o replace, vou assumir o fluxo de "copiar lógica de ativação" para ser seguro e autocontido.

                // 3. Ativa subscription (Lógica duplicada do Self-Healing para garantir)
                const { data: sub, error: subFindErr } = await supabaseAdmin
                    .from("pharmacy_subscriptions")
                    .select("id, status")
                    .eq("pharmacy_id", pharmacy_id)
                    .maybeSingle();

                if (sub && sub.status !== 'active') {
                    await supabaseAdmin.from("pharmacy_subscriptions").update({
                        status: 'active',
                        activated_at: new Date().toISOString(),
                        asaas_last_error: null,
                        asaas_updated_at: new Date().toISOString(),
                    }).eq("id", sub.id);
                    console.log(`[asaas-webhook] Subscription ativada via self-healing para ${pharmacy_id}`);
                }

                return json({ ok: true, healed: true }, 200);

            } else {
                console.error("[asaas-webhook] Falha no self-healing upsert:", upsertErr);
            }
        } else {
            console.warn(`[asaas-webhook] externalReference inválido para self-healing: ${extRef}`);
        }

        return json({ ok: true, warning: "invoice não encontrada e self-healing falhou" }, 200);
    }

    // 2. Atualiza invoice
    const { error: updateInvErr } = await supabaseAdmin
        .from("billing_invoices")
        .update({
            status: "paid",
            paid_at: payment.paymentDate || payment.confirmedDate || new Date().toISOString(),
            asaas_status: paymentStatus,
            asaas_updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

    if (updateInvErr) {
        console.error("[asaas-webhook] Falha ao atualizar invoice:", updateInvErr);
        // Não retorna aqui, tenta atualizar a subscription mesmo assim se possível, mas idealmente invoice deve estar ok
    } else {
        console.log(`[asaas-webhook] Invoice ${invoice.id} marcada como paid para pharmacy ${invoice.pharmacy_id}`);
    }

    // 3. Ativa subscription SOMENTE se for invoice do tipo "monthly_fee"
    if (invoice.invoice_type === "monthly_fee") {

        // 3.1 Busca a subscription atual
        const { data: sub, error: subFindErr } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .select("id, status, asaas_subscription_id")
            .eq("pharmacy_id", invoice.pharmacy_id)
            .maybeSingle();

        if (subFindErr) {
            console.error("[asaas-webhook] Erro ao buscar subscription:", subFindErr);
            return json({ ok: true, warning: "erro ao buscar subscription" }, 200);
        }

        if (!sub) {
            console.error("[asaas-webhook] Subscription não encontrada para pharmacy:", invoice.pharmacy_id);
            return json({ ok: true, warning: "subscription não encontrada" }, 200);
        }

        // 3.2 Checa se já está ativa
        if (sub.status === "active") {
            console.log("[asaas-webhook] Subscription já active, ignorando ativação.");
            return json({ ok: true }, 200);
        }

        console.log(`[asaas-webhook] Ativando subscription ${sub.id} (status atual: ${sub.status})...`);

        // 3.3 Atualiza para active
        const { error: subErr } = await supabaseAdmin
            .from("pharmacy_subscriptions")
            .update({
                status: "active",
                activated_at: new Date().toISOString(),
                asaas_last_error: null,
                asaas_updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

        if (subErr) {
            console.error("[asaas-webhook] Falha ao ativar subscription:", subErr);
            return json({ ok: true, warning: "falha ao ativar subscription" }, 200);
        } else {
            console.log(`[asaas-webhook] Subscription ${sub.id} ativada com sucesso!`);

            // --- NEW: Create Rolling Billing Cycle starting on Payment Date ---
            try {
                // CORREÇÃO: Usar data real do pagamento ou data de confirmação
                const paymentDateStr = payment.paymentDate || payment.confirmedDate || new Date().toISOString().slice(0, 10);
                const paymentDate = new Date(paymentDateStr);

                // End date is 30 days after payment
                const endDate = new Date(paymentDate);
                endDate.setDate(endDate.getDate() + 30);
                const endDateStr = endDate.toISOString().slice(0, 10);

                console.log(`[asaas-webhook] Criando ciclo rolante: ${paymentDateStr} até ${endDateStr}`);

                // Primeiro verifica se já existe ciclo para este período
                const { data: existingCycle } = await supabaseAdmin
                    .from('billing_cycles')
                    .select('id, status')
                    .eq('pharmacy_id', invoice.pharmacy_id)
                    .eq('period_start', paymentDateStr)
                    .maybeSingle();

                if (existingCycle) {
                    // Se existe, apenas ativa
                    await supabaseAdmin
                        .from('billing_cycles')
                        .update({ status: 'active' })
                        .eq('id', existingCycle.id);
                    console.log(`[asaas-webhook] Ciclo existente ativado para ${invoice.pharmacy_id}`);
                } else {
                    // Se não existe, cria novo
                    await supabaseAdmin
                        .from('billing_cycles')
                        .upsert({
                            pharmacy_id: invoice.pharmacy_id,
                            period_start: paymentDateStr,
                            period_end: endDateStr,
                            status: 'active',
                            free_orders_used: 0,
                            overage_orders: 0,
                            overage_amount_cents: 0,
                        }, { onConflict: 'pharmacy_id,period_start' });
                    console.log(`[asaas-webhook] Novo ciclo criado para ${invoice.pharmacy_id}`);
                }
            } catch (err) {
                console.error("[asaas-webhook] Erro ao criar ciclo inicial:", err);
            }
            // -----------------------------------------------------------------
        }

        // Bônus: logar se o pagamento veio com ID de subscription do Asaas
        if (payment.subscription) {
            console.log(`[asaas-webhook] Payment vinculado à assinatura Asaas: ${payment.subscription}`);
        }
    }


    return json({ ok: true }, 200);
});
