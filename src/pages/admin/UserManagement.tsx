import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const UserManagement = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'customer' | 'merchant'>('customer');
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
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
        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('role', activeTab);

        if (searchTerm) {
            query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, count } = await query.order('created_at', { ascending: false });

        if (data) {
            setUsers(data);
            setTotalCount(count || 0);
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

    const getStatusColor = (user: any) => {
        if (!user.is_active) return 'red-500';
        if (!user.full_name || !user.phone) return 'orange-500';
        return 'primary';
    };

    const getStatusLabel = (user: any) => {
        if (!user.is_active) return 'Bloqueado';
        if (!user.full_name || !user.phone) return 'Pendente';
        return 'Ativo';
    };

    const handleSaveUser = async () => {
        try {
            setLoading(true);

            // Validações básicas
            if (!formData.email || !formData.full_name) {
                alert('Por favor, preencha os campos obrigatórios: Nome e Email');
                setLoading(false);
                return;
            }

            if (!selectedUser && !formData.password) {
                alert('Por favor, defina uma senha para o novo usuário');
                setLoading(false);
                return;
            }

            if (selectedUser) {
                // Editar usuário existente via Edge Function (Seguro)
                const { data: responseData, error: invokeError } = await supabase.functions.invoke('update-user-admin', {
                    body: {
                        userId: selectedUser.id,
                        email: formData.email !== selectedUser.email ? formData.email : undefined,
                        password: formData.password || undefined,
                        metadata: {
                            full_name: formData.full_name,
                            role: formData.role
                        }
                    }
                });

                if (invokeError || responseData?.error) throw new Error(invokeError?.message || responseData?.error);

                // Atualizar perfil na tabela profiles
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
                alert('Usuário atualizado com sucesso!');
            } else {
                // Criar novo usuário via Edge Function (Seguro - Evita logoff de admin)
                try {
                    const { data: responseData, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
                        body: {
                            email: formData.email,
                            password: formData.password,
                            metadata: {
                                full_name: formData.full_name,
                                role: formData.role
                            }
                        }
                    });

                    if (invokeError || responseData?.error) throw new Error(invokeError?.message || responseData?.error);
                    const authUser = responseData?.user;

                    // Aguardar um pouco para o trigger do Supabase criar o perfil
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Atualizar perfil na tabela profiles (o trigger já criou, só precisamos atualizar os campos extras)
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({
                            cpf: formData.cpf,
                            phone: formData.phone,
                            is_active: formData.is_active
                        })
                        .eq('id', authUser.id);

                    if (profileError) {
                        // Fallback: Tentar upsert se o trigger falhar
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

                    alert('Usuário criado com sucesso!');
                } catch (error: any) {
                    console.error('Erro completo:', error);
                    throw error;
                }
            }

            // Resetar formulário e fechar modal
            setShowModal(false);
            setFormData({
                full_name: '',
                email: '',
                cpf: '',
                phone: '',
                role: 'customer',
                is_active: true,
                password: ''
            });
            setSelectedUser(null);

            // Recarregar lista de usuários
            fetchUsers();
        } catch (error: any) {
            console.error('Erro ao salvar usuário:', error);
            alert(`Erro ao salvar usuário: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    // Atualizar formData quando selectedUser mudar
    useEffect(() => {
        if (selectedUser) {
            setFormData({
                full_name: selectedUser.full_name || '',
                email: selectedUser.email || '',
                cpf: selectedUser.cpf || '',
                phone: selectedUser.phone || '',
                role: selectedUser.role || activeTab,
                is_active: selectedUser.is_active ?? true,
                password: ''
            });
        } else {
            setFormData({
                full_name: '',
                email: '',
                cpf: '',
                phone: '',
                role: activeTab,
                is_active: true,
                password: ''
            });
        }
    }, [selectedUser, activeTab]);


    return (
        <div className="flex flex-col gap-6">
            {/* Universal Header */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Usuários</h1>
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

            <main className="pb-32 md:pb-10">
                <div className="flex flex-col gap-6">
                    {/* Tabs & Search */}
                    <div className="bg-white dark:bg-[#1a2e23] md:rounded-b-3xl shadow-sm border-b border-slate-200 dark:border-white/5 md:mx-5 md:mt-5 md:rounded-3xl md:border">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-[#326748] px-4 justify-between md:justify-start md:gap-8">
                            <button
                                onClick={() => setActiveTab('customer')}
                                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 md:px-4 ${activeTab === 'customer' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-400 dark:text-[#92c9a9] opacity-50 hover:opacity-100'} transition-opacity`}
                            >
                                <p className="text-sm font-black uppercase tracking-widest leading-none">Clientes</p>
                            </button>
                            <button
                                onClick={() => setActiveTab('merchant')}
                                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 md:px-4 ${activeTab === 'merchant' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-400 dark:text-[#92c9a9] opacity-50 hover:opacity-100'} transition-opacity`}
                            >
                                <p className="text-sm font-black uppercase tracking-widest leading-none">Lojistas</p>
                            </button>
                        </div>

                        {/* SearchBar */}
                        <div className="px-4 py-4 md:p-4">
                            <label className="flex flex-col min-w-40 h-12 w-full">
                                <div className="flex w-full flex-1 items-stretch rounded-2xl h-full shadow-sm overflow-hidden bg-slate-100 dark:bg-[#234833]">
                                    <div className="text-slate-400 dark:text-[#92c9a9] flex border-none items-center justify-center pl-4">
                                        <MaterialIcon name="search" />
                                    </div>
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent focus:border-none h-full placeholder:text-slate-400 dark:placeholder:text-[#92c9a9] px-4 pl-2 text-base font-bold italic focus:ring-0"
                                        placeholder="Buscar por nome ou e-mail..."
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Mobile Export Button */}
                    <div className="flex px-4 md:hidden">
                        <button
                            onClick={handleExport}
                            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-12 px-4 flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all"
                        >
                            <MaterialIcon name="download" className="text-primary" />
                            <span className="truncate">Exportar Dados</span>
                        </button>
                    </div>

                    {/* List Section */}
                    <div className="px-4 md:px-5">
                        <div className="flex items-center justify-between pb-4 pt-2">
                            <h3 className="text-slate-900 dark:text-white text-lg font-black tracking-tighter italic">Lista de Usuários</h3>
                            <span className="text-[10px] font-black text-slate-400 dark:text-[#92c9a9] uppercase tracking-widest">Total: {totalCount}</span>
                        </div>

                        {/* User Grid/Table - Responsive */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {users.map((u) => (
                                <div key={u.id} className="flex flex-col p-5 bg-white dark:bg-[#1a2e22] rounded-[24px] border border-slate-200 dark:border-[#234833] shadow-md group hover:scale-[1.02] transition-transform h-full justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white font-black italic">
                                                {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className={`px-3 py-1 bg-${getStatusColor(u)}/10 border border-${getStatusColor(u)}/30 rounded-full`}>
                                                <span className={`text-${getStatusColor(u)} text-[9px] font-black uppercase tracking-widest`}>{getStatusLabel(u)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col mb-4">
                                            <span className="text-slate-900 dark:text-white font-black text-base italic line-clamp-1">{u.full_name || 'Sem nome'}</span>
                                            <span className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate">{u.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#92c9a9]">
                                            <MaterialIcon name="calendar_today" className="text-sm" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedUser(u); setShowModal(true); }}
                                            className="text-primary hover:rotate-12 transition-transform bg-primary/10 p-2 rounded-lg"
                                        >
                                            <MaterialIcon name="edit" className="text-sm" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile Floating Action Button */}
                <div className="fixed bottom-28 right-6 z-50 md:hidden">
                    <button
                        onClick={() => { setSelectedUser(null); setShowModal(true); }}
                        className="bg-primary hover:bg-primary/90 text-background-dark flex h-14 w-14 items-center justify-center rounded-[20px] shadow-2xl shadow-primary/30 transition-all active:scale-90 hover:-rotate-12"
                    >
                        <MaterialIcon name="person_add" className="scale-125" />
                    </button>
                </div>

                {/* User Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2e23] rounded-[32px] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
                            <div className="sticky top-0 bg-white dark:bg-[#1a2e23] border-b border-slate-200 dark:border-white/10 p-6 rounded-t-[32px]">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black italic text-slate-900 dark:text-white">
                                        {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
                                    </h2>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    >
                                        <MaterialIcon name="close" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary"
                                        placeholder="Digite o nome completo"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!!selectedUser}
                                        className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary disabled:opacity-50"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        CPF
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary"
                                        placeholder="000.000.000-00"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        Telefone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        Tipo de Usuário
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="customer">Cliente</option>
                                        <option value="merchant">Lojista</option>
                                        <option value="motoboy">Motoboy</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                {!selectedUser && (
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                            Senha
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-[#234833] border-none rounded-2xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 block">
                                        Status
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_active: true })}
                                            className={`flex-1 ${formData.is_active ? 'bg-primary/10 border-2 border-primary text-primary' : 'bg-slate-100 dark:bg-[#234833] border-2 border-transparent text-slate-400'} rounded-2xl py-3 font-black text-xs uppercase tracking-widest hover:border-primary/50 transition-all`}
                                        >
                                            Ativo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_active: false })}
                                            className={`flex-1 ${!formData.is_active ? 'bg-red-500/10 border-2 border-red-500 text-red-500' : 'bg-slate-100 dark:bg-[#234833] border-2 border-transparent text-slate-400'} rounded-2xl py-3 font-black text-xs uppercase tracking-widest hover:border-red-500/50 transition-all`}
                                        >
                                            Bloqueado
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white dark:bg-[#1a2e23] border-t border-slate-200 dark:border-white/10 p-6 rounded-b-[32px] flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white rounded-2xl py-3 font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={loading}
                                    className="flex-1 bg-primary text-background-dark rounded-2xl py-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
