import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        // Fallback to custom name to avoid reserved prefix restriction in CLI
        const serviceRoleKey = Deno.env.get('ADMIN_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        console.log(`[Diagnostic] SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}`);
        console.log(`[Diagnostic] ADMIN_SERVICE_ROLE_KEY: ${Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ? 'OK' : 'NOT SET'}`);
        console.log(`[Diagnostic] SUPABASE_SERVICE_ROLE_KEY: ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'OK' : 'NOT SET'}`);

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error("Variáveis de ambiente (URL ou Service Role Key) não configuradas na Edge Function.");
        }

        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const isServiceKeySameAsAnon = serviceRoleKey === anonKey;

        console.log(`[Diagnostic] Service Key == Anon Key? ${isServiceKeySameAsAnon ? 'YES (PROBLEM)' : 'NO (GOOD)'}`);
        console.log(`[Diagnostic] Service Key length: ${serviceRoleKey.length}`);

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // --- AUTH CHECK: Verify if the requester is an admin or manager ---
        // --- AUTH CHECK: Verify if the requester is an admin or manager ---
        // Support both Authorization header and body 'auth_token' for custom bypass
        const reqJson = await req.json();
        const { email, password, metadata, auth_token } = reqJson; // Extract early

        let token = auth_token;

        if (!token) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader) {
                token = authHeader.replace('Bearer ', '');
            }
        }

        if (!token) {
            return new Response(JSON.stringify({ error: 'No authorization token provided (Header or Body)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !requester) {
            return new Response(JSON.stringify({ error: 'Invalid requester token', detail: authError?.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Fetch requester role from profiles
        const { data: requesterProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, pharmacy_id')
            .eq('id', requester.id)
            .single()

        if (profileError || !requesterProfile) {
            console.error('Erro ao buscar perfil:', profileError);
            return new Response(JSON.stringify({
                error: 'Could not verify requester profile',
                detail: profileError?.message || 'Profile not found',
                code: profileError?.code,
                requester_id: requester.id,
                is_key_weak: isServiceKeySameAsAnon, // DIAGNOSTIC: TRUE means we are using Anon Key (BAD)
                key_len: serviceRoleKey.length
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }


        const isAdmin = requesterProfile.role === 'admin'
        const isManager = requesterProfile.role === 'manager'
        const isMerchant = requesterProfile.role === 'merchant'

        console.log(`[Diagnostic] User Role Check: ID=${requester.id}, Role=${requesterProfile.role}, Pharmacy=${requesterProfile.pharmacy_id}`);

        if (!isAdmin && !isManager && !isMerchant) {
            console.error(`[Unauthorized] User ${requester.id} has role '${requesterProfile.role}' which is not allowed.`);
            return new Response(JSON.stringify({
                error: 'Unauthorized: Only admins or managers can create users',
                debug: {
                    requester_id: requester.id,
                    found_role: requesterProfile.role
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // Body already parsed above to extract auth_token

        // Additional security: Managers/Merchants can only create users for their own pharmacy
        if ((isManager || isMerchant) && metadata?.pharmacy_id !== requesterProfile.pharmacy_id && !isAdmin) {
            return new Response(JSON.stringify({ error: 'Unauthorized: You can only create users for your own pharmacy' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        console.log(`Tentando criar usuário: ${email} com role: ${metadata?.role}`)

        // --- Pharmacy Approval Logic (Audit Fix: Moved to TOP) ---
        // Ensure approval happens regardless of user creation success/failure
        const { pharmacy_id } = reqJson;
        if (pharmacy_id) {
            console.log(`[Prioritizing] Aprovando farmácia ${pharmacy_id}...`);
            const { error: approvalError } = await supabaseClient
                .from('pharmacies')
                .update({ status: 'Aprovado' })
                .eq('id', pharmacy_id);

            if (approvalError) console.error('Erro na aprovação prioritária:', approvalError);
            else console.log('Farmácia aprovada com sucesso (Prioridade).');
        }

        let userResponse;

        try {
            const { data, error } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            })

            if (error) {
                console.error('Supabase Auth Create Error:', JSON.stringify(error, null, 2));
                throw error;
            }
            userResponse = data;
        } catch (error: any) {
            console.error('Erro ao criar usuário:', error.message);
            throw error;
        }

        // --- Envio de E-mail via Resend (opcional) ---
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey) {
            try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendKey}`,
                    },
                    body: JSON.stringify({
                        from: 'Ifarma <onboarding@resend.dev>',
                        to: [email],
                        subject: '🚀 Bem-vindo ao Ifarma - Suas Credenciais de Acesso',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                                <h1 style="color: #13ec6d; font-style: italic;">ifarma</h1>
                                <p>Olá, <strong>${metadata?.full_name || 'Novo Colaborador'}</strong>!</p>
                                <p>Você foi convidado para fazer parte da equipe no <strong>Ifarma</strong>.</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 14px; color: #666;">Seus dados de acesso:</p>
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">E-mail: ${email}</p>
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">Senha: ${password}</p>
                                </div>
                                <p style="font-size: 14px; color: #888;">Por segurança, recomendamos trocar sua senha no primeiro acesso.</p>
                            </div>
                        `,
                    }),
                });

                if (!emailResponse.ok) {
                    console.error('Erro ao enviar e-mail:', await emailResponse.text());
                }
            } catch (emailErr) {
                console.error('Falha ao enviar e-mail:', emailErr);
            }
        }

        return new Response(JSON.stringify({ user: userResponse.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Erro na create-user-admin:', error.message)

        let status = 400;
        let code = 'ERROR';
        let detail = error.message;

        if (error.message?.includes('already registered') || error.message?.includes('already exists') || error.code === '23505') {
            status = 409; // Conflict
            code = 'USER_ALREADY_EXISTS';
            detail = `Usuário já existe. Tente outro telefone/email.`;
        } else if (error.message?.includes('weak_password')) {
            status = 400;
            code = 'PASSWORD_TOO_WEAK';
        } else if (error.message?.includes('Database error')) {
            status = 500;
            code = 'DATABASE_ERROR';
            detail = `Erro interno do banco: ${error.message}`;
        }

        return new Response(JSON.stringify({
            error: detail,
            code: code,
            debug_error: error // Retorna o erro completo para debug no console do navegador
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: status,
        })
    }
})
