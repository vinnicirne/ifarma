import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, ShieldAlert, Truck, CreditCard, ArrowLeft, ChevronRight, HelpCircle, CheckCircle2, MessageCircle } from 'lucide-react';

const RefundPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: 'arrependimento',
            title: 'Direito de Arrependimento',
            icon: <RefreshCcw className="text-blue-500" size={20} />,
            content: 'De acordo com o CDC, você tem até 7 dias corridos após o recebimento para solicitar a devolução por arrependimento. O produto deve estar lacrado, na embalagem original e sem indícios de uso.'
        },
        {
            id: 'excecoes',
            title: 'Exceções Importantes',
            icon: <ShieldAlert className="text-amber-500" size={20} />,
            content: 'Produtos perecíveis, medicamentos controlados (Portaria 344/98) ou itens com lacre de segurança rompido não podem ser devolvidos, exceto por erro de expedição ou defeito de fabricação.'
        },
        {
            id: 'defeitos',
            title: 'Produtos Danificados',
            icon: <Truck className="text-emerald-500" size={20} />,
            content: 'Se o seu pedido chegou com embalagem aberta, avariado ou em desacordo com o solicitado, recuse o recebimento ou entre em contato conosco em até 24 horas para providenciarmos a troca sem custos.'
        },
        {
            id: 'reembolso',
            title: 'Métodos de Estorno',
            icon: <CreditCard className="text-purple-500" size={20} />,
            content: 'O estorno será realizado pelo mesmo método de pagamento. PIX é processado em até 24h após a validação. Cartão de crédito depende da operadora (geralmente em até 2 faturas).'
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Reembolso</p>
                </div>
            </div>

            <div className="p-8">
                {/* Hero Section */}
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="size-20 bg-primary/10 rounded-[32px] flex items-center justify-center mb-6 border border-primary/20 shadow-xl shadow-primary/5">
                        <RefreshCcw size={40} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter mb-4 leading-tight">
                        Transparência no <br />
                        <span className="text-primary">seu reembolso.</span>
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px]">
                        Regras claras e justas para garantir a melhor experiência de compra e segurança.
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

                {/* Help Section */}
                <div className="mb-12">
                    <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                        <HelpCircle size={12} className="text-primary" /> Precisa de Ajuda?
                    </h3>

                    <div className="bg-white/[0.03] rounded-[32px] border border-white/5 p-6 text-center">
                        <p className="text-sm font-bold text-zinc-300 mb-4">
                            Nossa equipe está pronta para resolver seu problema agora mesmo.
                        </p>
                        <button
                            onClick={() => navigate('/help')}
                            className="w-full py-4 rounded-2xl bg-primary text-zinc-950 font-black italic flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 hover:brightness-110"
                        >
                            <MessageCircle size={18} />
                            FALAR COM SUPORTE
                        </button>
                    </div>
                </div>

                {/* Quick Reference */}
                <div className="space-y-3 mb-20">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <CheckCircle2 size={16} className="text-primary" />
                        <span className="text-xs font-bold text-zinc-400">Prazo de 7 dias para devolução</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <CheckCircle2 size={16} className="text-primary" />
                        <span className="text-xs font-bold text-zinc-400">Estorno PIX em até 24 horas</span>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="text-center pb-12 border-t border-white/5 pt-8">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        Versão 1.0 • Atualizado em Fev 2026
                    </p>
                    <p className="text-[10px] text-zinc-500 max-w-[200px] mx-auto leading-tight">
                        App Ifarma - Intermediação de Vendas Ltda. CNPJ: 00.000.000/0001-00
                    </p>
                </div>
            </div>

            {/* iOS Indicator */}
            <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full z-[60]"></div>
        </div>
    );
};

export default RefundPolicy;
