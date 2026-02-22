import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, ArrowLeft, Send, CheckCircle2, MessageSquare } from 'lucide-react';

const AccountDeletion = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        reason: '',
        confirm: false
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we simulate the request or send to WhatsApp
        const message = `SOLICITAÇÃO DE EXCLUSÃO DE CONTA\n\nE-mail: ${formData.email}\nMotivo: ${formData.reason}\nConfirmado: Sim`;
        const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        setStep(2);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-zinc-950 text-white overflow-x-hidden max-w-[480px] mx-auto shadow-2xl font-display">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/5"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-black italic tracking-tighter leading-none text-red-500 text-red-500">Excluir Conta</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">Segurança de Dados</p>
                </div>
            </div>

            <div className="p-8">
                {step === 1 ? (
                    <div className="animate-fade-in">
                        <div className="size-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mb-6 border border-red-500/20 shadow-xl shadow-red-500/5 mx-auto">
                            <ShieldAlert size={40} className="text-red-500" />
                        </div>

                        <h2 className="text-2xl font-black italic tracking-tighter mb-4 text-center">
                            Tem certeza que deseja <br />
                            <span className="text-red-500 text-red-500">excluir sua conta?</span>
                        </h2>

                        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 mb-8">
                            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                                A exclusão da conta é <span className="text-white font-bold">permanente</span> e resultará na perda de:
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-xs text-zinc-500">
                                    <Trash2 size={14} className="text-red-500" /> Historico de pedidos e notas fiscais
                                </li>
                                <li className="flex items-center gap-3 text-xs text-zinc-500">
                                    <Trash2 size={14} className="text-red-500" /> Seus endereços e cartões salvos
                                </li>
                                <li className="flex items-center gap-3 text-xs text-zinc-500">
                                    <Trash2 size={14} className="text-red-500" /> Seus favoritos e cupons de desconto
                                </li>
                            </ul>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-2">Confirme seu E-mail</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="seu-email@exemplo.com"
                                    className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/5 focus:border-red-500/50 focus:bg-white/[0.08] transition-all outline-none text-sm font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-2">Motivo da Saída (Opcional)</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Conte-nos como podemos melhorar..."
                                    className="w-full h-32 p-6 rounded-2xl bg-white/5 border border-white/5 focus:border-red-500/50 focus:bg-white/[0.08] transition-all outline-none text-sm font-bold resize-none"
                                />
                            </div>

                            <label className="flex items-start gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 cursor-pointer">
                                <input
                                    required
                                    type="checkbox"
                                    checked={formData.confirm}
                                    onChange={(e) => setFormData({ ...formData, confirm: e.target.checked })}
                                    className="mt-1 size-4 accent-red-500"
                                />
                                <span className="text-[11px] text-zinc-400 font-medium leading-tight">
                                    Compreendo que este processo é irreversível e meus dados serão anonimizados conforme a LGPD em até 30 dias.
                                </span>
                            </label>

                            <button
                                type="submit"
                                className="w-full h-16 rounded-[24px] bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest"
                            >
                                <Send size={18} /> Solicitar Exclusão
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="animate-fade-in py-12 text-center">
                        <div className="size-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center mb-6 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 mx-auto">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black italic tracking-tighter mb-4">
                            Solicitação <br />
                            <span className="text-emerald-500">Enviada!</span>
                        </h2>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-10 px-4">
                            Sua solicitação foi registrada. Um representante entrará em contato em breve para confirmar a identidade e finalizar o processo.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                )}
            </div>

            {/* Support section */}
            <div className="p-8 pt-0">
                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                    <MessageSquare size={24} className="text-blue-500" />
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">Dúvidas?</h4>
                        <p className="text-[10px] text-zinc-500 font-bold">Fale com nosso DPO/Encarregado de Dados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountDeletion;
