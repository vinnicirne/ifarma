import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActionConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'success' | 'warning' | 'info';
    loading?: boolean;
}

export const ActionConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'info',
    loading = false
}: ActionConfirmModalProps) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimate(true);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const styles = {
        danger: {
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            buttonBg: 'bg-red-500',
            buttonHover: 'hover:bg-red-400',
            buttonShadow: 'shadow-red-500/20'
        },
        success: {
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-500',
            buttonBg: 'bg-emerald-500',
            buttonHover: 'hover:bg-emerald-400',
            buttonShadow: 'shadow-emerald-500/20'
        },
        warning: {
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-500',
            buttonBg: 'bg-amber-500',
            buttonHover: 'hover:bg-amber-400',
            buttonShadow: 'shadow-amber-500/20'
        },
        info: {
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
            buttonBg: 'bg-blue-500',
            buttonHover: 'hover:bg-blue-400',
            buttonShadow: 'shadow-blue-500/20'
        }
    };

    const currentStyle = styles[type];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={!loading ? onClose : undefined}
            ></div>

            <div className={`relative w-full max-w-md bg-[#111a16] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col items-center text-center p-8 transition-all duration-300 ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <div className={`size-16 rounded-full ${currentStyle.iconBg} flex items-center justify-center mb-6`}>
                    {type === 'danger' && <AlertTriangle size={32} className={currentStyle.iconColor} />}
                    {type === 'success' && <CheckCircle size={32} className={currentStyle.iconColor} />}
                    {type === 'warning' && <AlertTriangle size={32} className={currentStyle.iconColor} />}
                    {type === 'info' && <Info size={32} className={currentStyle.iconColor} />}
                </div>

                <h3 className="text-white text-xl font-[900] italic uppercase tracking-tight mb-2">
                    {title}
                </h3>
                <p className="text-slate-400 font-bold text-sm leading-relaxed mb-8">
                    {description}
                </p>

                <div className="flex gap-4 w-full">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 ${currentStyle.buttonBg} ${currentStyle.buttonHover} text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all disabled:opacity-50 ${currentStyle.buttonShadow}`}
                    >
                        {loading ? 'Processando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
