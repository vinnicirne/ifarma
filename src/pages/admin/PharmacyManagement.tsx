import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { pharmacyService } from '../../api/pharmacyService';
import type { Pharmacy } from '../../types/pharmacy';
import {
    Search,
    Filter,
    Store,
    Plus,
    Eye,
    Trash2,
    ShieldCheck,
    Clock,
    AlertTriangle,
    ChevronRight,
    ArrowUpRight,
    CheckCircle2,
    XCircle
} from 'lucide-react';

const PharmacyManagement = () => {
    const navigate = useNavigate();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Pendente' | 'Aprovado' | 'SemPlano'>('all');

    const fetchPharmacies = async () => {
        setLoading(true);
        try {
            const data = await pharmacyService.getPharmacies();
            setPharmacies(data);
        } catch (error) {
            console.error('Error fetching pharmacies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPharmacies();
    }, []);

    const [successModal, setSuccessModal] = useState<{ open: boolean, email?: string, password?: string }>({ open: false });

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Deseja APROVAR esta farmácia e gerar as credenciais de acesso do lojista?')) {
            try {
                setLoading(true);
                const result = await pharmacyService.approvePharmacy(id);
                setSuccessModal({
                    open: true,
                    email: result.email,
                    password: result.password
                });
                fetchPharmacies();
            } catch (error: any) {
                alert(`Erro ao aprovar: ${error.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir esta farmácia? Isso removerá o login de acesso também.')) {
            try {
                setLoading(true);
                await pharmacyService.deletePharmacy(id);
                fetchPharmacies();
            } catch (error: any) {
                alert("Erro ao excluir: " + error.message);
                setLoading(false);
            }
        }
    };

    const handleToggleStore = async (pharm: Pharmacy, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = !pharm.is_open;
        setPharmacies(prev => prev.map(p => p.id === pharm.id ? { ...p, is_open: newStatus } : p));
        try {
            await pharmacyService.updatePharmacyStatus(pharm.id, newStatus);
        } catch (error) {
            alert('Erro ao atualizar status da loja');
            fetchPharmacies();
        }
    };

    const filteredPharmacies = pharmacies.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.owner_email && p.owner_email.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesFilter = true;
        if (filterStatus === 'Pendente') matchesFilter = p.status === 'Pendente';
        if (filterStatus === 'Aprovado') matchesFilter = p.status === 'Aprovado';
        if (filterStatus === 'SemPlano') matchesFilter = !p.plan || p.plan === 'Gratuito';

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-10 animate-slide-up pb-20">
            {/* Success Modal */}
            {successModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-[#111a16] border border-white/10 p-10 rounded-[40px] shadow-2xl max-w-md w-full relative">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="size-20 bg-primary/20 rounded-[30px] flex items-center justify-center shadow-lg shadow-primary/20">
                                <CheckCircle2 size={40} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-[900] italic text-white tracking-tighter uppercase">Parceiro Ativo!</h2>
                                <p className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Acesso gerado com sucesso</p>
                            </div>

                            <div className="w-full bg-white/5 p-6 rounded-[24px] border border-white/5 space-y-4 text-left">
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">E-mail de Acesso</span>
                                    <code className="text-sm font-bold text-white select-all">{successModal.email}</code>
                                </div>
                                {successModal.password && (
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">Senha Provisória</span>
                                        <code className="text-xl font-[900] italic text-primary select-all tracking-wider">{successModal.password}</code>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setSuccessModal({ open: false })}
                                className="w-full bg-primary hover:bg-primary/90 text-[#0a0f0d] h-14 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-none uppercase leading-none">Gestão de Parceiros</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Controle total sobre farmácias e faturamento.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard/pharmacy/new')}
                        className="bg-primary hover:bg-primary/90 text-[#0a0f0d] h-14 px-8 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/10"
                    >
                        <Store size={18} />
                        Nova Farmácia
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar farmácia, dono ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-16 bg-[#111a16] border border-white/5 rounded-[28px] pl-16 pr-6 py-4 text-sm text-white font-bold outline-none focus:border-primary/30 focus:bg-primary/[0.02] transition-all placeholder:text-slate-600 shadow-inner"
                    />
                </div>
                <div className="md:col-span-4 flex gap-3 h-16">
                    {[
                        { id: 'all', label: 'Tudo', icon: ShieldCheck },
                        { id: 'Pendente', label: 'Pendentes', icon: Clock },
                        { id: 'SemPlano', label: 'Sem Plano', icon: AlertTriangle }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilterStatus(f.id as any)}
                            className={`flex-1 rounded-[24px] flex flex-col md:flex-row items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all px-2 ${filterStatus === f.id
                                ? 'bg-primary text-[#0a0f0d] shadow-lg shadow-primary/20 scale-105 z-10'
                                : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'}`}
                        >
                            <f.icon size={14} className={filterStatus === f.id ? 'animate-pulse' : ''} />
                            <span className="hidden sm:inline-block">{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Pharmacies Grid/List */}
            <div className="bg-[#111a16] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-primary/50 text-left">Farmácia / Gestor</th>
                                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-primary/50 text-left">Vínculo / Plano</th>
                                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-primary/50 text-left">Operacional</th>
                                <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-primary/50 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-4 animate-pulse">
                                            <div className="size-14 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
                                            <span className="text-primary font-black uppercase tracking-widest text-[10px]">Carregando Parceiros...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPharmacies.length > 0 ? filteredPharmacies.map((pharm) => (
                                <tr
                                    key={pharm.id}
                                    onClick={() => navigate(`/dashboard/pharmacy/${pharm.id}`)}
                                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                                >
                                    <td className="p-8">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-[#0a0f0d] border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/20 transition-all">
                                                {pharm.logo_url ? (
                                                    <img src={pharm.logo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store size={24} className="text-slate-700" />
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-sm font-[900] italic text-white leading-none uppercase tracking-tight group-hover:text-primary transition-colors">{pharm.name}</h4>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    {pharm.address || 'Sem endereço'}
                                                    {pharm.owner_email && (
                                                        <>
                                                            <span className="size-1 rounded-full bg-white/10"></span>
                                                            <span className="text-slate-600 font-medium italic lowercase">{pharm.owner_email}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col gap-2">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${pharm.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                pharm.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                <div className={`size-1.5 rounded-full ${pharm.status === 'Aprovado' ? 'bg-emerald-500' : pharm.status === 'Pendente' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                                {pharm.status || 'Pendente'}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 px-1 uppercase tracking-widest flex items-center gap-2">
                                                {pharm.plan === 'Premium' ? <ShieldCheck size={12} className="text-primary" /> : <Clock size={12} />}
                                                {pharm.plan || 'Gratuito'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-8" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleToggleStore(pharm, e)}
                                            className={`h-11 px-5 rounded-[18px] flex items-center gap-3 transition-all ${pharm.is_open
                                                ? 'bg-primary text-[#0a0f0d] shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-slate-500 grayscale opacity-60'
                                                }`}
                                        >
                                            <div className={`size-2 rounded-full ${pharm.is_open ? 'bg-[#0a0f0d] animate-pulse' : 'bg-slate-500'}`}></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                                                {pharm.is_open ? 'Aberta' : 'Fechada'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                                            {pharm.status !== 'Aprovado' && (
                                                <button
                                                    onClick={(e) => handleApprove(pharm.id, e)}
                                                    className="h-11 px-5 rounded-2xl bg-primary/20 hover:bg-primary text-primary hover:text-[#0a0f0d] flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest border border-primary/20"
                                                    title="Aprovar Agora"
                                                >
                                                    <ShieldCheck size={16} />
                                                    Aprovar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => navigate(`/dashboard/pharmacy/${pharm.id}`)}
                                                className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
                                                title="Ver Detalhes"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(pharm.id, e)}
                                                className="size-11 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all border border-red-500/10"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="size-20 bg-white/5 rounded-[30px] flex items-center justify-center text-slate-700 mb-4">
                                                <Store size={40} />
                                            </div>
                                            <h4 className="text-white font-[900] italic text-xl uppercase tracking-tight">Nenhuma Farmácia Encontrada</h4>
                                            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest max-w-xs">Tente ajustar seus filtros ou pesquisar por outro termo.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PharmacyManagement;
