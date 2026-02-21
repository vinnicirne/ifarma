// ============================================================================
// SHARED: Asaas Helper (Production-Ready)
// Centraliza chamadas ao Asaas com:
// - Timeout
// - Logs padronizados
// - Tratamento consistente de erro
// - Validação de ENV
// ============================================================================

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const ASAAS_BASE_URL =
    Deno.env.get("ASAAS_BASE_URL") ||
    "https://api-sandbox.asaas.com/v3"; // default sandbox

// --- CONFIGURAÇÃO DE PROXY (FIXED IP) ---
const ASAAS_PROXY_URL = Deno.env.get("ASAAS_PROXY_URL");
const PROXY_TOKEN = Deno.env.get("PROXY_TOKEN");

if (!ASAAS_API_KEY && !PROXY_TOKEN) {
    throw new Error("Missing env var: ASAAS_API_KEY or PROXY_TOKEN");
}

export interface AsaasResponse<T = any> {
    ok: boolean;
    status: number;
    data: T | null;
    rawText: string;
}

/**
 * Timeout wrapper (Edge-safe)
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 15000
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

/**
 * Normaliza path para evitar // duplicado
 */
function normalizePath(path: string) {
    return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Fetch padrão para Asaas
 */
export async function asaasFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<AsaasResponse<T>> {
    // Definimos se vamos usar o proxy (IP Fixo) ou direto
    const useProxy = !!(ASAAS_PROXY_URL && PROXY_TOKEN);

    // Se usar proxy, a URL base muda e o path ganha prefixo /asaas
    const baseUrl = useProxy ? ASAAS_PROXY_URL : ASAAS_BASE_URL;
    const finalPath = useProxy ? `/asaas${normalizePath(path)}` : normalizePath(path);
    const url = `${baseUrl}${finalPath}`;

    const headers = new Headers(options.headers || {});

    // O token de acesso muda se for proxy (Bearer) ou direto (access_token)
    if (useProxy) {
        headers.set("Authorization", `Bearer ${PROXY_TOKEN}`);
    } else {
        headers.set("access_token", ASAAS_API_KEY!);
    }

    headers.set("accept", "application/json");

    if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
    }

    const requestOptions: RequestInit = {
        ...options,
        headers,
    };

    try {
        const response = await fetchWithTimeout(url, requestOptions);

        const rawText = await response.text();

        let parsed: any = null;

        try {
            parsed = rawText ? JSON.parse(rawText) : null;
        } catch {
            parsed = null;
        }

        if (!response.ok) {
            console.error("[ASAAS ERROR]", {
                status: response.status,
                path,
                response: parsed || rawText,
            });
        }

        return {
            ok: response.ok,
            status: response.status,
            data: response.ok ? parsed : null,
            rawText,
        };
    } catch (err: any) {
        const message = err?.name === "AbortError"
            ? "Request timeout"
            : err?.message || String(err);

        console.error("[ASAAS FATAL ERROR]", {
            path,
            error: message,
        });

        return {
            ok: false,
            status: 0,
            data: null,
            rawText: message,
        };
    }
}

/**
 * Versão que lança erro automaticamente se não for OK
 */
export async function asaasFetchOrThrow<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await asaasFetch<T>(path, options);

    if (!res.ok) {
        throw new Error(
            `Asaas request failed [${res.status}] ${path}: ${res.rawText}`
        );
    }

    if (!res.data) {
        throw new Error(`Asaas returned empty body for ${path}`);
    }

    return res.data;
}
