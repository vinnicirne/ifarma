import { supabase } from '../lib/supabase';
import type { Pharmacy, PharmacyStatus } from '../types/pharmacy';

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
        const { error } = await supabase
            .from('pharmacies')
            .update({ is_open: isOpen })
            .eq('id', id);

        if (error) throw error;
    },

    async deletePharmacy(id: string): Promise<void> {
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
        const { data: pharm, error: pharmErr } = await supabase
            .from('pharmacies')
            .select('*')
            .eq('id', id)
            .single();

        if (pharmErr || !pharm) throw new Error('Farmácia não encontrada');
        if (!pharm.owner_email) throw new Error('E-mail do dono não encontrado.');

        const tempPassword = Math.random().toString(36).slice(-8) + 'A1@';
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) throw new Error("Sessão expirada.");

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                email: pharm.owner_email,
                password: tempPassword,
                auth_token: session.access_token,
                pharmacy_id: id,
                metadata: {
                    full_name: pharm.owner_name || pharm.name,
                    role: 'merchant'
                }
            })
        });

        const responseText = await response.text();
        if (!response.ok) {
            const errorJson = JSON.parse(responseText);
            const errorText = (errorJson.error || errorJson.message || '').toLowerCase();

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
                    return { email: pharm.owner_email, userWasCreated: false };
                }
                throw new Error('Usuário já existe sem perfil vinculado.');
            }
            throw new Error(errorJson.error || errorJson.message || 'Erro na Edge Function');
        }

        const authData = JSON.parse(responseText);
        const userId = authData.user?.id;

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

        return { email: pharm.owner_email, password: tempPassword, userWasCreated: true };
    }
};
