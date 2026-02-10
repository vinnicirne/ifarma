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
            Deno.env.get('IFARMA_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId, email, password, metadata } = await req.json()

        if (!userId) throw new Error('ID do usuário é obrigatório')

        console.log(`Atualizando usuário: ${userId}`)

        const updateData: any = {
            user_metadata: metadata
        }

        if (email) updateData.email = email
        if (password) updateData.password = password

        const { data: user, error } = await supabaseClient.auth.admin.updateUserById(
            userId,
            updateData
        )

        if (error) throw error

        return new Response(JSON.stringify({ user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Erro na update-user-admin:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
