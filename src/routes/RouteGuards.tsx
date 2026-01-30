import React from 'react';
import { Link } from 'react-router-dom';
import { Auth } from '../components/auth/Auth';
import MerchantLogin from '../pages/merchant/MerchantLogin';
import { MaterialIcon } from '../components/Shared';

export const AdminRoute = ({ children, session, profile }: { children: React.ReactNode, session: any, profile: any }) => {
    if (!session) return <Auth view="login" />;
    if (profile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
                <MaterialIcon name="block" className="text-red-500 text-6xl mb-4" />
                <h2 className="text-xl font-black italic text-white">Acesso Negado</h2>
                <p className="text-slate-400 text-sm mt-2 max-w-xs">Esta área é restrita para administradores da plataforma.</p>
                <Link to="/" className="mt-8 text-primary font-black uppercase tracking-widest text-xs hover:underline">Voltar para a Home</Link>
            </div>
        );
    }
    return <>{children}</>;
};

export const ProtectedRoute = ({ children, session }: { children: React.ReactNode, session: any }) => {
    if (!session) return <Auth view="login" />;
    return <>{children}</>;
};

export const GestorRoute = ({ children, session, profile }: { children: React.ReactNode, session: any, profile: any }) => {
    if (!session) return <MerchantLogin />;
    // Check if role is 'merchant' OR 'admin' (admins can view merchant panels for support)
    if (profile?.role !== 'merchant' && profile?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
                <div className="size-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <MaterialIcon name="store_off" className="text-red-500 text-4xl" />
                </div>
                <h2 className="text-2xl font-black italic text-slate-900 dark:text-white">Acesso Restrito</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs font-medium">
                    Esta área é exclusiva para parceiros gestores.
                </p>
                <div className="mt-8 flex gap-4">
                    <Link to="/gestor/login" className="px-6 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                        Trocar Conta
                    </Link>
                    <Link to="/" className="px-6 py-3 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                        Voltar para Loja
                    </Link>
                </div>
            </div>
        );
    }
    return <>{children}</>;
};
