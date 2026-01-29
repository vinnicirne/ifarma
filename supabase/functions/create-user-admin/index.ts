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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, metadata } = await req.json()

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
    } catch (error) {
        console.error('Erro na create-user-admin:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
