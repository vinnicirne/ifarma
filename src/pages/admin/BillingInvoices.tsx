import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    FileText,
    Search,
    Filter,
    Download,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    ArrowUpRight,
    CreditCard
} from 'lucide-react';
import { formatCurrency, getInvoiceStatusLabel } from '../../types/billing';
import { toast } from 'react-hot-toast';

interface InvoiceWithPharmacy {
    id: string;
    pharmacy_id: string;
    invoice_type: 'monthly_fee' | 'overage';
    asaas_invoice_id: string;
    amount_cents: number;
    due_date: string;
    paid_at: string | null;
    status: 'pending' | 'paid' | 'overdue' | 'canceled';
    asaas_invoice_url: string | null;
    created_at: string;
    pharmacy: {
        name: string;
        logo_url: string | null;
    };
}

const BillingInvoices = () => {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<InvoiceWithPharmacy[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('billing_invoices')
                .select('*, pharmacy:pharmacies(name, logo_url)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error: any) {
            toast.error(`Erro ao carregar faturas: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.pharmacy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.asaas_invoice_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle2 size={14} className="text-primary" />;
            case 'pending': return <Clock size={14} className="text-amber-500" />;
            case 'overdue': return <AlertCircle size={14} className="text-red-500" />;
            default: return <Clock size={14} className="text-slate-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-primary/10 text-primary border-primary/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-white/5 text-slate-400 border-white/10';
        }
    };

    return (
        <div className="space-y-10 animate-slide-up pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-tight leading-none uppercase">Central de Faturamento</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Gestão global de cobranças e faturas Asaas.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-[#111a16] border border-white/5 rounded-2xl p-2 flex items-center gap-4">
                        <div className="flex flex-col items-end px-4">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total em Aberto</span>
                            <span className="text-white font-[900] italic text-sm">
                                {formatCurrency(invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.amount_cents, 0))}
                            </span>
                        </div>
                        <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                            <CreditCard size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por farmácia ou ID da fatura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#111a16] border border-white/5 rounded-[24px] pl-14 pr-6 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                    />
                </div>
                <div className="md:col-span-4 flex gap-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 bg-[#111a16] border border-white/5 rounded-[24px] px-6 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 appearance-none cursor-pointer"
                    >
                        <option value="all">Todos Status</option>
                        <option value="paid">Pagos</option>
                        <option value="pending">Pendentes</option>
                        <option value="overdue">Vencidos</option>
                    </select>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-[#111a16] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-black/20">
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Parceiro</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo / Vencimento</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Total</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4 animate-pulse">
                                            <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                            <p className="text-primary font-black text-[10px] uppercase tracking-widest">Acessando Banco de Dados Asaas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="p-8">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-[#0a0f0d] border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/20 transition-all">
                                                {invoice.pharmacy.logo_url ? (
                                                    <img src={invoice.pharmacy.logo_url} alt={`Logo ${invoice.pharmacy.name}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText size={20} className="text-slate-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-[900] italic text-white leading-none uppercase tracking-tight">{invoice.pharmacy.name}</h4>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                    ID: {invoice.asaas_invoice_id}
                                                    <span className="size-1 rounded-full bg-white/10"></span>
                                                    Gerada em {new Date(invoice.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                {invoice.invoice_type === 'monthly_fee' ? 'Assinatura Mensal' : 'Limite Excedente'}
                                            </span>
                                            <p className="text-white font-[900] italic text-xs uppercase tracking-tight flex items-center gap-2">
                                                <Clock size={12} className="text-primary" />
                                                Vence {new Date(invoice.due_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-xl font-[900] italic text-white tracking-tighter leading-none">
                                            {formatCurrency(invoice.amount_cents)}
                                        </p>
                                    </td>
                                    <td className="p-8">
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(invoice.status)}`}>
                                            {getStatusIcon(invoice.status)}
                                            {getInvoiceStatusLabel(invoice.status)}
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <a
                                                href={invoice.asaas_invoice_url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="size-10 bg-white/5 hover:bg-primary text-slate-400 hover:text-[#0a0f0d] rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                            <button className="size-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="size-16 rounded-[24px] bg-white/5 flex items-center justify-center mb-2">
                                                <FileText size={32} className="text-slate-700" />
                                            </div>
                                            <h4 className="text-white font-[900] italic text-lg uppercase tracking-tight">Vazio Absoluto</h4>
                                            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest max-w-xs">Nenhuma fatura encontrada com os filtros atuais.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingInvoices;
