export const PharmacyStatus = {
    APPROVED: 'Aprovado',
    PENDING: 'Pendente',
    REJECTED: 'Reprovado', // Assumido por padrão, mesmo que não visto
    INACTIVE: 'Inativo'
} as const;

export type PharmacyStatusType = typeof PharmacyStatus[keyof typeof PharmacyStatus];

export interface Pharmacy {
    id: string;
    name: string;
    trade_name?: string;
    legal_name?: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
    tax_id?: string; // CNPJ
    address?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;

    // Status e Configuração
    status: PharmacyStatusType | string;
    is_active: boolean;
    is_featured: boolean;
    is_open?: boolean; // Novo campo
    plan?: string;     // Novo campo

    // Avaliação
    rating?: number;
    review_count?: number;

    // Mídia
    logo_url?: string;
    banner_url?: string;

    // Contato
    phone?: string;
    whatsapp?: string;
    email?: string;

    // Delivery
    delivery_enabled: boolean;
    delivery_fee_type?: 'fixed' | 'dynamic' | 'radius';
    delivery_fee_base?: number;
    delivery_radius_km?: number;
    delivery_time_min?: number;
    delivery_time_max?: number;

    created_at?: string;
    updated_at?: string;
}
