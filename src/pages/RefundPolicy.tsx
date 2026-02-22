import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, ShieldAlert, Truck, CreditCard, ArrowLeft, ChevronRight, HelpCircle, CheckCircle2, MessageCircle } from 'lucide-react';

const RefundPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: 'balcao',
            title: 'Natureza: Compra de Balcão',
            icon: <ShieldAlert className="text-blue-500" size={20} />,
            content: 'As transações realizadas via Ifarma são consideradas "compras de balcão" mediadas por tecnologia. Por segurança sanitária, uma vez que o produto sai do controle da farmácia, não há garantia de armazenamento adequado, impossibilitando o retorno ao estoque.'
        },
        {
            id: 'controlados',
            title: 'Controlados & Antibióticos',
            icon: <RefreshCcw className="text-red-500" size={20} />,
            content: 'Conforme RDC 20/2011 e Portaria 344/98 da ANVISA, é expressamente proibida a devolução de medicamentos controlados ou antimicrobianos. Estes itens não podem ser reintegrados ao estoque para revenda sob nenhuma hipótese.'
        },
        {
            id: 'refrigerados',
            title: 'Produtos Refrigerados',
            icon: <Truck className="text-cyan-500" size={20} />,
            content: 'Medicamentos que exigem refrigeração (cadeia de frio) não são passíveis de troca ou devolução. A farmácia não pode garantir a manutenção da temperatura exigida após a entrega ao consumidor.'
        },
        {
            id: 'arrependimento',
            title: 'Direito de Arrependimento',
            icon: <HelpCircle className="text-amber-500" size={20} />,
            content: 'Diferente de produtos duráveis, medicamentos não possuem direito de arrependimento de 7 dias para simples troca, salvo política específica da farmácia parceira, devido ao risco sanitário e normas de saúde pública.'
        },
        {
            id: 'qualidade',
            title: 'Desvio de Qualidade',
            icon: <CheckCircle2 className="text-emerald-500" size={20} />,
            content: 'A troca é obrigatória apenas em casos de desvio de qualidade (lacre rompido na entrega, avaria, validade vencida ou erro de expedição), conforme Art. 18 do CDC, mediada pela análise técnica do farmacêutico.'
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Legislação Sanitária</p>
                </div>
            </div>

            <div className="p-8">
                {/* Hero Section */}
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="size-20 bg-primary/10 rounded-[32px] flex items-center justify-center mb-6 border border-primary/20 shadow-xl shadow-primary/5">
                        <ShieldAlert size={40} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter mb-4 leading-tight">
                        Segurança & <br />
                        <span className="text-primary">Normas ANVISA.</span>
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px]">
                        Nossa política de devolução é rigorosa para garantir que você nunca receba um remédio de procedência duvidosa.
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
                            <p className="text-zinc-500 text-[11px] leading-relaxed font-medium">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Support Section */}
                <div className="mb-12">
                    <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                        <MessageCircle size={12} className="text-primary" /> Dúvidas Farmacêuticas?
                    </h3>

                    <div className="bg-white/[0.03] rounded-[32px] border border-white/5 p-6 text-center">
                        <p className="text-sm font-bold text-zinc-300 mb-4">
                            Em caso de dúvidas sobre medicamentos, consulte sempre o farmacêutico responsável da unidade de origem.
                        </p>
                        <button
                            onClick={() => navigate('/help')}
                            className="w-full py-4 rounded-2xl bg-zinc-900 border border-white/10 text-white font-black italic flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/5"
                        >
                            <HelpCircle size={18} />
                            CENTRAL DE AJUDA
                        </button>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="text-center pb-12 border-t border-white/5 pt-8">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
                        Fundamentação Legal: RDC 20/2011, RDC 44/2009 e Portaria 344/98.
                    </p>
                    <p className="text-[10px] text-zinc-500 max-w-[280px] mx-auto leading-tight italic">
                        App Ifarma - Intermediação de Vendas Ltda. CNPJ: 42.393.094/0001-56. O Ifarma não é uma farmácia, mas sim uma plataforma de tecnologia que conecta consumidores a estabelecimentos farmacêuticos devidamente licenciados.
                    </p>
                </div>
            </div>

            {/* iOS Indicator */}
            <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full z-[60]"></div>
        </div>
    );
};

export default RefundPolicy;
