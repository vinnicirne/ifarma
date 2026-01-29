// TypeScript Types
export interface User {
    id: string;
    email: string;
    full_name?: string;
    cpf?: string;
    phone?: string;
    avatar_url?: string;
    address?: string;
    role: 'customer' | 'merchant' | 'motoboy' | 'admin';
    is_active: boolean;
    is_online?: boolean;
    battery_level?: number;
    is_charging?: boolean;
    created_at: string;
}

export interface Pharmacy {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    email?: string;
    opening_hours?: string;
    is_open: boolean;
    owner_id?: string;
    created_at: string;
}

export interface Product {
    id: string;
    pharmacy_id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
    image_url?: string;
    requires_prescription: boolean;
    is_active: boolean;
    created_at: string;
}

export interface Order {
    id: string;
    customer_id: string;
    pharmacy_id: string;
    motoboy_id?: string;
    customer_name?: string;
    address: string;
    total_price: number;
    status: 'pendente' | 'preparando' | 'em_rota' | 'entregue' | 'cancelado';
    payment_method?: string;
    installments?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CartItem {
    id: string;
    customer_id: string;
    product_id: string;
    pharmacy_id: string;
    quantity: number;
    created_at: string;
    products?: Product;
}

export interface PaymentSettings {
    id: string;
    pharmacy_id: string;
    accepts_pix: boolean;
    accepts_cash: boolean;
    accepts_debit: boolean;
    accepts_credit: boolean;
    min_order_value: number;
    min_installment_value: number;
    max_installments: number;
    pix_key?: string;
    pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    created_at: string;
    updated_at: string;
}
