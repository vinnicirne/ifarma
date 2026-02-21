import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_PROXY_URL = (Deno.env.get("ASAAS_PROXY_URL") || "").trim();
const PROXY_TOKEN = (Deno.env.get("PROXY_TOKEN") || "").trim();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function isAllowedMethod(method: string) {
    const m = method.toUpperCase();
    return ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(m);
}

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // ✅ Public healthcheck (no JWT required)
    if (req.method === "GET") {
        return json(200, { ok: true, service: "asaas-proxy" });
    }

    // Only POST beyond this point
    if (req.method !== "POST") {
        return json(405, { error: "method_not_allowed" });
    }

    // Ensure env
    if (!ASAAS_PROXY_URL || !PROXY_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return json(500, { error: "missing_env" });
    }

    // ✅ Require Supabase JWT for POST
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
        return json(401, { error: "missing_authorization_header" });
    }

    // Validate JWT (standard user session) using anon client + user token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
        return json(401, { error: "invalid_token" });
    }

    // Parse payload
    let body: any;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "invalid_json" });
    }

    const path = body?.path;
    const method = (body?.method || "POST").toString().toUpperCase();
    const payload = body?.payload ?? {};

    // Validate path & method
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
        return json(400, { error: "invalid_path" });
    }
    if (!isAllowedMethod(method)) {
        return json(400, { error: "invalid_method" });
    }

    // Safety: prevent weird paths (optional but recommended)
    if (path.includes("..") || path.includes("\\") || path.includes(" ")) {
        return json(400, { error: "invalid_path_format" });
    }

    // Forward to your fixed-IP proxy
    const upstreamUrl = `${ASAAS_PROXY_URL}/asaas${path}`;

    const upstreamResp = await fetch(upstreamUrl, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${PROXY_TOKEN}`,
        },
        body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(payload),
    });

    const text = await upstreamResp.text();
    const contentType = upstreamResp.headers.get("content-type") || "application/json";

    return new Response(text, {
        status: upstreamResp.status,
        headers: { ...corsHeaders, "Content-Type": contentType },
    });
});