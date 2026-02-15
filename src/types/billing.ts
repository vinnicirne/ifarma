/**
 * MÓDULO FINANCEIRO - Tipos TypeScript
 * Gerado automaticamente a partir do schema SQL
 */

// ============================================================================
// ENUMS
// ============================================================================

export type SubscriptionStatus = 'active' | 'overdue' | 'canceled' | 'pending' | 'pending_asaas';
export type BillingCycleStatus = 'active' | 'closed' | 'invoiced';
export type InvoiceType = 'monthly_fee' | 'overage';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'canceled';
export type AuditAction = 'created' | 'updated' | 'deleted';

// ============================================================================
// TABELAS
// ============================================================================

export interface BillingPlan {
    id: string;
    name: string;
    slug: string;
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number; // Basis points (500 = 5%)
    overage_fixed_fee_cents: number | null;
    block_after_free_limit: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BillingGlobalConfig {
    id: string;
    config_key: string;
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number;
    overage_fixed_fee_cents: number | null;
    block_after_free_limit: boolean;
    updated_at: string;
}

export interface BillingPolicy {
    id: string;
    policy_key: string;
    policy_value: string;
    description: string | null;
    updated_at: string;
}

export interface PharmacySubscription {
    id: string;
    pharmacy_id: string;
    plan_id: string;
    asaas_subscription_id: string | null;
    status: SubscriptionStatus;
    started_at: string;
    next_billing_date: string | null;
    canceled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PharmacyContract {
    id: string;
    pharmacy_id: string;
    override_monthly_fee_cents: number | null;
    override_free_orders: number | null;
    override_overage_percent_bp: number | null;
    override_overage_fixed_fee_cents: number | null;
    override_block_after_limit: boolean | null;
    valid_from: string;
    valid_until: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface BillingCycle {
    id: string;
    pharmacy_id: string;
    period_start: string;
    period_end: string;
    free_orders_used: number;
    overage_orders: number;
    overage_amount_cents: number;
    status: BillingCycleStatus;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface BillingInvoice {
    id: string;
    pharmacy_id: string;
    cycle_id: string | null;
    invoice_type: InvoiceType;
    asaas_invoice_id: string;
    amount_cents: number;
    due_date: string;
    paid_at: string | null;
    status: InvoiceStatus;
    asaas_invoice_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface BillingAuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: AuditAction;
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    changed_by: string | null;
    changed_at: string;
}

// ============================================================================
// TIPOS COMPOSTOS (com joins)
// ============================================================================

export interface PharmacySubscriptionWithPlan extends PharmacySubscription {
    plan: BillingPlan;
}

export interface BillingCycleWithPharmacy extends BillingCycle {
    pharmacy: {
        id: string;
        name: string;
        cnpj: string;
    };
}

export interface BillingInvoiceWithDetails extends BillingInvoice {
    pharmacy: {
        id: string;
        name: string;
    };
    cycle: BillingCycle | null;
}

// ============================================================================
// TIPOS DE FORMULÁRIO (para criação/edição)
// ============================================================================

export interface CreateBillingPlanInput {
    name: string;
    slug: string;
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number;
    overage_fixed_fee_cents?: number;
    block_after_free_limit: boolean;
    is_active: boolean;
}

export interface UpdateBillingPlanInput extends Partial<CreateBillingPlanInput> {
    id: string;
}

export interface CreatePharmacyContractInput {
    pharmacy_id: string;
    override_monthly_fee_cents?: number;
    override_free_orders?: number;
    override_overage_percent_bp?: number;
    override_overage_fixed_fee_cents?: number;
    override_block_after_limit?: boolean;
    valid_from: string;
    valid_until?: string;
    notes?: string;
}

export interface UpdatePharmacyContractInput extends Partial<CreatePharmacyContractInput> {
    id: string;
}

export interface ActivatePharmacyPlanInput {
    pharmacy_id: string;
    plan_id: string;
}

// ============================================================================
// TIPOS DE RESPOSTA (Edge Functions)
// ============================================================================

export interface PharmacyBillingRules {
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number;
    overage_fixed_fee_cents: number;
    block_after_free_limit: boolean;
}

export interface PharmacyBillingStatus {
    subscription: PharmacySubscriptionWithPlan | null;
    current_cycle: BillingCycle | null;
    rules: PharmacyBillingRules;
    usage: {
        free_orders_used: number;
        free_orders_limit: number;
        overage_orders: number;
        overage_amount_cents: number;
        percentage_used: number; // 0-100
        is_near_limit: boolean; // >= 80%
        is_over_limit: boolean;
    };
    invoices: {
        pending: BillingInvoice[];
        overdue: BillingInvoice[];
        total_pending_cents: number;
        total_overdue_cents: number;
    };
}

export interface AdminRevenueStats {
    mrr_cents: number; // Monthly Recurring Revenue
    current_month_overage_cents: number;
    total_active_subscriptions: number;
    total_overdue_subscriptions: number;
    overdue_percentage: number;
}

// ============================================================================
// TIPOS DE WEBHOOK (Asaas)
// ============================================================================

export interface AsaasWebhookEvent {
    event: string;
    payment?: {
        id: string;
        customer: string;
        value: number;
        netValue: number;
        dueDate: string;
        paymentDate?: string;
        status: string;
        billingType: string;
        invoiceUrl?: string;
    };
    subscription?: {
        id: string;
        customer: string;
        value: number;
        nextDueDate: string;
        cycle: string;
        status: string;
    };
}

// ============================================================================
// HELPERS DE CONVERSÃO
// ============================================================================

export const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
};

export const formatPercentage = (basisPoints: number): string => {
    return `${(basisPoints / 100).toFixed(2)}%`;
};

export const getInvoiceStatusLabel = (status: InvoiceStatus): string => {
    const labels: Record<InvoiceStatus, string> = {
        pending: 'Pendente',
        paid: 'Pago',
        overdue: 'Vencido',
        canceled: 'Cancelado',
    };
    return labels[status];
};

export const getSubscriptionStatusLabel = (status: SubscriptionStatus): string => {
    const labels: Record<SubscriptionStatus, string> = {
        active: 'Ativa',
        overdue: 'Inadimplente',
        canceled: 'Cancelada',
        pending: 'Pendente',
        pending_asaas: 'Processando Pagamento',
    };
    return labels[status];
};

export const getCycleStatusLabel = (status: BillingCycleStatus): string => {
    const labels: Record<BillingCycleStatus, string> = {
        active: 'Ativo',
        closed: 'Fechado',
        invoiced: 'Faturado',
    };
    return labels[status];
};

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export const validateBillingPlan = (input: CreateBillingPlanInput): string[] => {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
        errors.push('Nome do plano é obrigatório');
    }

    if (!input.slug || input.slug.trim().length === 0) {
        errors.push('Slug do plano é obrigatório');
    }

    if (input.monthly_fee_cents < 0) {
        errors.push('Mensalidade não pode ser negativa');
    }

    if (input.free_orders_per_period < 0) {
        errors.push('Quantidade de pedidos grátis não pode ser negativa');
    }

    if (input.overage_percent_bp < 0 || input.overage_percent_bp > 10000) {
        errors.push('Percentual de excedente deve estar entre 0% e 100%');
    }

    return errors;
};

export const validatePharmacyContract = (input: CreatePharmacyContractInput): string[] => {
    const errors: string[] = [];

    if (!input.pharmacy_id) {
        errors.push('Farmácia é obrigatória');
    }

    if (!input.valid_from) {
        errors.push('Data de início é obrigatória');
    }

    if (input.valid_until && new Date(input.valid_until) < new Date(input.valid_from)) {
        errors.push('Data de término deve ser posterior à data de início');
    }

    if (input.override_overage_percent_bp !== undefined) {
        if (input.override_overage_percent_bp < 0 || input.override_overage_percent_bp > 10000) {
            errors.push('Percentual de excedente deve estar entre 0% e 100%');
        }
    }

    return errors;
};
