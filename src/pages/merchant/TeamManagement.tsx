import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const TeamManagement = () => {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
    const [editingMember, setEditingMember] = useState<any | null>(null); // New state for editing
    const [saving, setSaving] = useState(false);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff', // staff, manager, motoboy
        // Motoboy specific
        vehicle_plate: '',
        vehicle_model: ''
    });

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { requirements: [], allMet: false };
        const requirements = [
            { id: 'length', text: 'Mínimo 6 caracteres', met: pass.length >= 6 },
            { id: 'number', text: 'Pelo menos um número', met: /\d/.test(pass) },
            { id: 'special', text: 'Um caractere especial (@$!%*?)', met: /[@$!%*?&#]/.test(pass) },
        ];
        const allMet = requirements.every(r => r.met);
        return { requirements, allMet };
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('pharmacy_id, role')
            .eq('id', user.id)
            .single();

        if (profile) {
            setPharmacyId(profile.pharmacy_id);
            setMyRole(profile.role);

            // FIX: Prevent fetching with null pharmacy_id (avoids 22P02 error)
            if (profile.pharmacy_id) {
                const { data: members, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('pharmacy_id', profile.pharmacy_id)
                    .in('role', ['manager', 'staff', 'motoboy', 'merchant']);

                if (members) setTeam(members);
                if (error) console.error("Error fetching team:", error);
            }
        }
        setLoading(false);
    };

    const handleEditClick = (member: any) => {
        setEditingMember(member);
        setFormData({
            name: member.full_name,
            email: member.email,
            phone: member.phone || '',
            password: '', // Password not editable directly here usually, or keep blank to not change
            role: member.role,
            vehicle_plate: member.vehicle_plate || '',
            vehicle_model: member.vehicle_model || ''
        });
        setShowModal(true);
    };

    const handleAddNewClick = () => {
        setEditingMember(null);
        setFormData({ name: '', email: '', phone: '', password: '', role: 'staff', vehicle_plate: '', vehicle_model: '' });
        setShowModal(true);
    };

    const handleDeleteClick = (member: any) => {
        setMemberToDelete(member);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!memberToDelete) return;

        setSaving(true);
        try {
            // 1. Deletar do Auth (isso cascateia para profiles devido ao ON DELETE CASCADE)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão expirada");

            const baseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Usar Edge Function para deletar usuário do Auth (requer service role)
            const response = await fetch(`${baseUrl}/functions/v1/delete-user-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': anonKey
                },
                body: JSON.stringify({ userId: memberToDelete.id })
            });

            if (!response.ok) {
                // Fallback: deletar apenas do profiles se a Edge Function não existir
                const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', memberToDelete.id);

                if (error) throw error;
            }

            showToast(`${memberToDelete.full_name} foi removido da equipe.`, 'success');
            setShowDeleteModal(false);
            setMemberToDelete(null);
            fetchTeam(); // Recarregar lista
        } catch (error: any) {
            console.error('Erro ao deletar:', error);
            showToast('Erro ao remover funcionário: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyId) return;

        setSaving(true);
        try {
            if (editingMember) {
                // UPDATE MODE
                const updates: any = {
                    role: formData.role,
                    phone: formData.phone,
                    // Typically name/email are not changed by manager easily, but let's allow basic info
                    full_name: formData.name,
                };

                if (formData.role === 'motoboy') {
                    updates.vehicle_plate = formData.vehicle_plate;
                    updates.vehicle_model = formData.vehicle_model;
                }

                // If password provided for update (optional feature, be careful) - simplifying to NOT update password here for now unless critical

                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', editingMember.id);

                if (error) throw error;
                showToast("Membro atualizado com sucesso!", 'success');
            } else {
                // CREATE MODE (Existing Logic)
                let loginEmail = '';  // Inicializar vazio - será gerado baseado no telefone
                let loginPassword = formData.password;
                let displayMessage = '';

                // Lógica específica para Motoboy
                if (formData.role === 'motoboy') {
                    const { allMet } = getPasswordStrength(formData.password);
                    if (!formData.phone || !formData.password) {
                        throw new Error("Telefone e Senha são obrigatórios para Motoboy.");
                    }
                    if (!allMet) {
                        throw new Error("A senha não atende aos requisitos mínimos de segurança.");
                    }
                    // Gerar email de login baseado no telefone
                    loginEmail = `${formData.phone.replace(/\D/g, '')}@motoboy.ifarma.com`;
                    displayMessage = `Motoboy cadastrado!\nLogin: ${formData.phone.replace(/\D/g, '')}\nSenha: ${formData.password}`;
                } else {
                    // Lógica para outros membros (Gerente, Caixa)
                    if (!formData.phone || !formData.password) {
                        throw new Error("Telefone e Senha são obrigatórios.");
                    }
                    const { allMet } = getPasswordStrength(formData.password);
                    if (!allMet) {
                        throw new Error("A senha não atende aos requisitos mínimos de segurança.");
                    }
                    // Gerar email de login baseado no telefone (Padrão Employee)
                    loginEmail = `${formData.phone.replace(/\D/g, '')}@employee.ifarma.com`;
                    displayMessage = `Membro cadastrado!\nLogin: ${formData.phone.replace(/\D/g, '')}\nSenha: ${formData.password}`;
                }

                // Manual Fetch to bypass potential Supabase Client invoke issues
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                if (!freshSession) throw new Error("Sessão expirada. Por favor, faça login novamente.");

                const baseUrl = import.meta.env.VITE_SUPABASE_URL;
                const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                console.log("🚀 Custom Invoke Start");

                const response = await fetch(`${baseUrl}/functions/v1/create-user-admin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${freshSession.access_token}`, // Restricted: Real user session token
                        'apikey': anonKey
                    },
                    body: JSON.stringify({
                        email: loginEmail,
                        password: loginPassword,
                        metadata: {
                            full_name: formData.name,
                            role: formData.role,
                            pharmacy_id: pharmacyId,
                            phone: formData.phone,
                            vehicle_plate: formData.role === 'motoboy' ? formData.vehicle_plate : undefined,
                            vehicle_model: formData.role === 'motoboy' ? formData.vehicle_model : undefined,
                        }
                    })
                });

                console.log("📡 Response Status:", response.status);

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    console.error("❌ Edge Function Error Detail:", result);
                    const errorMsg = result.error || result.message || "Erro desconhecido na Edge Function";
                    const error = new Error(errorMsg);
                    (error as any).status = response.status;
                    (error as any).code = result.code;
                    throw error;
                }

                const authData = result;

                // Criar perfil com dados adicionais (Backup/Confirmação)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        email: loginEmail,
                        full_name: formData.name,
                        phone: formData.phone,
                        role: formData.role,
                        pharmacy_id: pharmacyId,
                        is_active: true,
                    });

                if (profileError) {
                    console.error("Erro ao atualizar perfil local:", profileError);
                }

                showToast(displayMessage, 'success');
            }

            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', password: '', role: 'staff', vehicle_plate: '', vehicle_model: '' });
            fetchTeam();
        } catch (error: any) {
            console.error("Erro operação:", error);
            let msg = error.message;

            // Handle Supabase Function error object (FunctionsHttpError)
            if (error.context?.json) {
                const jsonErr = error.context.json;
                msg = jsonErr.error || msg;
            } else if (error.status === 401) {
                msg = "Não autorizado. Sua sessão pode ter expirado. Por favor, faça login novamente.";
            }

            // Tratamento de mensagens comuns do Supabase Auth
            if (msg.includes("non-2xx") || msg.toLowerCase().includes("status code")) {
                if (error.status === 400 || error.context?.status === 400) {
                    msg = "Erro nos dados enviados. Verifique se a senha atende aos requisitos ou se o usuário já existe.";
                } else if (error.status === 401 || error.context?.status === 401) {
                    msg = "Sessão inválida ou expirada. Recarregue a página.";
                } else {
                    msg = "Erro no servidor. Verifique os dados ou tente novamente mais tarde.";
                }
            }

            if (msg.includes("User already registered") || msg.includes("already exists") || error.code === 'USER_ALREADY_EXISTS') {
                msg = "Este usuário (telefone) já está cadastrado no sistema. Tente fazer login.";
            } else if (msg.includes("weak_password") || error.code === 'PASSWORD_TOO_WEAK') {
                msg = "A senha é muito fraca. Certifique-se de seguir os requisitos: 6+ caracteres, números e símbolos.";
            }

            showToast("Erro: " + msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'merchant': return 'Dono / Gestor';
            case 'manager': return 'Gerente';
            case 'staff': return 'Caixa / Atendente';
            case 'motoboy': return 'Motoboy';
            default: return role;
        }
    };

    return (
        <div className="p-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Gestão de Equipe</h1>
                    <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-bold uppercase tracking-widest mt-1">Gerentes, Caixas e Motoboys</p>
                </div>
                {['merchant', 'manager', 'admin'].includes(myRole || '') && (
                    <button
                        onClick={handleAddNewClick}
                        className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                    >
                        <MaterialIcon name="person_add" />
                        <span>Novo Membro</span>
                    </button>
                )}
            </header>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
            ) : (
                <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                        <div className="col-span-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome / Email</div>
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo</div>
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</div>
                        <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                        <div className="col-span-0 opacity-0 w-0 h-0 overflow-hidden">Actions</div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {team.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum membro na equipe.</div>
                        ) : (
                            team.map(member => (
                                <div key={member.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <div className="col-span-4 flex items-center gap-4">
                                        <div className={`size-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5 ${member.role === 'manager' ? 'bg-amber-500/10 text-amber-500' :
                                            member.role === 'staff' ? 'bg-blue-500/10 text-blue-500' :
                                                member.role === 'motoboy' ? 'bg-green-500/10 text-green-500' : 'bg-slate-100 dark:bg-black/20 text-slate-400'
                                            }`}>
                                            <MaterialIcon name={
                                                member.role === 'manager' ? 'admin_panel_settings' :
                                                    member.role === 'staff' ? 'point_of_sale' :
                                                        member.role === 'motoboy' ? 'sports_motorsports' : 'person'
                                            } className="text-xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{member.full_name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="col-span-3">
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${member.role === 'manager' ? 'bg-amber-100 text-amber-600' :
                                            member.role === 'staff' ? 'bg-blue-100 text-blue-600' :
                                                member.role === 'motoboy' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {getRoleLabel(member.role)}
                                        </span>
                                    </div>

                                    <div className="col-span-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <MaterialIcon name="call" className="text-[14px]" />
                                                <span className="text-xs font-medium">{member.phone || '-'}</span>
                                            </div>
                                            {member.role === 'motoboy' && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <MaterialIcon name="two_wheeler" className="text-[14px]" />
                                                    <span className="text-[10px] font-bold uppercase">Motoboy</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2 flex justify-center items-center gap-2">
                                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Ativo</span>
                                        </div>

                                        {['merchant', 'manager'].includes(myRole || '') && (
                                            <>
                                                <button
                                                    onClick={() => handleEditClick(member)}
                                                    className="size-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary hover:bg-white hover:shadow-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                                    title="Editar acesso"
                                                >
                                                    <MaterialIcon name="edit" className="text-[16px]" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(member)}
                                                    className="size-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                                    title="Remover da equipe"
                                                >
                                                    <MaterialIcon name="delete" className="text-[16px]" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e22] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                        <form onSubmit={handleSave} className="p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">
                                        {editingMember ? 'Editar Acesso' : 'Novo Colaborador'}
                                    </h2>
                                    {editingMember && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Atualizando permissões</p>}
                                </div>
                                <button type="button" onClick={() => setShowModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>

                            <div className="space-y-4">
                                {editingMember && (
                                    <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                                                <MaterialIcon name="person" className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{editingMember.full_name}</p>
                                                <p className="text-[10px] text-slate-400">{editingMember.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Cargo / Função</label>
                                    <select
                                        required
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors"
                                    >
                                        <option value="staff">Caixa / Atendente</option>
                                        <option value="manager">Gerente de Equipe</option>
                                        <option value="motoboy">Motoboy</option>
                                    </select>
                                </div>

                                {!editingMember && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Nome Completo</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                            placeholder="Ex: Ana Souza"
                                        />
                                    </div>
                                )}

                                {/* Campos dinâmicos baseados no cargo */}
                                {formData.role !== 'motoboy' ? (
                                    !editingMember && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Senha de Acesso</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                    placeholder="Crie uma senha forte"
                                                />

                                                {/* Password Requirements Guidance */}
                                                <div className="mt-3 p-4 bg-slate-50 dark:bg-black/20 rounded-[20px] border border-slate-100 dark:border-white/10 shadow-inner">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                                                        <MaterialIcon name="security" className="text-[14px]" />
                                                        Requisitos de Segurança
                                                    </p>
                                                    <div className="space-y-2">
                                                        {getPasswordStrength(formData.password).requirements.map(req => (
                                                            <div key={req.id} className="flex items-center gap-3">
                                                                <div className={`size-5 rounded-lg flex items-center justify-center transition-all ${req.met ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-200 dark:bg-white/5'}`}>
                                                                    {req.met ? (
                                                                        <MaterialIcon name="check" className="text-[12px] text-white" />
                                                                    ) : (
                                                                        <div className="size-1 bg-slate-400 rounded-full" />
                                                                    )}
                                                                </div>
                                                                <span className={`text-[11px] font-bold tracking-tight transition-colors ${req.met ? 'text-green-500' : 'text-slate-400'}`}>
                                                                    {req.text}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-slate-400 mt-2 pl-1 leading-relaxed">Esta senha será usada para acessar o painel com o número de telefone.</p>
                                            </div>

                                            {/* Email Opcional ou Removido - Decisão: Remover para simplificar login por telefone */}
                                        </>
                                    )
                                ) : (
                                    <>
                                        {/* Campos específicos de Motoboy */}
                                        {!editingMember && (
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Senha de Acesso</label>
                                                <input
                                                    required={!editingMember}
                                                    type="text"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                    placeholder="Crie uma senha forte"
                                                />

                                                {/* Password Requirements Guidance - Enhanced for Visibility */}
                                                <div className="mt-3 p-4 bg-slate-50 dark:bg-black/20 rounded-[20px] border border-slate-100 dark:border-white/10 shadow-inner">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                                                        <MaterialIcon name="security" className="text-[14px]" />
                                                        Requisitos de Segurança
                                                    </p>
                                                    <div className="space-y-2">
                                                        {getPasswordStrength(formData.password).requirements.map(req => (
                                                            <div key={req.id} className="flex items-center gap-3">
                                                                <div className={`size-5 rounded-lg flex items-center justify-center transition-all ${req.met ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-200 dark:bg-white/5'}`}>
                                                                    {req.met ? (
                                                                        <MaterialIcon name="check" className="text-[12px] text-white" />
                                                                    ) : (
                                                                        <div className="size-1 bg-slate-400 rounded-full" />
                                                                    )}
                                                                </div>
                                                                <span className={`text-[11px] font-bold tracking-tight transition-colors ${req.met ? 'text-green-500' : 'text-slate-400'}`}>
                                                                    {req.text}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-[10px] text-slate-400 mt-2 pl-1 leading-relaxed">Esta senha será necessária para o primeiro acesso no aplicativo do motoboy.</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Placa</label>
                                                <input
                                                    required
                                                    value={formData.vehicle_plate}
                                                    onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                    placeholder="ABC-1234"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Modelo Moto</label>
                                                <input
                                                    required
                                                    value={formData.vehicle_model}
                                                    onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                    placeholder="Ex: Fan 160"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">
                                        Telefone (Login)
                                    </label>
                                    <input
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="(00) 00000-0000"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1">Este número será usado como login.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name={editingMember ? "save" : "how_to_reg"} />}
                                {editingMember ? 'Salvar Alterações' : 'Cadastrar na Equipe'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteModal && memberToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-background-dark rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="size-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                <MaterialIcon name="warning" className="text-red-500 text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">
                                    Remover Funcionário?
                                </h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    Esta ação não pode ser desfeita
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 mb-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Você está prestes a remover <strong className="text-slate-900 dark:text-white">{memberToDelete.full_name}</strong> da equipe.
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                O acesso ao sistema será revogado imediatamente.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setMemberToDelete(null);
                                }}
                                disabled={saving}
                                className="flex-1 h-12 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={saving}
                                className="flex-1 h-12 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <MaterialIcon name="delete" />
                                )}
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default TeamManagement;
