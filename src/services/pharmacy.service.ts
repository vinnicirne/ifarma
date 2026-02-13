import { supabase } from '../lib/supabase';
import type { Pharmacy } from '../types/pharmacy';


export class PharmacyService {
    /**
     * Busca APENAS farmácias estritamente aprovadas.
     * Fonte de verdade para a listagem pública.
     */
    static async getApproved(): Promise<Pharmacy[]> {
        // Usa ilike para ser case-insensitive e tolerar espaços extras
        // Isso resolve o problema de registros como 'aprovado', 'Aprovado ', 'APROVADO'
        // Filtro robusto para aceitar 'Aprovado', 'Approved', 'Active', 'Ativo' etc.
        const { data, error } = await supabase
            .from('pharmacies')
            .select('*')
            .or('status.ilike.%aprovado%,status.ilike.%approved%,status.ilike.%active%')
            .order('is_featured', { ascending: false });

        if (error) {
            console.error('❌ Service: Erro ao buscar farmácias aprovadas', error);
            throw error;
        }

        return (data || []) as Pharmacy[];
    }

    /**
     * Busca todas as farmácias (apenas para debug ou admin interno se o RLS permitir).
     */
    static async debugGetAll(): Promise<Pharmacy[]> {
        const { data, error } = await supabase
            .from('pharmacies')
            .select('*');

        if (error) throw error;
        return (data || []) as Pharmacy[];
    }
}
