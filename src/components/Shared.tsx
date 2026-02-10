import React from 'react';

export const MaterialIcon = ({ name, className = "", fill = false }: { name: string, className?: string, fill?: boolean }) => (
    <span className={`material-symbols-outlined ${className} ${fill ? 'FILL-1' : ''}`} style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>
        {name}
    </span>
);

export const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

export const PageHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
    <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
            {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);
