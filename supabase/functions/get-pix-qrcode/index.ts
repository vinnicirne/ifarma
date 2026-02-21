// ============================================================================
// EDGE FUNCTION: Get PIX QR Code
// ============================================================================
// Usada para buscar QR Code quando não está pronto na criação do pagamento

import { extractBearer, adminClient, authorizeBillingAccess } from "../_shared/authz.ts";
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

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function fetchPixQrWithRetry(paymentId: string) {
    const MAX_ATTEMPTS = 10;
    const INITIAL_DELAY = 1500;
    const DELAY_INCREMENT = 1000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const qrRes = await asaasFetch(`/payments/${paymentId}/pixQrCode`);
        if (qrRes.ok && qrRes.data?.encodedImage) {
            console.log(`[get-pix-qrcode] QR obtido na tentativa ${attempt}`);
            return {
                ok: true as const,
                encodedImage: qrRes.data.encodedImage,
                payload: qrRes.data.payload,
                expirationDate: qrRes.data.expirationDate
            };
        }

        console.warn(`[get-pix-qrcode] Tentativa ${attempt}/${MAX_ATTEMPTS} falhou para ${paymentId}`);
        const delay = INITIAL_DELAY + (attempt - 1) * DELAY_INCREMENT;
        await sleep(delay);
    }

    return { ok: false as const };
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const token = extractBearer(req);

        // Parse Body
        let body: { payment_id: string };
        try {
            body = await req.json();
        } catch (e: any) {
            return json({ error: "Invalid JSON body", details: e?.message }, 400);
        }

        const { payment_id } = body;

        if (!payment_id) {
            return json({ error: "payment_id é obrigatório" }, 400);
        }

        // Buscar QR Code no Asaas com Retries
        const qrResult = await fetchPixQrWithRetry(payment_id);

        if (!qrResult.ok) {
            console.error(`[get-pix-qrcode] QR Query Failed after retries for ${payment_id}`);

            // Verificar status do pagamento para ver se já foi pago
            const payRes = await asaasFetch(`/payments/${payment_id}`);
            if (payRes.ok) {
                const status = payRes.data.status;
                if (status === 'RECEIVED' || status === 'CONFIRMED') {
                    return json({
                        success: true,
                        status: 'paid',
                        message: 'Pagamento já confirmado'
                    });
                }
            }

            return json({
                success: false,
                error: 'QR Code não disponível ainda. A Asaas está processando.',
                status: 'pending_qr'
            }, 200); // Retornamos 200 para o polling continuar suave
        }

        return json({
            success: true,
            status: 'ready',
            qr_base64: qrResult.encodedImage,
            copy_paste: qrResult.payload,
            expiration_date: qrResult.expirationDate
        });

    } catch (e: any) {
        console.error("[get-pix-qrcode] Fatal Error:", e);
        return json({ error: e?.message || "Internal Server Error" }, 500);
    }
});
