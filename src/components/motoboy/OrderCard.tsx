import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

interface OrderCardProps {
    order: any;
    onAccept: (order: any) => void;
    onMoveUp?: (order: any) => void;
    onMoveDown?: (order: any) => void;
    isFirst?: boolean;
    isLast?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onAccept, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const pharmacy = order.pharmacies || {};

    return (
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-5 mb-5 hover:border-primary/50 transition-all shadow-xl group relative overflow-hidden">
            {/* Reorder Buttons (Floating top left) */}
            {(onMoveUp || onMoveDown) && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {onMoveUp && !isFirst && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMoveUp(order); }}
                            className="size-8 bg-slate-700/80 rounded-full flex items-center justify-center text-primary shadow-lg active:scale-95 cursor-pointer"
                        >
                            <MaterialIcon name="keyboard_arrow_up" />
                        </button>
                    )}
                    {onMoveDown && !isLast && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMoveDown(order); }}
                            className="size-8 bg-slate-700/80 rounded-full flex items-center justify-center text-primary shadow-lg active:scale-95 cursor-pointer"
                        >
                            <MaterialIcon name="keyboard_arrow_down" />
                        </button>
                    )}
                </div>
            )}

            <div className="flex justify-between items-start mb-5 pl-4">
                <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        {order.profiles?.full_name || order.customer_name || 'Cliente'}
                    </h3>
                    <p className="text-slate-400 text-sm flex items-center mt-1">
                        <MaterialIcon name="near_me" className="text-primary text-sm mr-1" />
                        {order.delivery_sequence ? `Sequência #${order.delivery_sequence}` : 'Próxima entrega'} • {order.distance || 'Calculando...'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-primary font-black text-2xl">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.delivery_fee || 0)}
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Seu Ganho</p>
                </div>
            </div>

            <div className="space-y-4 mb-6 relative pl-4">
                {/* Timeline Line */}
                <div className="absolute left-[25px] top-3 bottom-3 w-0.5 bg-slate-700/50 border-l border-dashed border-slate-600" />

                <div className="flex items-start gap-4">
                    <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(59,130,246,0.3)] mt-1">
                        <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coleta</p>
                        <p className="text-slate-200 font-semibold truncate leading-tight mt-0.5">{pharmacy.name || 'Farmácia'}</p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{pharmacy.address || 'Endereço da Farmácia'}</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(239,68,68,0.3)] mt-1">
                        <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entrega</p>
                        <p className="text-slate-200 font-semibold truncate leading-tight mt-0.5">Destino Final</p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{order.address}</p>
                    </div>
                </div>
            </div>

            <button
                onClick={() => onAccept(order)}
                className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
            >
                <MaterialIcon name="check_circle" className="text-xl" />
                {order.status === 'retirado' || order.status === 'em_rota' ? 'VOLTAR PARA GPS' :
                    order.status === 'aceito' ? 'IR PARA COLETA' : 'ACEITAR CORRIDA'}
            </button>
        </div>
    );
};

export default OrderCard;
