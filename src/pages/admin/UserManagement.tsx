import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { ActionConfirmModal } from '../../components/admin/ActionConfirmModal';

export const UserManagement = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'customer' | 'merchant'>('customer');
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Configuração do modal de confirmação/feedback
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        type: 'danger' | 'warning' | 'success' | 'info';
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
        loading?: boolean;
    } | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        cpf: '',
        phone: '',
        role: 'customer' as 'customer' | 'merchant' | 'motoboy' | 'admin',
        is_active: true,
        password: ''
    });

    useEffect(() => {
        fetchUsers();
    }, [activeTab, searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('role', activeTab);

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }

            const { data, count, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar usuários:', error);
                throw error;
            }

            if (data) {
                setUsers(data);
                setTotalCount(count || 0);
            }
        } catch (error: any) {
            // Silently handle error or show minimalist feedback
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csv = [
            ['Nome', 'Email', 'CPF', 'Telefone', 'Status', 'Data de Cadastro'],
            ...users.map(u => [
                u.full_name || '',
                u.email || '',
                u.cpf || '',
                u.phone || '',
                u.is_active ? 'Ativo' : 'Bloqueado',
                new Date(u.created_at).toLocaleDateString('pt-BR')
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usuarios_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleSaveUser = async () => {
        try {
            setLoading(true);

            // Validações básicas
            if (!formData.email || !formData.full_name) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Campos Obrigatórios',
                    description: 'Por favor, preencha Nome e Email.',
                    type: 'warning',
                    confirmText: 'Entendi',
                    cancelText: 'Voltar',
                    onConfirm: () => setConfirmModal(null)
                });
                setLoading(false);
                return;
            }

            if (!selectedUser && !formData.password) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Senha Necessária',
                    description: 'Defina uma senha para o novo usuário.',
                    type: 'warning',
                    confirmText: 'Entendi',
                    cancelText: 'Voltar',
                    onConfirm: () => setConfirmModal(null)
                });
                setLoading(false);
                return;
            }

            // Refresh session to ensure latest token
            const { data: sessionData } = await supabase.auth.refreshSession();

            if (selectedUser) {
                // Editar usuário existente via Edge Function
                const { data: responseData, error: invokeError } = await supabase.functions.invoke('update-user-admin', {
                    body: {
                        userId: selectedUser.id,
                        email: formData.email !== selectedUser.email ? formData.email : undefined,
                        password: formData.password || undefined,
                        metadata: {
                            full_name: formData.full_name,
                            role: formData.role
                        }
                    },
                    headers: {
                        Authorization: `Bearer ${sessionData.session?.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (invokeError || responseData?.error) throw new Error(invokeError?.message || responseData?.error);

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        cpf: formData.cpf,
                        phone: formData.phone,
                        role: formData.role,
                        is_active: formData.is_active
                    })
                    .eq('id', selectedUser.id);

                if (error) throw error;

                setConfirmModal({
                    isOpen: true,
                    title: 'Sucesso',
                    description: 'Usuário atualizado com sucesso!',
                    type: 'success',
                    confirmText: 'OK',
                    cancelText: '',
                    onConfirm: () => {
                        setConfirmModal(null);
                        setShowModal(false);
                        fetchUsers();
                    }
                });
            } else {
                // Criar novo usuário via Edge Function
                const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
                    body: {
                        email: formData.email,
                        password: formData.password,
                        metadata: {
                            full_name: formData.full_name,
                            role: formData.role
                        }
                    },
                    headers: {
                        Authorization: `Bearer ${sessionData.session?.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (invokeError || responseData?.error) throw new Error(invokeError?.message || responseData?.error);
                const authUser = responseData?.user;

                // Pequeno delay para garantir que o trigger de criação do profile rodou (se houver)
                await new Promise(resolve => setTimeout(resolve, 1000));

                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        cpf: formData.cpf,
                        phone: formData.phone,
                        is_active: formData.is_active
                    })
                    .eq('id', authUser.id);

                // Se não existir, criar (fallback)
                if (profileError) {
                    await supabase.from('profiles').upsert({
                        id: authUser.id,
                        email: formData.email,
                        full_name: formData.full_name,
                        cpf: formData.cpf,
                        phone: formData.phone,
                        role: formData.role,
                        is_active: formData.is_active
                    });
                }

                setConfirmModal({
                    isOpen: true,
                    title: 'Sucesso',
                    description: 'Usuário criado com sucesso!',
                    type: 'success',
                    confirmText: 'OK',
                    cancelText: '',
                    onConfirm: () => {
                        setConfirmModal(null);
                        setShowModal(false);
                        fetchUsers();
                    }
                });
            }

            setFormData({
                full_name: '',
                email: '',
                cpf: '',
                phone: '',
                role: 'customer',
                is_active: true,
                password: ''
            });

        } catch (error: any) {
            console.error('Erro ao salvar usuário:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Erro',
                description: `Falha ao salvar: ${error.message}`,
                type: 'danger',
                confirmText: 'Fechar',
                cancelText: '',
                onConfirm: () => setConfirmModal(null)
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Usuário',
            description: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
            type: 'danger',
            confirmText: 'Excluir Definitivamente',
            onConfirm: () => executeDelete(id)
        });
    };

    const executeDelete = async (id: string) => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null);

        try {
            const { data: { session } } = await supabase.auth.refreshSession();
            const { error: deleteFuncErr } = await supabase.functions.invoke('delete-user-admin', {
                body: { user_id: id },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (deleteFuncErr) {
                console.error("Erro Edge Function:", deleteFuncErr);
                // Fallback: tentar deletar direto se for admin
                const { error } = await supabase.from('profiles').delete().eq('id', id);
                if (error) throw error;
            }

            setConfirmModal({
                isOpen: true,
                title: 'Sucesso',
                description: 'Usuário excluído com sucesso.',
                type: 'success',
                confirmText: 'OK',
                cancelText: '',
                onConfirm: () => {
                    setConfirmModal(null);
                    fetchUsers();
                }
            });
        } catch (error: any) {
            setConfirmModal({
                isOpen: true,
                title: 'Erro',
                description: `Erro ao excluir: ${error.message}`,
                type: 'danger',
                confirmText: 'Fechar',
                cancelText: '',
                onConfirm: () => setConfirmModal(null)
            });
        }
    };

    const confirmToggleStatus = (user: any) => {
        const newStatus = !user.is_active;
        const action = newStatus ? 'DESBLOQUEAR' : 'BLOQUEAR';

        setConfirmModal({
            isOpen: true,
            title: `${action} Usuário`,
            description: `Deseja realmente ${action.toLowerCase()} o acesso de ${user.full_name}?`,
            type: newStatus ? 'success' : 'warning',
            confirmText: newStatus ? 'Desbloquear' : 'Bloquear',
            onConfirm: () => executeToggleStatus(user, newStatus)
        });
    };

    const executeToggleStatus = async (user: any, newStatus: boolean) => {
        setConfirmModal(prev => prev ? { ...prev, loading: true } : null);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: newStatus })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            setConfirmModal(null);
        } catch (error: any) {
            setConfirmModal({
                isOpen: true,
                title: 'Erro',
                description: error.message,
                type: 'danger',
                confirmText: 'Fechar',
                cancelText: '',
                onConfirm: () => setConfirmModal(null)
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Modal de Confirmação Global */}
            {confirmModal && (
                <ActionConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => !confirmModal.loading && setConfirmModal(null)}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    description={confirmModal.description}
                    type={confirmModal.type}
                    confirmText={confirmModal.confirmText}
                    cancelText={confirmModal.cancelText}
                    loading={confirmModal.loading}
                />
            )}

            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Usuários</h1>
                    <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest mt-1">Clientes e Lojistas</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all"
                    >
                        <MaterialIcon name="download" className="text-primary" />
                        <span className="hidden md:inline">Exportar</span>
                    </button>
                    <button
                        onClick={() => { setSelectedUser(null); setShowModal(true); }}
                        className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                    >
                        <MaterialIcon name="person_add" />
                        <span className="hidden md:inline">Novo Usuário</span>
                    </button>
                </div>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                <div className="flex flex-col gap-6">
                    {/* Tabs & Search */}
                    <div className="bg-white dark:bg-[#1a2e23] rounded-[32px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                        <div className="flex border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                            <button
                                onClick={() => setActiveTab('customer')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'customer'
                                    ? 'bg-white dark:bg-[#1a2e23] text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Clientes
                            </button>
                            <div className="w-[1px] bg-slate-200 dark:bg-white/10"></div>
                            <button
                                onClick={() => setActiveTab('merchant')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'merchant'
                                    ? 'bg-white dark:bg-[#1a2e23] text-primary shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Lojistas
                            </button>
                        </div>

                        <div className="p-4 md:p-6 bg-white dark:bg-[#1a2e23]">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <MaterialIcon name="search" className="text-slate-400" />
                                </div>
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic text-slate-800 dark:text-white placeholder:text-slate-400"
                                    placeholder="Buscar por nome, email ou CPF..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1a2e23] rounded-[32px] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Usuário</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] hidden md:table-cell">CPF / Telefone</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] hidden sm:table-cell">Tipo</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Status</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-slate-400">
                                                <div className="flex justify-center items-center gap-2">
                                                    <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full"></div>
                                                    <span className="text-xs font-bold">Carregando usuários...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {users.map((u) => (
                                                <tr key={u.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white font-black italic">
                                                                {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black italic text-slate-900 dark:text-white leading-tight">{u.full_name || 'Sem nome'}</h4>
                                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 hidden md:table-cell">
                                                        <div className="flex flex-col gap-1">
                                                            {u.cpf && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">CPF: {u.cpf}</span>}
                                                            {u.phone && <span className="text-xs text-slate-500">Tel: {u.phone}</span>}
                                                            {!u.cpf && !u.phone && <span className="text-xs text-slate-400 italic">--</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 hidden sm:table-cell">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.role === 'merchant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                                                            }`}>
                                                            {u.role === 'merchant' ? 'Lojista' : 'Cliente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.is_active ? 'bg-[#13ec6d]/10 text-[#13ec6d]' : 'bg-red-500/10 text-red-500'}`}>
                                                            <span className={`size-1.5 rounded-full ${u.is_active ? 'bg-[#13ec6d]' : 'bg-red-500'}`}></span>
                                                            {u.is_active ? 'Ativo' : 'Bloqueado'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { setSelectedUser(u); setShowModal(true); }}
                                                                title="Editar"
                                                                className="size-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
                                                            >
                                                                <MaterialIcon name="edit" className="text-base" />
                                                            </button>
                                                            <button
                                                                onClick={() => confirmToggleStatus(u)}
                                                                title={u.is_active ? "Bloquear" : "Desbloquear"}
                                                                className={`size-8 rounded-lg flex items-center justify-center transition-colors ${u.is_active ? 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-red-500 hover:text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
                                                            >
                                                                <MaterialIcon name={u.is_active ? "block" : "check_circle"} className="text-base" />
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDelete(u.id)}
                                                                title="Excluir"
                                                                className="size-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                                            >
                                                                <MaterialIcon name="delete" className="text-base" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!loading && users.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-10 text-center text-slate-400 italic">Nenhum usuário encontrado.</td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Mobile Floating Action Button */}
                <div className="fixed bottom-24 right-6 z-50 md:hidden">
                    <button
                        onClick={() => { setSelectedUser(null); setShowModal(true); }}
                        className="bg-primary hover:bg-primary/90 text-background-dark flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-90"
                    >
                        <MaterialIcon name="person_add" className="text-2xl" />
                    </button>
                </div>

                {/* Form Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                        <div className="relative bg-white dark:bg-[#111a16] rounded-[32px] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-slate-200 dark:border-white/10">
                            <div className="sticky top-0 bg-white dark:bg-[#111a16] border-b border-slate-200 dark:border-white/10 p-6 z-10 flex justify-between items-center">
                                <h2 className="text-xl font-black italic text-slate-900 dark:text-white">
                                    {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:rotate-90 transition-all"
                                >
                                    <MaterialIcon name="close" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Digite o nome completo"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!!selectedUser}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                            CPF
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cpf}
                                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                        Tipo de Usuário
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                    >
                                        <option value="customer">Cliente</option>
                                        <option value="merchant">Lojista</option>
                                        <option value="motoboy">Motoboy</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                {!selectedUser && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                            Senha
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 mb-1 block">
                                        Status
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_active: true })}
                                            className={`flex-1 ${formData.is_active ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400'} rounded-2xl py-3 font-black text-xs uppercase tracking-widest transition-all`}
                                        >
                                            Ativo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_active: false })}
                                            className={`flex-1 ${!formData.is_active ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400'} rounded-2xl py-3 font-black text-xs uppercase tracking-widest transition-all`}
                                        >
                                            Bloqueado
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveUser}
                                    disabled={loading}
                                    className="w-full mt-4 bg-primary text-background-dark rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>{selectedUser ? 'Salvar Alterações' : 'Criar Usuário'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
