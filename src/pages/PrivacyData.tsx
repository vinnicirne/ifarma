import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const PrivacyData = () => {
    const navigate = useNavigate();
    const [preferences, setPreferences] = useState({
        shareData: true,
        emailOffers: false,
        cookies: true
    });

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden max-w-[430px] mx-auto shadow-2xl font-display transition-colors duration-200">
            {/* TopAppBar */}
            <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-900 dark:text-white flex size-12 shrink-0 items-center cursor-pointer active:scale-90 transition-transform"
                >
                    <MaterialIcon name="arrow_back_ios" />
                </button>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Privacidade e Dados</h2>
            </div>

            <div className="flex flex-col flex-1 px-4">
                {/* Headline & LGPD Intro */}
                <h3 className="text-gray-900 dark:text-white tracking-tight text-2xl font-bold leading-tight pb-2 pt-6">Sua privacidade é nossa prioridade</h3>
                <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal pb-6">
                    Em conformidade com a LGPD, garantimos total transparência sobre o uso dos seus dados para oferecer a melhor experiência em saúde. Controle abaixo como suas informações são tratadas.
                </p>

                {/* Section: Preferências de Privacidade */}
                <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-3 pt-4">Preferências de Privacidade</h3>
                <div className="space-y-3">
                    {/* ListItem: Compartilhar dados */}
                    <div className="flex items-center gap-4 bg-white/50 dark:bg-[#1c2230] rounded-xl px-4 min-h-[80px] py-3 justify-between">
                        <div className="flex flex-col justify-center">
                            <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">Compartilhar dados com farmácias</p>
                            <p className="text-gray-500 dark:text-[#93a5c8] text-sm font-normal leading-normal">Permite que farmácias vejam seu histórico para sugestões personalizadas</p>
                        </div>
                        <div className="shrink-0">
                            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors ${preferences.shareData ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-[#243047] justify-start'}`}>
                                <div className="h-[27px] w-[27px] rounded-full bg-white shadow-md"></div>
                                <input
                                    type="checkbox"
                                    className="invisible absolute"
                                    checked={preferences.shareData}
                                    onChange={() => togglePreference('shareData')}
                                />
                            </label>
                        </div>
                    </div>

                    {/* ListItem: Ofertas por e-mail */}
                    <div className="flex items-center gap-4 bg-white/50 dark:bg-[#1c2230] rounded-xl px-4 min-h-[80px] py-3 justify-between">
                        <div className="flex flex-col justify-center">
                            <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">Receber ofertas por e-mail</p>
                            <p className="text-gray-500 dark:text-[#93a5c8] text-sm font-normal leading-normal">Envio de promoções e cupons exclusivos baseados no seu perfil</p>
                        </div>
                        <div className="shrink-0">
                            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors ${preferences.emailOffers ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-[#243047] justify-start'}`}>
                                <div className="h-[27px] w-[27px] rounded-full bg-white shadow-md"></div>
                                <input
                                    type="checkbox"
                                    className="invisible absolute"
                                    checked={preferences.emailOffers}
                                    onChange={() => togglePreference('emailOffers')}
                                />
                            </label>
                        </div>
                    </div>

                    {/* ListItem: Cookies */}
                    <div className="flex items-center gap-4 bg-white/50 dark:bg-[#1c2230] rounded-xl px-4 min-h-[80px] py-3 justify-between">
                        <div className="flex flex-col justify-center">
                            <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">Uso de Cookies</p>
                            <p className="text-gray-500 dark:text-[#93a5c8] text-sm font-normal leading-normal">Utilizamos cookies para melhorar a navegação e segurança do app</p>
                        </div>
                        <div className="shrink-0">
                            <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-colors ${preferences.cookies ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-[#243047] justify-start'}`}>
                                <div className="h-[27px] w-[27px] rounded-full bg-white shadow-md"></div>
                                <input
                                    type="checkbox"
                                    className="invisible absolute"
                                    checked={preferences.cookies}
                                    onChange={() => togglePreference('cookies')}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section: Seus Direitos */}
                <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-3 pt-8">Seus Direitos e Dados</h3>
                <div className="flex flex-col gap-3 pb-10">
                    {/* Action: Download Report */}
                    <button className="flex items-center gap-4 bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-gray-800 rounded-xl px-4 h-16 w-full text-left active:scale-95 transition-transform hover:border-primary/50">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <MaterialIcon name="download" />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-gray-900 dark:text-white font-medium">Baixar meu Relatório de Dados</span>
                            <span className="text-xs text-gray-500">Formato PDF ou JSON</span>
                        </div>
                        <MaterialIcon name="chevron_right" className="text-gray-400" />
                    </button>

                    {/* Action: Delete Account */}
                    <button className="flex items-center gap-4 bg-white dark:bg-[#1c2230] border border-gray-200 dark:border-gray-800 rounded-xl px-4 h-16 w-full text-left active:scale-95 transition-transform hover:border-red-500/50">
                        <div className="bg-red-500/10 p-2 rounded-lg text-red-500">
                            <MaterialIcon name="delete_forever" />
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-red-500 font-medium">Solicitar Exclusão de Dados</span>
                            <span className="text-xs text-gray-500">Esta ação é irreversível</span>
                        </div>
                        <MaterialIcon name="chevron_right" className="text-gray-400" />
                    </button>
                </div>

                {/* Policy Link Footer */}
                <div className="mt-auto py-8 text-center border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Última atualização: 24 de Maio de 2024
                    </p>
                    <a className="text-primary text-sm font-semibold hover:underline cursor-pointer">Ver Política de Privacidade Completa</a>
                </div>
            </div>

            {/* iOS Bottom Bar Indicator */}
            <div className="flex justify-center pb-2 pt-4">
                <div className="w-32 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
        </div>
    );
};

export default PrivacyData;
