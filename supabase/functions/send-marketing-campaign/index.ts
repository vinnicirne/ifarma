import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Marketing Campaigns Function!")

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { campaign_id } = await req.json()

        if (!campaign_id) {
            throw new Error('campaign_id is required')
        }

        // Initialize Admin Client (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('IFARMA_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch Campaign Details
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from('marketing_campaigns')
            .select('*')
            .eq('id', campaign_id)
            .single()

        if (campaignError || !campaign) {
            throw new Error(`Campaign not found: ${campaignError?.message}`)
        }

        if (campaign.status === 'sent') {
            return new Response(JSON.stringify({ message: 'Campaign already sent' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 2. Fetch Target Audience Tokens
        let query = supabaseAdmin.from('device_tokens').select('token')

        // Simple segmentation logic (can be expanded)
        if (campaign.target_audience === 'android') {
            query = query.eq('device_type', 'android')
        } else if (campaign.target_audience === 'ios') {
            query = query.eq('device_type', 'ios')
        }
        // 'all' fetches everything

        const { data: tokensData, error: tokensError } = await query

        if (tokensError) {
            throw new Error(`Error fetching tokens: ${tokensError.message}`)
        }

        const tokens = tokensData.map(t => t.token)

        if (tokens.length === 0) {
            await supabaseAdmin.from('marketing_campaigns').update({ status: 'failed', sent_at: new Date().toISOString() }).eq('id', campaign_id)
            return new Response(JSON.stringify({ message: 'No devices found for this audience' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Send via FCM in Batches (Legacy API limit is 1000, we use 500 for safety)
        const BATCH_SIZE = 500
        const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
        let successCount = 0
        let failureCount = 0

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
            const batchTokens = tokens.slice(i, i + BATCH_SIZE)

            const message = {
                registration_ids: batchTokens,
                notification: {
                    title: campaign.title,
                    body: campaign.body,
                    image: campaign.image_url, // Android support
                    icon: '/icon.png',
                    sound: 'default'
                },
                data: {
                    type: 'marketing', // Important for client to handle differently
                    campaignId: campaign.id,
                    url: '/promotions'
                },
                priority: 'high'
            }

            const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${FIREBASE_SERVER_KEY}`
                },
                body: JSON.stringify(message)
            })

            const result = await fcmResponse.json()

            if (result.success) successCount += result.success
            if (result.failure) failureCount += result.failure

            // Clean up invalid tokens
            if (result.results) {
                const invalidTokens: string[] = []
                result.results.forEach((res: any, index: number) => {
                    if (res.error === 'InvalidRegistration' || res.error === 'NotRegistered') {
                        invalidTokens.push(batchTokens[index])
                    }
                })

                if (invalidTokens.length > 0) {
                    await supabaseAdmin.from('device_tokens').delete().in('token', invalidTokens)
                }
            }
        }

        // 4. Update Campaign Status
        await supabaseAdmin
            .from('marketing_campaigns')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .eq('id', campaign_id)

        return new Response(
            JSON.stringify({
                success: true,
                campaign: campaign.title,
                sentTo: successCount,
                failed: failureCount
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
