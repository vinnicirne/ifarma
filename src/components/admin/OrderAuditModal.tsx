import { useEffect, useState } from 'react';
import {
    X,
    Package,
    MapPin,
    Store,
    Clock,
    CreditCard,
    ShieldCheck,
    User,
    Hash,
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderAuditModalProps {
    orderId: string;
    onClose: () => void;
}

const OrderAuditModal = ({ orderId, onClose }: OrderAuditModalProps) => {
    const [order, setOrder] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            setLoading(true);

            // 1. Fetch Order + Pharmacy Details
            const { data: orderData, error } = await supabase
                .from('orders')
                .select(`
          *,
          pharmacies (
            name,
            address,
            logo_url
          )
        `)
                .eq('id', orderId)
                .single();

            if (orderData) {
                setOrder(orderData);

                // 2. Fetch Items + Product Names
                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select(`
            *,
            products (
              name,
              category
            )
          `)
                    .eq('order_id', orderId);

                if (itemsData) setItems(itemsData);
            }
            setLoading(false);
        };

        if (orderId) fetchOrderDetails();
    }, [orderId]);

    if (!orderId) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0a0f0d]/90 backdrop-blur-xl"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-[#111a16] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden animate-bounce-in max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="text-primary" size={28} />
                        </div>
                        <div>
                            <h3 className="text-white text-2xl font-[900] italic tracking-tight uppercase leading-none">Auditoria de Pedido</h3>
                            <p className="text-slate-500 font-bold text-[10px] tracking-widest mt-1 uppercase flex items-center gap-2">
                                <Hash size={12} className="text-primary" />
                                ID: {orderId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 p-20 flex flex-col items-center justify-center">
                        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-primary font-black italic text-xs uppercase tracking-[0.2em]">Consultando Banco...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12 hide-scrollbar">

                        {/* Status & Timing */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity size={12} className="text-primary" /> Status Atual
                                </p>
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase ${order.status === 'entregue' ? 'bg-primary text-[#0a0f0d]' : 'bg-orange-500 text-white'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Clock size={12} className="text-primary" /> Data / Hora
                                </p>
                                <p className="text-white font-black italic text-lg tracking-tight">
                                    {new Date(order.created_at).toLocaleDateString()}
                                    <span className="text-slate-500 text-sm ml-2 font-bold not-italic">
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </p>
                            </div>
                            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CreditCard size={12} className="text-primary" /> Valor Total
                                </p>
                                <p className="text-primary font-[900] italic text-2xl tracking-tighter">
                                    R$ {order.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Cliente & Entrega */}
                            <div className="space-y-6">
                                <h4 className="text-white font-black italic text-sm uppercase tracking-widest flex items-center gap-2">
                                    <User className="text-primary" size={16} /> Detalhes do Cliente
                                </h4>
                                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] space-y-4">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Nome Completo</p>
                                        <p className="text-white font-bold text-lg">{order.customer_name}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <MapPin className="text-primary shrink-0 mt-1" size={18} />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Endereço de Entrega</p>
                                            <p className="text-slate-300 text-sm leading-relaxed">{order.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Loja / Farmácia */}
                            <div className="space-y-6">
                                <h4 className="text-white font-black italic text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Store className="text-primary" size={16} /> Loja Responsável
                                </h4>
                                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] flex items-center gap-6">
                                    <div className="size-20 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
                                        {order.pharmacies?.logo_url ? (
                                            <img src={order.pharmacies.logo_url} alt={`Logo ${order.pharmacies.name}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="text-primary/20" size={40} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-black italic text-xl">{order.pharmacies?.name || 'Loja Excluída'}</p>
                                        <p className="text-slate-500 text-xs mt-1 italic font-bold">{order.pharmacies?.address || 'Sem endereço'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Itens do Pedido */}
                        <div className="space-y-6">
                            <h4 className="text-white font-black italic text-sm uppercase tracking-widest flex items-center gap-2">
                                <Package className="text-primary" size={16} /> Itens e Itinerário
                            </h4>
                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <th className="px-8 py-4">Produto</th>
                                            <th className="px-8 py-4">Qtd</th>
                                            <th className="px-8 py-4">Unitário</th>
                                            <th className="px-8 py-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {items.length > 0 ? items.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="text-white font-bold text-sm">{item.products?.name || 'Produto'}</p>
                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{item.products?.category}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-white font-black italic">{item.quantity}x</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-slate-400 text-sm font-bold">R$ {item.price}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-primary font-[900] italic text-base">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-12 text-center text-slate-500 italic font-bold">
                                                    Nenhum item registrado para este pedido.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Disclaimer de Auditoria */}
                        <div className="bg-primary/5 border border-primary/10 p-8 rounded-[32px] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="text-primary" size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm italic">Ambiente de Auditoria Seguro</p>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Logs de acesso registrados em conformidade com LGPD.</p>
                                </div>
                            </div>
                            <button className="bg-white text-slate-900 font-black text-[10px] tracking-widest uppercase px-6 py-3 rounded-xl hover:scale-105 transition-all active:scale-95">
                                Exportar PDF
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderAuditModal;
