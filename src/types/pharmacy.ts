export type PharmacyStatus = 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Suspenso';
export type PlanType = 'Gratuito' | 'Bronze' | 'Prata' | 'Ouro';

export interface Pharmacy {
    id: string;
    name: string;
    logo_url?: string;
    address?: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
    status: PharmacyStatus | string;
    plan: PlanType | string;
    is_open: boolean;
    created_at: string;
    latitude?: number | string;
    longitude?: number | string;
    phone?: string;
    establishment_phone?: string;
}

export interface ApproveResponse {
    userWasCreated: boolean;
    email: string;
    password?: string;
}
