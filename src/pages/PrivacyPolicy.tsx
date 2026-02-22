import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, FileText, ChevronRight, ArrowLeft, Download, Trash2, CheckCircle2 } from 'lucide-react';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [preferences, setPreferences] = useState({
        analytics: true,
        marketing: false,
        personalization: true
    });

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const sections = [
        {
            id: 'coleta',
            title: 'Coleta de Dados',
            icon: <FileText className="text-blue-500" size={20} />,
            content: 'Coletamos informações básicas como nome, e-mail, telefone e endereço de entrega para processar seus pedidos e garantir que os medicamentos cheguem ao destino correto. Dados sensíveis, como prescrições médicas, são tratados com sigilo absoluto e criptografia de ponta a ponta.'
        },
        {
            id: 'uso',
            title: 'Como Usamos',
            icon: <Eye className="text-emerald-500" size={20} />,
            content: 'Seus dados são utilizados para personalizar sua experiência, agilizar o checkout e cumprir exigências legais da ANVISA. Não vendemos suas informações para terceiros. O compartilhamento ocorre apenas com a farmácia responsável pelo seu atendimento.'
        },
        {
            id: 'seguranca',
            title: 'Segurança',
            icon: <Lock className="text-amber-500" size={20} />,
            content: 'Utilizamos infraestrutura de nível bancário com o Supabase Auth e Banco de Dados. Todas as transações são protegidas por SSL e monitoradas 24/7 contra acessos não autorizados.'
        }
    ];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-zinc-950 text-white overflow-x-hidden max-w-[480px] mx-auto shadow-2xl font-display">
            {/* Elegant Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/5"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black italic tracking-tighter leading-none">ifarma</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Privacidade</p>
                </div>
            </div>

            <div className="p-8">
                {/* Hero Section */}
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="size-20 bg-primary/10 rounded-[32px] flex items-center justify-center mb-6 border border-primary/20 shadow-xl shadow-primary/5">
                        <ShieldCheck size={40} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter mb-4 leading-tight">
                        Seus dados, <br />
                        <span className="text-primary">sua proteção.</span>
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px]">
                        Garantimos transparência total em conformidade com a LGPD para sua tranquilidade.
                    </p>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6 mb-12">
                    {sections.map((section) => (
                        <div key={section.id} className="p-6 rounded-[28px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-2 rounded-xl bg-white/5">
                                    {section.icon}
                                </div>
                                <h3 className="font-black italic text-zinc-200">{section.title}</h3>
                            </div>
                            <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Preference Controls */}
                <div className="mb-12">
                    <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-primary" /> Preferências de Controle
                    </h3>

                    <div className="bg-white/[0.03] rounded-[32px] border border-white/5 overflow-hidden">
                        <PreferenceItem
                            label="Análise de Uso"
                            description="Melhora o desempenho do app"
                            active={preferences.analytics}
                            onToggle={() => togglePreference('analytics')}
                        />
                        <PreferenceItem
                            label="Personalização"
                            description="Sugestões baseadas no seu perfil"
                            active={preferences.personalization}
                            onToggle={() => togglePreference('personalization')}
                            isFirst={false}
                        />
                        <PreferenceItem
                            label="Marketing"
                            description="Cupons e ofertas exclusivas"
                            active={preferences.marketing}
                            onToggle={() => togglePreference('marketing')}
                            isFirst={false}
                            isLast={true}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-3 mb-20">
                    <ActionButton
                        icon={<Download size={18} />}
                        label="Baixar Relatório (PDF)"
                        color="text-primary"
                    />
                    <ActionButton
                        icon={<Trash2 size={18} />}
                        label="Excluir Minha Conta"
                        color="text-red-500"
                    />
                </div>

                {/* Footer Info */}
                <div className="text-center pb-12 border-t border-white/5 pt-8">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        Versão 2.1 • Atualizado em Jan 2026
                    </p>
                    <button className="text-primary text-xs font-black italic underline-offset-4 hover:underline">
                        Ler Contrato de Serviço Completo
                    </button>
                </div>
            </div>

            {/* iOS Indicator */}
            <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full z-[60]"></div>
        </div>
    );
};

const PreferenceItem = ({ label, description, active, onToggle, isFirst = true, isLast = false }: any) => (
    <div className={`p-6 flex items-center justify-between group ${!isFirst ? 'border-t border-white/5' : ''}`}>
        <div className="pr-4">
            <h4 className="font-bold text-sm text-zinc-200 mb-0.5">{label}</h4>
            <p className="text-[10px] text-zinc-500 font-medium leading-tight">{description}</p>
        </div>
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative shrink-0 ${active ? 'bg-primary' : 'bg-white/10'}`}
        >
            <div className={`size-4 bg-zinc-950 rounded-full transition-all duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
    </div>
);

const ActionButton = ({ icon, label, color }: any) => (
    <button className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] active:scale-[0.98] transition-all group">
        <div className="flex items-center gap-4">
            <div className={`${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                {icon}
            </div>
            <span className="text-sm font-bold text-zinc-300">{label}</span>
        </div>
        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </button>
);

export default PrivacyPolicy;
