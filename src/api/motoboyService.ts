import { supabase } from '../lib/supabase';
import type { Motoboy, MotoboyContract, MotoboyFormData } from '../types/motoboy';

export const motoboyService = {
    async getMotoboys(): Promise<Motoboy[]> {
        const { data: boys, error: boysError } = await supabase
            .from('profiles')
            .select('id, full_name, phone, email, pharmacy_id, is_active, is_online, created_at, vehicle_plate, vehicle_model, cnh_url')
            .eq('role', 'motoboy')
            .order('full_name');

        if (boysError) throw boysError;

        const { data: pharms } = await supabase
            .from('pharmacies')
            .select('id, name');

        const pharmaMap = (pharms || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

        return (boys || []).map(boy => ({
            id: boy.id,
            name: boy.full_name,
            phone: boy.phone,
            email: boy.email,
            pharmacy_id: boy.pharmacy_id,
            pharmacy: { name: pharmaMap[boy.pharmacy_id] || 'Sem farmácia' },
            status: boy.is_online ? 'Disponível' : 'Offline',
            is_online: boy.is_online,
            is_active: boy.is_active,
            created_at: boy.created_at,
            vehicle_plate: boy.vehicle_plate || 'N/A',
            vehicle_model: boy.vehicle_model || 'N/A',
            cnh_url: boy.cnh_url
        }));
    },

    async getPharmaciesDropdown() {
        const { data, error } = await supabase
            .from('pharmacies')
            .select('id, name')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createMotoboy(formData: MotoboyFormData): Promise<void> {
        const loginEmail = `${formData.phone.replace(/\D/g, '')}@motoboy.ifarma.com`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada.");

        const { data, error } = await supabase.functions.invoke('create-staff-user', {
            body: {
                email: loginEmail,
                password: formData.password,
                metadata: {
                    role: 'motoboy',
                    full_name: formData.name,
                    pharmacy_id: formData.pharmacy_id,
                    phone: formData.phone,
                    vehicle_plate: formData.vehicle_plate,
                    vehicle_model: formData.vehicle_model,
                    cnh_url: formData.cnh_url,
                    is_active: true
                }
            },
            headers: {
                Authorization: `Bearer ${session?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
            }
        });

        if (error) {
            console.error("Motoboy Creation Error:", error);
            const errorBody = await error.context?.json().catch(() => ({}));
            throw new Error(errorBody?.error || error.message || "Erro na criação do motoboy");
        }
    },

    async deleteMotoboy(id: string): Promise<void> {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    },

    async updateMotoboyStatus(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
        if (error) throw error;
    },

    async updateMotoboyProfile(id: string, updates: any): Promise<void> {
        const mappedUpdates: any = { ...updates };
        if (mappedUpdates.name) {
            mappedUpdates.full_name = mappedUpdates.name;
            delete mappedUpdates.name;
        }
        const { error } = await supabase.from('profiles').update(mappedUpdates).eq('id', id);
        if (error) throw error;
    },

    async assignPharmacy(motoboyId: string, pharmacyId: string | null): Promise<void> {
        const { error } = await supabase.from('profiles').update({
            pharmacy_id: pharmacyId
        }).eq('id', motoboyId);
        if (error) throw error;
    },

    async getContract(motoboyId: string, pharmacyId: string): Promise<MotoboyContract | null> {
        const { data, error } = await supabase
            .from('courier_contracts')
            .select('*')
            .eq('courier_id', motoboyId)
            .eq('pharmacy_id', pharmacyId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as MotoboyContract || null;
    },

    async saveContract(motoboyId: string, pharmacyId: string, contract: MotoboyContract): Promise<void> {
        const { error: rpcError } = await supabase.rpc('upsert_courier_contract_admin', {
            p_courier_id: motoboyId,
            p_pharmacy_id: pharmacyId,
            p_delivery_fee: contract.delivery_fee,
            p_fixed_salary: contract.fixed_salary,
            p_daily_rate: contract.daily_rate,
            p_productivity_goal: contract.productivity_goal,
            p_productivity_bonus: contract.productivity_bonus
        });

        if (rpcError) {
            const { error: tableError } = await supabase
                .from('courier_contracts')
                .upsert({
                    courier_id: motoboyId,
                    pharmacy_id: pharmacyId,
                    ...contract,
                    updated_at: new Date().toISOString()
                });
            if (tableError) throw tableError;
        }
    }
};
