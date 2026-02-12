export interface Motoboy {
    id: string;
    name: string;
    phone: string;
    email?: string;
    pharmacy_id?: string;
    pharmacy?: {
        name: string;
    };
    status: 'Disponível' | 'Offline' | string;
    is_active: boolean;
    is_online: boolean;
    cpf?: string;
    vehicle_plate?: string;
    vehicle_model?: string;
    cnh_url?: string;
    created_at?: string;
}

export interface MotoboyContract {
    delivery_fee: number;
    fixed_salary: number;
    daily_rate: number;
    productivity_goal: number;
    productivity_bonus: number;
}

export interface MotoboyFormData {
    name: string;
    cpf: string;
    phone: string;
    pharmacy_id: string;
    vehicle_plate: string;
    vehicle_model: string;
    cnh_url: string;
    password?: string;
}
