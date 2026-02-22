/**
 * EDGE FUNCTION: Order Billing Listener
 * 
 * Escuta notificações de novos pedidos e processa billing
 * Substitui trigger complexo por lógica mais robusta
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: "Method not allowed" }, 405)

  try {
    const { order_id, pharmacy_id, action = 'process' } = await req.json()

    if (!order_id || !pharmacy_id) {
      return json({ error: "order_id e pharmacy_id são obrigatórios" }, 400)
    }

    console.log(`[order-billing-listener] Processando pedido ${order_id} para farmácia ${pharmacy_id}`)

    // 1. Buscar subscription e plano atual
    const { data: subscription, error: subError } = await supabase
      .from('pharmacy_subscriptions')
      .select(`
        status,
        plan:billing_plans(
          free_orders_per_period,
          overage_percent_bp
        )
      `)
      .eq('pharmacy_id', pharmacy_id)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      console.error('[order-billing-listener] Subscription não encontrada:', subError)
      return json({ error: "Assinatura não encontrada" }, 404)
    }

    // 2. Buscar ciclo atual
    const { data: cycle, error: cycleError } = await supabase
      .from('billing_cycles')
      .select('*')
      .eq('pharmacy_id', pharmacy_id)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    if (cycleError || !cycle) {
      console.error('[order-billing-listener] Ciclo não encontrado:', cycleError)
      return json({ error: "Ciclo de faturamento não encontrado" }, 404)
    }

    const freeLimit = subscription.plan.free_orders_per_period || 0
    const currentFreeUsed = cycle.free_orders_used || 0
    const currentOverage = cycle.overage_orders || 0

    console.log(`[order-billing-listener] Status: grátis=${currentFreeUsed}/${freeLimit}, excedentes=${currentOverage}`)

    // 3. Decidir se conta como grátis ou excedente
    let updateData: any
    let orderType: string

    if (currentFreeUsed < freeLimit) {
      // Ainda tem franquia grátis
      updateData = {
        free_orders_used: currentFreeUsed + 1
      }
      orderType = 'FREE'

      console.log(`[order-billing-listener] Pedido ${order_id} contado como GRÁTIS (${currentFreeUsed + 1}/${freeLimit})`)
    } else {
      // Franquia esgotada - conta como excedente
      const overageFeeCents = Math.round(
        (subscription.plan.overage_percent_bp || 0) * 100 / 10000 // converte bp para cents
      )

      updateData = {
        overage_orders: currentOverage + 1,
        overage_amount_cents: cycle.overage_amount_cents + overageFeeCents
      }
      orderType = 'OVERAGE'

      console.log(`[order-billing-listener] Pedido ${order_id} contado como EXCEDENTE (${currentOverage + 1}), taxa=${overageFeeCents}c`)
    }

    // 4. Atualizar ciclo
    const { error: updateError } = await supabase
      .from('billing_cycles')
      .update(updateData)
      .eq('id', cycle.id)

    if (updateError) {
      console.error('[order-billing-listener] Erro ao atualizar:', updateError)
      return json({ error: "Erro ao atualizar contador" }, 500)
    }

    return json({
      success: true,
      order_id,
      pharmacy_id,
      type: orderType,
      updated: updateData
    })

  } catch (error: any) {
    console.error('[order-billing-listener] Erro fatal:', error)
    return json({ error: error.message || "Erro interno" }, 500)
  }
})
