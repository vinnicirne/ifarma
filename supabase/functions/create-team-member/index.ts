import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            return json(500, {
                error: "Missing env vars",
                detail: {
                    SUPABASE_URL: !!supabaseUrl,
                    SUPABASE_ANON_KEY: !!anonKey,
                    SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
                },
            });
        }

        // --- AUTH HEADER ---
        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return json(401, { error: "No Bearer token provided" });
        }

        // ✅ 1) Client do usuário (anon + Authorization do request)
        const supabaseUser = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        const requester = userData?.user;

        if (userErr || !requester) {
            return json(401, {
                error: "Invalid JWT",
                detail: userErr?.message ?? null,
            });
        }

        // ✅ 2) Client admin (service role)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // --- requester profile ---
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("role, pharmacy_id")
            .eq("id", requester.id)
            .single();

        if (profileError || !requesterProfile) {
            return json(403, {
                error: "Profile not found or error fetching profile",
                detail: profileError?.message ?? null,
            });
        }

        // Verificar se pode gerenciar equipe
        const canManageTeam = ["merchant", "manager", "admin"].includes(requesterProfile.role);
        if (!canManageTeam) {
            return json(403, { error: "You don't have permission to manage team members" });
        }

        // --- BODY ---
        let reqJson: any = {};
        try {
            reqJson = await req.json();
        } catch {
            return json(400, { error: "Invalid JSON body" });
        }

        const { email, password, metadata } = reqJson;

        if (!email || !password) {
            return json(400, { error: "Email and password are required" });
        }

        if (password.length < 6) {
            return json(400, { error: "Password must be at least 6 characters long" });
        }

        // Validar metadata obrigatórios
        if (!metadata?.full_name || !metadata?.role || !metadata?.pharmacy_id) {
            return json(400, { 
                error: "Missing required metadata fields: full_name, role, pharmacy_id" 
            });
        }

        // Validar role
        const validRoles = ["staff", "manager", "motoboy"];
        if (!validRoles.includes(metadata.role)) {
            return json(400, { error: "Invalid role. Must be: staff, manager, or motoboy" });
        }

        // Verificar se pharmacy_id bate com a farmácia do requester (se não for admin)
        if (requesterProfile.role !== "admin" && 
            requesterProfile.pharmacy_id !== metadata.pharmacy_id) {
            return json(403, { 
                error: "You can only create team members for your own pharmacy" 
            });
        }

        // Criar usuário no Auth
        console.log(`[create-team-member] Creating user: ${email}`);
        const { data: userDataNew, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata
        });

        if (createError) {
            console.error("[create-team-member] User creation error:", createError);
            
            // Se usuário já existe, retornar erro específico
            if (createError.message.includes("already registered") || 
                createError.message.includes("already exists")) {
                return json(400, { 
                    error: "User already exists", 
                    detail: "This phone number is already registered" 
                });
            }
            
            return json(400, { 
                error: "Failed to create user", 
                detail: createError.message 
            });
        }

        const user = userDataNew.user;
        console.log(`[create-team-member] User created: ${user.id}`);

        // Criar perfil na tabela profiles (redundância mas garante)
        const { error: profileInsertError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: user.id,
                email: email,
                full_name: metadata.full_name,
                phone: metadata.phone,
                role: metadata.role,
                pharmacy_id: metadata.pharmacy_id,
                vehicle_plate: metadata.vehicle_plate,
                vehicle_model: metadata.vehicle_model,
                is_active: true,
            });

        if (profileInsertError) {
            console.error("[create-team-member] Profile insert error:", profileInsertError);
            // Não falhar completamente, apenas logar
        }

        return json(200, {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata
            }
        });

    } catch (error: any) {
        console.error("[create-team-member] Fatal Error:", error);
        return json(500, { 
            error: "Internal Server Error", 
            detail: error?.message ?? null 
        });
    }
});
