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
        // 1. Get associated profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('pharmacy_id', id)
            .single();

        // 2. Delete Auth user via Edge Function if profile exists
        if (profile) {
            const { data: { session } } = await supabase.auth.getSession();
            await supabase.functions.invoke('delete-user-admin', {
                body: { user_id: profile.id },
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
        }

        // 3. Delete pharmacy
        const { error } = await supabase.from('pharmacies').delete().eq('id', id);
        if (error) throw error;
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

        // Refresh session to avoid expired token 401 errors
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        const session = refreshData?.session;

        if (refreshError || !session?.access_token) {
            throw new Error("Sessão expirada. Faça logout e login novamente.");
        }

        const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
            body: {
                email: pharm.owner_email,
                password: tempPassword || Math.random().toString(36).slice(-8), // Fallback password
                pharmacy_id: id,
                metadata: {
                    full_name: pharm.owner_name || pharm.name,
                    role: 'merchant',
                    pharmacy_id: id // Redundant but safe
                }
            }
        });

        if (invokeError) {
            const errorText = (invokeError.message || '').toLowerCase();

            // Handle 401 specifically
            if (errorText.includes('non-2xx') || errorText.includes('401')) {
                throw new Error('Sessão expirada ou permissão negada. Faça logout e login novamente no painel admin.');
            }

            if (errorText.includes('already registered') || errorText.includes('already exists')) {
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
            throw new Error(invokeError.message || 'Erro na Edge Function');
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

        const { error: activationError } = await supabase.functions.invoke('activate-pharmacy-plan', {
            body: { pharmacy_id: id },
            headers: { Authorization: `Bearer ${activationSession?.access_token}` }
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
