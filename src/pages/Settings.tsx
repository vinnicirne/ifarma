import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { NavigationDrawer } from '../components/layout/NavigationDrawer';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const Settings = ({ session }: { session: any }) => {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Simple mock for settings persistence
        const storedNotif = localStorage.getItem('notifications') === 'true';
        const storedDark = localStorage.getItem('theme') === 'dark';
        setNotificationsEnabled(storedNotif);
        setDarkMode(storedDark);
    }, []);

    const toggleNotifications = () => {
        const newVal = !notificationsEnabled;
        setNotificationsEnabled(newVal);
        localStorage.setItem('notifications', String(newVal));
    };

    const toggleTheme = () => {
        const newVal = !darkMode;
        setDarkMode(newVal);
        localStorage.setItem('theme', newVal ? 'dark' : 'light');
        if (newVal) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const SettingItem = ({ icon, label, type, value, onClick, description }: any) => (
        <div
            onClick={type === 'link' ? onClick : undefined}
            className="flex items-center justify-between p-4 bg-white dark:bg-[#1a2e23] border border-slate-100 dark:border-white/5 rounded-2xl mb-3 active:scale-[0.99] transition-transform cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <MaterialIcon name={icon} className="text-xl" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{label}</h4>
                    {description && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{description}</p>}
                </div>
            </div>

            {type === 'toggle' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${value ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                >
                    <div className={`size-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            )}

            {type === 'link' && (
                <MaterialIcon name="chevron_right" className="text-slate-400" />
            )}
        </div>
    );

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display pb-10 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white"
                    >
                        <MaterialIcon name="menu" className="text-2xl" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Configurações</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} session={session} />

            <main className="max-w-lg mx-auto p-4">
                <section className="mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Geral</h3>
                    <SettingItem
                        icon="notifications"
                        label="Notificações Push"
                        description="Receber alertas de pedidos e ofertas"
                        type="toggle"
                        value={notificationsEnabled}
                        onClick={toggleNotifications}
                    />
                    <SettingItem
                        icon="dark_mode"
                        label="Modo Escuro"
                        description="Alternar entre tema claro e escuro"
                        type="toggle"
                        value={darkMode}
                        onClick={toggleTheme}
                    />
                </section>

                <section className="mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Conta</h3>
                    <SettingItem
                        icon="person"
                        label="Editar Perfil"
                        type="link"
                        onClick={() => navigate('/profile')}
                    />
                    <SettingItem
                        icon="location_on"
                        label="Meus Endereços"
                        type="link"
                        onClick={() => navigate('/profile')}
                    />
                </section>

                <section className="mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Sobre</h3>
                    <SettingItem
                        icon="policy"
                        label="Política de Privacidade"
                        type="link"
                        onClick={() => navigate('/privacy')}
                    />
                    <SettingItem
                        icon="description"
                        label="Termos de Uso"
                        type="link"
                        onClick={() => navigate('/terms')}
                    />
                    <div className="mt-8 flex flex-col items-center justify-center opacity-40">
                        <img src="/logo-icon.png" alt="Ifarma" className="size-12 mb-2 grayscale" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <p className="text-xs font-bold text-slate-500">Versão 1.0.0 (Beta)</p>
                        <p className="text-[10px] text-slate-400">Build 2026.02.11</p>
                    </div>
                </section>
            </main>
        </div>
    );
};
