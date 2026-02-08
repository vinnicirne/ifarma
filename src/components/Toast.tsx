
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
        info: 'bg-blue-500 text-white shadow-blue-500/30',
        warning: 'bg-orange-500 text-white shadow-orange-500/30',
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning',
    };

    return (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all animate-fade-in-left ${styles[type]}`}>
            <MaterialIcon name={icons[type]} className="text-xl" />
            <span className="font-bold text-sm tracking-wide">{message}</span>
            <button onClick={onClose} className="ml-2 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors">
                <MaterialIcon name="close" className="text-sm" />
            </button>
        </div>
    );
};
