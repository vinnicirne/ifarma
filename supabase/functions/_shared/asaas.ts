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

if (!ASAAS_API_KEY) {
    throw new Error("Missing env var: ASAAS_API_KEY");
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
    const url = `${ASAAS_BASE_URL}${normalizePath(path)}`;

    const headers = new Headers(options.headers || {});
    headers.set("access_token", ASAAS_API_KEY);
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
