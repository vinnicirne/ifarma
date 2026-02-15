import React, { useEffect, useState } from 'react';
import { MaterialIcon } from './Shared';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
}

export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'info'
}: ConfirmModalProps) => {
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
        info: {
            icon: 'info',
            color: 'text-blue-500',
            bg: 'bg-blue-500',
            lightBg: 'bg-blue-500/10'
        },
        warning: {
            icon: 'warning',
            color: 'text-orange-500',
            bg: 'bg-orange-500',
            lightBg: 'bg-orange-500/10'
        },
        danger: {
            icon: 'error',
            color: 'text-red-500',
            bg: 'bg-red-500',
            lightBg: 'bg-red-500/10'
        },
        success: {
            icon: 'check_circle',
            color: 'text-green-500',
            bg: 'bg-green-500',
            lightBg: 'bg-green-500/10'
        }
    };

    const currentStyle = styles[type];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            <div className={`relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 transition-all duration-300 ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <div className={`size-14 rounded-2xl ${currentStyle.lightBg} flex items-center justify-center mb-4 mx-auto`}>
                    <MaterialIcon name={currentStyle.icon} className={`text-3xl ${currentStyle.color}`} />
                </div>

                <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">
                    {title}
                </h3>

                <p className="text-sm font-medium text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    {description}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 ${currentStyle.bg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
