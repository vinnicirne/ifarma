import { supabase } from '../lib/supabase';
import type { Pharmacy } from '../types/pharmacy';
import { assertUuid } from '../lib/uuidUtils';

export const pharmacyService = {
    async getPharmacies(): Promise<Pharmacy[]> {
        const { data, error } = await supabase
            .from('pharmacies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async updatePharmacyStatus(id: string, isOpen: boolean): Promise<void> {
        assertUuid(id, "updatePharmacyStatus");
        const { error } = await supabase
            .from('pharmacies')
            .update({ is_open: isOpen })
            .eq('id', id);

        if (error) throw error;
    },

    async deletePharmacy(id: string): Promise<void> {
        assertUuid(id, "deletePharmacy");

        console.log(`[deletePharmacy] 🚀 Starting deep deletion for pharmacy: ${id}`);
        console.log(`[deletePharmacy] Versão: 3.0 (Edge Master Delete)`);

        // 1. Fetch fresh session for Edge Function
        const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !session?.access_token) {
            console.error("[deletePharmacy] Session refresh failed:", refreshErr);
            throw new Error("Sessão expirada. Faça login novamente.");
        }

        const { data: { user } } = await supabase.auth.getUser();
        console.log(`[deletePharmacy] Initiated by: ${user?.email} (Metadata Role: ${user?.user_metadata?.role || 'null'})`);

        // 2. Invocar a Edge Function Mestra de Exclusão de Farmácia
        console.log(`[deletePharmacy] Invoking edge function 'delete-pharmacy-admin'...`);
        const { data, error: invokeErr } = await supabase.functions.invoke('delete-pharmacy-admin', {
            body: {
                pharmacy_id: id
            }
        });

        if (invokeErr) {
            console.error("[deletePharmacy] ❌ Edge Function invocation failed:", invokeErr);
            let msg = invokeErr.message || "Erro de rede ao excluir farmácia";
            try {
                const ctx = (invokeErr as any).context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    msg = body.detail || body.error || body.message || msg;
                }
            } catch { /* parse fail */ }
            throw new Error(msg);
        }

        if (!data?.success) {
            console.error("[deletePharmacy] ❌ Server-side deletion failed:", data);
            throw new Error(data?.error || data?.detail || "O servidor não pôde concluir a exclusão da farmácia.");
        }

        console.log(`[deletePharmacy] ✅ Pharmacy ${id} deleted successfully by Master Function.`);
    },

    async approvePharmacy(id: string): Promise<{ email: string, password?: string, userWasCreated: boolean }> {
        assertUuid(id, "approvePharmacy");
        const { data: pharm, error: pharmErr } = await supabase
            .from('pharmacies')
            .select('*')
            .eq('id', id)
            .single();

        if (pharmErr || !pharm) throw new Error('Farmácia não encontrada');
        if (!pharm.owner_email) throw new Error('E-mail do dono não encontrado.');

        const tempPassword = Math.random().toString(36).slice(-8) + 'A1@';

        // Refresh session and LOG IT for debugging 401
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        const session = refreshData?.session;
        const accessToken = session?.access_token;

        console.log(`[pharmacyService] Attempting approval. Project: ${import.meta.env.VITE_SUPABASE_URL}`);
        console.log(`[pharmacyService] Token status: ${accessToken ? 'EXISTS' : 'MISSING'}`);
        if (accessToken) {
            console.log(`[pharmacyService] Token preview: ${accessToken.substring(0, 15)}... (len: ${accessToken.length})`);
        }

        if (refreshError || !accessToken) {
            throw new Error("Sessão expirada. Faça logout e login novamente.");
        }

        const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
            body: {
                email: pharm.owner_email,
                password: tempPassword || Math.random().toString(36).slice(-8),
                pharmacy_id: id,
                approve_pharmacy: true,
                metadata: {
                    full_name: pharm.owner_name || pharm.name,
                    role: 'merchant',
                    pharmacy_id: id
                }
            }
        });

        if (invokeError) {
            console.error("Invoke Error:", invokeError);
            const errorText = (invokeError.message || '').toLowerCase();

            // Try to extract the message and detail from the server response
            let serverMsg = invokeError.message || 'Erro na Edge Function';
            let detail = '';
            try {
                if ((invokeError as any).context && typeof (invokeError as any).context.json === 'function') {
                    const body = await (invokeError as any).context.json();
                    if (body) {
                        if (body.error) serverMsg = body.error;
                        if (body.detail) detail = body.detail;
                        if (body.message) serverMsg = body.message;
                    }
                }
            } catch (e) {
                // ignore json parse error
            }

            if (errorText.includes('invalid jwt') || (invokeError as any).context?.status === 401) {
                const finalMsg = detail ? `Sessão expirada ou permissão negada (${detail}). Faça logout/login.` : 'Sessão expirada ou permissão negada. Faça logout/login novamente no painel admin.';
                throw new Error(finalMsg);
            }

            if (serverMsg.toLowerCase().includes('already registered') || serverMsg.toLowerCase().includes('already exists')) {
                // Find existing profile logic... (keeping existing logic flow)
                // Find existing profile
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', pharm.owner_email)
                    .single();

                if (existingProfile) {
                    await supabase.from('profiles').upsert({
                        id: existingProfile.id,
                        email: pharm.owner_email,
                        full_name: pharm.owner_name || pharm.name,
                        role: 'merchant',
                        phone: pharm.owner_phone,
                        pharmacy_id: id
                    });

                    // Also approve the pharmacy directly
                    await supabase.from('pharmacies').update({ status: 'Aprovado' }).eq('id', id);

                    return { email: pharm.owner_email, userWasCreated: false };
                }
                throw new Error('Usuário já existe sem perfil vinculado.');
            }

            throw new Error(serverMsg);
        }

        const userId = responseData?.user?.id;

        if (userId) {
            await supabase.from('profiles').upsert({
                id: userId,
                email: pharm.owner_email,
                full_name: pharm.owner_name || pharm.name,
                role: 'merchant',
                phone: pharm.owner_phone,
                pharmacy_id: id
            });
        }

        // --- CRITICAL: Activate Billing & Subscription ---
        // Now that the user is approved and linked, we MUST trigger the billing activation
        // This creates the Asaas subscription and the initial billing_cycles record
        // We do this via the activate-pharmacy-plan function

        console.log(`[approvePharmacy] Activating plan for pharmacy: ${id}`);
        const { data: { session: activationSession } } = await supabase.auth.getSession();
        await supabase.auth.refreshSession();

        const { error: activationError } = await supabase.functions.invoke('activate-pharmacy-plan', {
            body: { pharmacy_id: id },
            headers: {
                Authorization: `Bearer ${activationSession?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
            }
        });

        if (activationError) {
            console.error('[approvePharmacy] Plan activation failed (non-blocking for auth):', activationError);
            // We don't throw here to avoid rolling back the auth creation, but specific alerting would be good
        } else {
            console.log('[approvePharmacy] Plan activated successfully');
        }

        return { email: pharm.owner_email, password: tempPassword, userWasCreated: true };
    }
};
