
import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    duration?: number;
}

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const Toast = ({ message, type = 'info', onClose, duration = 3000 }: ToastProps) => {

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles = {
        success: 'bg-green-500 text-white shadow-green-500/30',
        error: 'bg-red-500 text-white shadow-red-500/30',
        info: 'bg-[#13ec6d] text-[#0d161b] shadow-primary/20', // Using App Primary
        warning: 'bg-amber-500 text-white shadow-amber-500/30',
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'shopping_cart',
        warning: 'warning',
    };

    return (
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all animate-fade-in-right transform hover:scale-[1.02] ${styles[type]}`}>
            <MaterialIcon name={icons[type]} className="text-xl" />
            <span className="font-black text-xs uppercase tracking-widest">{message}</span>
            <button onClick={onClose} className="ml-2 bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors">
                <MaterialIcon name="close" className="text-xs" />
            </button>
        </div>
    );
};
