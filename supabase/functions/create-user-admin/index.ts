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

        const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

        // --- AUTH CHECK: Verify if the requester is an admin or manager ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const token = authHeader.replace('Bearer ', '')
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
            return new Response(JSON.stringify({ error: 'Could not verify requester profile' }), {
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

        const { email, password, metadata } = await req.json()

        // Additional security: Managers can only create users for their own pharmacy
        if (isManager && metadata?.pharmacy_id !== requesterProfile.pharmacy_id && !isAdmin) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Managers can only create users for their own pharmacy' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        console.log(`Tentando criar usuário: ${email} com role: ${metadata?.role}`)

        const { data: userResponse, error } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata
        })

        if (error) throw error

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
