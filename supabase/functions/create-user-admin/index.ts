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

        if (!isAdmin && !isManager) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Only admins or managers can create users' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        // Body already parsed above to extract auth_token

        // Additional security: Managers can only create users for their own pharmacy
        if (isManager && metadata?.pharmacy_id !== requesterProfile.pharmacy_id && !isAdmin) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Managers can only create users for their own pharmacy' }), {
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
        let userAlreadyExisted = false;

        try {
            const { data, error } = await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            })

            if (error) throw error;
            userResponse = data;
        } catch (error: any) {
            console.error('Erro Auth User:', JSON.stringify(error, null, 2));

            // ROBUST CHECK: Instead of relying on error messages, we ALWAYS try to find the user
            // caused by the error. If they exist, good. If not, re-throw.
            console.log(`Erro na criação. Verificando se usuário ${email} já existe...`);

            // Fetch existing user by email
            const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers({
                page: 1,
                perPage: 1000
            });

            if (listError) {
                console.error('Erro ao listar usuários (Fallback):', listError);
                throw error; // Throw original error if we can't check
            }

            // Case insensitive search
            const existingUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

            if (existingUser) {
                console.log(`Usuário recuperado: ${existingUser.id}. Atualizando credenciais para garantir acesso...`);

                // Force update password so the credentials shown in frontend actually work
                const { error: updateErr } = await supabaseClient.auth.admin.updateUserById(existingUser.id, {
                    password: password,
                    email_confirm: true,
                    user_metadata: metadata
                });

                if (updateErr) {
                    console.error('Erro ao atualizar senha do usuário recuperado:', updateErr);
                    // Don't throw, just log. We still want to return the user.
                } else {
                    console.log('Senha atualizada com sucesso.');
                }

                userResponse = { user: existingUser };
                userAlreadyExisted = true;
                // Proceed to success flow
            } else {
                console.error('Usuário não encontrado na recuperação. O erro original persiste.');
                throw error; // User really doesn't exist, so original error is valid (e.g. password weak)
            }
        }


        // --- Envio de E-mail via Resend ---
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
                        from: 'Ifarma <onboarding@resend.dev>', // Alterar para domínio próprio se disponível
                        to: [email],
                        subject: '🚀 Bem-vindo ao Ifarma - Suas Credenciais de Acesso',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                                <h1 style="color: #13ec6d; font-style: italic;">ifarma</h1>
                                <p>Olá, <strong>${metadata?.full_name || 'Novo Colaborador'}</strong>!</p>
                                <p>Você foi convidado para fazer parte da equipe no <strong>Ifarma</strong> com a função de <strong>${metadata?.role === 'manager' ? 'Gerente' :
                                metadata?.role === 'staff' ? 'Caixa/Atendente' :
                                    metadata?.role === 'motoboy' ? 'Motoboy' : 'Colaborador'
                            }</strong>.</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 14px; color: #666;">Seus dados de acesso:</p>
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">E-mail: ${email}</p>
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">Senha Temporária: ${password}</p>
                                </div>
                                <p style="font-size: 14px; color: #888;">Por segurança, recomendamos trocar sua senha no primeiro acesso.</p>
                                <a href="https://ifarma-app.vercel.app/login" style="display: inline-block; background-color: #13ec6d; color: #0d1b13; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Acessar Painel Agora</a>
                                <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
                                <p style="font-size: 12px; color: #aaa; text-align: center;">Ifarma - Tecnologia para Farmácias</p>
                            </div>
                        `,
                    }),
                });

                if (!emailResponse.ok) {
                    const errorText = await emailResponse.text();
                    console.error('Erro Resend:', errorText);
                } else {
                    console.log(`E-mail enviado com sucesso para: ${email}`);
                }
            } catch (emailErr) {
                console.error('Falha ao enviar e-mail:', emailErr);
            }
        } else {
            console.warn('RESEND_API_KEY não configurada. E-mail não enviado.');
        }

        // (Approved logic moved to top)

        return new Response(JSON.stringify({ user: userResponse.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Erro na create-user-admin:', error.message)

        let status = 400;
        let code = 'ERROR';

        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
            status = 409; // Conflict
            code = 'USER_ALREADY_EXISTS';
        } else if (error.message?.includes('weak_password') || error.message?.toLowerCase().includes('password is too weak')) {
            status = 400;
            code = 'PASSWORD_TOO_WEAK';
        }

        return new Response(JSON.stringify({
            error: error.message,
            code: code
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: status,
        })
    }
})
