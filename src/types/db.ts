export interface Profile {
    id: string;
    email: string;
    full_name?: string;
    cpf?: string;
    phone?: string;
    avatar_url?: string;
    address?: string;
    role: 'customer' | 'merchant' | 'motoboy' | 'admin';
    is_active: boolean;
    is_online: boolean;
    last_lat?: number;
    last_lng?: number;
    current_order_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Pharmacy {
    id: string;
    name: string;
    status: 'Pendente' | 'Aprovado' | 'Rejeitado';
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    email?: string;
    opening_hours?: string;
    is_open: boolean;
    owner_id: string;
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
    status: 'pendente' | 'preparando' | 'pronto_entrega' | 'em_rota' | 'entregue' | 'cancelado';
    payment_method?: string;
    installments: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Campos joinados
    profiles?: Profile; // Informações do cliente ou motoboy dependendo do contexto
    pharmacy?: Pharmacy;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
    created_at: string;
    product?: Product;
}

export interface CartItem {
    id: string;
    customer_id: string;
    product_id: string;
    pharmacy_id: string;
    quantity: number;
    created_at: string;
    product?: Product;
    pharmacy?: Pharmacy;
}
