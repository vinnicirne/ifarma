import React, { useState } from 'react';

interface OrderCancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    userRole: 'customer' | 'pharmacy';
}

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const OrderCancellationModal: React.FC<OrderCancellationModalProps> = ({ isOpen, onClose, onConfirm, userRole }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const commonReasons = userRole === 'customer'
        ? ['Desisti da compra', 'Endereço incorreto', 'Esqueci de aplicar cupom', 'Demora muito para entregar', 'Outro']
        : ['Produtos sem estoque', 'Fora da área de entrega', 'Endereço não localizado', 'Problema técnico', 'Outro'];

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!reason) {
            alert('Por favor, selecione ou informe um motivo.');
            return;
        }
        setLoading(true);
        onConfirm(reason);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight">Cancelar Pedido</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <MaterialIcon name="close" className="text-slate-500" />
                    </button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-bold uppercase tracking-widest">
                    Por que você deseja cancelar este pedido?
                </p>

                <div className="space-y-3 mb-8">
                    {commonReasons.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => setReason(r)}
                            className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-black transition-all border outline-none ${reason === r
                                    ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/10'
                                    : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-white/10'
                                }`}
                        >
                            {r}
                        </button>
                    ))}

                    {reason === 'Outro' && (
                        <textarea
                            className="w-full mt-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold placeholder:font-normal"
                            placeholder="Descreva o motivo..."
                            rows={3}
                            onChange={(e) => {
                                // Keep 'Outro' but allow custom text if needed? 
                                // Actually let's just use the textarea value if 'Outro' is active.
                            }}
                            onBlur={(e) => setReason(e.target.value || 'Outro')}
                        />
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Voltar
                    </button>
                    <button
                        disabled={!reason || loading}
                        onClick={handleConfirm}
                        className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {loading ? 'Processando...' : 'Confirmar Cancelamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};
