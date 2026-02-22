import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';
import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const TeamManagement = () => {
    const [team, setTeam] = useState<any[]>([]);
    const [contracts, setContracts] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
    const [editingMember, setEditingMember] = useState<any | null>(null);
    const [selectedMotoboy, setSelectedMotoboy] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    const [contractData, setContractData] = useState({
        delivery_fee: 0, fixed_salary: 0, daily_rate: 0,
        productivity_goal: 0, productivity_bonus: 0
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff',
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

    // Capturar erros de promises não tratadas (especialmente do Realtime)
    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            if (event.reason?.message?.includes('Could not establish connection end')) {
                console.warn('[Realtime] Erro de conexão capturado globalmente:', event.reason);
                event.preventDefault(); // Evita o erro no console
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            console.log("🚀 Iniciando fetchTeam...");

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                console.error("❌ Erro de autenticação:", authError);
                setLoading(false);
                return;
            }

            if (!user) {
                console.warn("⚠️ Usuário não autenticado");
                window.location.href = '/login';
                setLoading(false);
                return;
            }

            console.log("✅ Usuário autenticado:", user.id);

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('pharmacy_id, role, full_name, email, phone, is_active')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error("❌ Erro ao buscar perfil:", profileError);
                setLoading(false);
                return;
            }

            if (!profile) {
                console.warn("⚠️ Perfil não encontrado");
                setLoading(false);
                return;
            }

            console.log("✅ Perfil encontrado:", profile);
            await processProfile(profile, user.id);

        } catch (err) {
            console.error("💥 Erro crítico em fetchTeam:", err);
        } finally {
            setLoading(false);
        }
    };

    const processProfile = async (profile: any, userId: string) => {
        console.log("🔧 Processando perfil:", profile);

        setPharmacyId(profile.pharmacy_id);
        setMyRole(profile.role);

        if (!profile.pharmacy_id) {
            console.log("📝 Usuário sem pharmacy_id - mostrando apenas próprio usuário");
            setTeam([{
                ...profile,
                is_active: profile.is_active !== false
            }]);
            return;
        }

        console.log("🔍 Buscando membros da farmácia:", profile.pharmacy_id);

        try {
            const { data: members, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('pharmacy_id', profile.pharmacy_id)
                .in('role', ['manager', 'staff', 'motoboy', 'merchant']);

            if (error) {
                console.error("❌ Erro ao buscar equipe:", error);
                setTeam([{
                    ...profile,
                    is_active: profile.is_active !== false
                }]);
            } else {
                console.log("✅ Equipe encontrada:", members?.length || 0);
                setTeam(members || []);

                // Buscar contratos dos motoboys em uma única query
                const motoboyIds = (members || []).filter(m => m.role === 'motoboy').map(m => m.id);
                if (motoboyIds.length > 0) {
                    const { data: contractsData } = await supabase
                        .from('courier_contracts')
                        .select('*')
                        .in('courier_id', motoboyIds);
                    const map: Record<string, any> = {};
                    (contractsData || []).forEach(c => { map[c.courier_id] = c; });
                    setContracts(map);
                }
            }
        } catch (err) {
            console.error("💥 Erro crítico ao buscar equipe:", err);
            setTeam([{
                ...profile,
                is_active: profile.is_active !== false
            }]);
        }
    };

    const handleEditClick = (member: any) => {
        setEditingMember(member);
        setFormData({
            name: member.full_name,
            email: member.email,
            phone: member.phone || '',
            password: '',
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
        console.log("[DELETE] Clicou no ícone de lixeira → member:", member);
        setMemberToDelete(member);
        setShowDeleteModal(true);
    };

    const openContractModal = (boy: any) => {
        setSelectedMotoboy(boy);
        const existing = contracts[boy.id];
        setContractData({
            delivery_fee: existing?.delivery_fee ?? 0,
            fixed_salary: existing?.fixed_salary ?? 0,
            daily_rate: existing?.daily_rate ?? 0,
            productivity_goal: existing?.productivity_goal ?? 0,
            productivity_bonus: existing?.productivity_bonus ?? 0
        });
        setShowContractModal(true);
    };

    const handleSaveContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMotoboy || !pharmacyId) return;
        setSaving(true);
        try {
            const { error } = await supabase.rpc('upsert_courier_contract_owner', {
                p_courier_id: selectedMotoboy.id,
                p_pharmacy_id: pharmacyId,
                p_delivery_fee: contractData.delivery_fee,
                p_fixed_salary: contractData.fixed_salary,
                p_daily_rate: contractData.daily_rate,
                p_productivity_goal: contractData.productivity_goal,
                p_productivity_bonus: contractData.productivity_bonus
            });
            if (error) throw error;
            setContracts(prev => ({ ...prev, [selectedMotoboy.id]: { ...contractData } }));
            showToast('Contrato salvo com sucesso!', 'success');
            setShowContractModal(false);
        } catch (err: any) {
            showToast('Erro ao salvar contrato: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const fmt = (v: number) => v > 0 ? `R$ ${v.toFixed(2).replace('.', ',')}` : null;

    const handleConfirmDelete = async () => {
        console.log("[DELETE] Botão REMOVER do modal foi clicado!");
        console.log("memberToDelete atual:", memberToDelete);
        console.log("pharmacyId atual:", pharmacyId);

        if (!memberToDelete || !pharmacyId) {
            console.error("[DELETE] Falha na validação inicial → memberToDelete ou pharmacyId ausente");
            showToast("Erro interno: dados do usuário ou farmácia não encontrados", "error");
            return;
        }

        setSaving(true);
        try {
            console.log(`[DELETE] Iniciando exclusão do usuário ${memberToDelete.id}`);

            // 1. Garantir sessão fresca
            console.log("[DELETE] Solicitando refreshSession...");
            const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshErr || !session) {
                console.error("[DELETE] Erro no refreshSession:", refreshErr);
                throw new Error("Sessão expirada. Faça login novamente.");
            }
            console.log("[DELETE] Sessão renovada com sucesso.");

            // 2. Invocar Edge Function de deleção
            console.log("[DELETE] Invocando Edge Function 'delete-user-admin'...");
            const { data, error: invokeErr } = await supabase.functions.invoke('delete-user-admin', {
                body: {
                    user_id: memberToDelete.id,
                    pharmacy_id: pharmacyId
                }
            });

            console.log("[DELETE] Retorno completo da Edge Function:", { data, invokeErr });

            if (invokeErr) {
                console.error("[DELETE] Erro de invocação (Rede/CORS):", invokeErr);
                let msg = invokeErr.message || "Erro ao conectar com o servidor";
                try {
                    const ctx = (invokeErr as any).context;
                    if (ctx && typeof ctx.json === 'function') {
                        const body = await ctx.json();
                        console.log("[DELETE] Erro context JSON:", body);
                        msg = body.detail || body.error || body.message || msg;
                    }
                } catch { /* fallback */ }
                throw new Error(msg);
            }

            if (!data?.success) {
                console.warn("[DELETE] Edge retornou 200 mas success é falso ou nulo:", data);
                throw new Error(data?.error || data?.detail || "A deleção não foi confirmada pelo servidor.");
            }

            console.log("[DELETE] ✅ Deleção confirmada pelo servidor!");
            showToast(`${memberToDelete.full_name} foi removido com sucesso.`, 'success');

            // Atualizar lista local
            setTeam(prev => prev.filter(m => m.id !== memberToDelete.id));
            setShowDeleteModal(false);
            setMemberToDelete(null);
        } catch (error: any) {
            console.error('[DELETE] ❌ Erro no catch final:', error);
            showToast('Erro: ' + error.message, 'error');
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
                const updates: any = {
                    role: formData.role,
                    phone: formData.phone,
                    full_name: formData.name,
                };

                if (formData.role === 'motoboy') {
                    if (formData.vehicle_plate) {
                        updates.vehicle_plate = formData.vehicle_plate;
                    }
                    if (formData.vehicle_model) {
                        updates.vehicle_model = formData.vehicle_model;
                    }
                }

                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', editingMember.id);

                if (error) throw error;
                showToast("Membro atualizado com sucesso!", 'success');
            } else {
                let loginEmail = '';
                let loginPassword = formData.password;
                let displayMessage = '';

                if (!formData.name) throw new Error("O nome do membro é obrigatório.");

                if (formData.role === 'motoboy') {
                    const { allMet } = getPasswordStrength(formData.password);
                    if (!formData.phone || !formData.password) {
                        throw new Error("Telefone e Senha são obrigatórios para Motoboy.");
                    }
                    if (!formData.vehicle_plate || !formData.vehicle_model) {
                        throw new Error("Placa e Modelo da Moto são obrigatórios.");
                    }
                    if (!allMet) {
                        throw new Error("A senha não atende aos requisitos mínimos de segurança (6+ caracteres, número, símbolo).");
                    }
                    loginEmail = `${formData.phone.replace(/\D/g, '')}@motoboy.ifarma.com`;
                    displayMessage = `Motoboy cadastrado!\nLogin: ${formData.phone.replace(/\D/g, '')}\nSenha: ${formData.password}`;
                } else {
                    if (!formData.phone || !formData.password) {
                        throw new Error("Telefone e Senha são obrigatórios.");
                    }
                    const { allMet } = getPasswordStrength(formData.password);
                    if (!allMet) {
                        throw new Error("A senha não atende aos requisitos mínimos de segurança.");
                    }
                    loginEmail = `${formData.phone.replace(/\D/g, '')}@employee.ifarma.com`;
                    displayMessage = `Membro cadastrado!\nLogin: ${formData.phone.replace(/\D/g, '')}\nSenha: ${formData.password}`;
                }

                console.log("🚀 Criando usuário via Edge Function...");

                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    throw new Error("Sessão expirada. Faça login novamente.");
                }

                const { data: authData, error: createError } = await supabase.functions.invoke('create-staff-user', {
                    body: {
                        email: loginEmail,
                        password: loginPassword,
                        pharmacy_id: pharmacyId,
                        metadata: {
                            full_name: formData.name,
                            role: formData.role,
                            phone: formData.phone,
                            vehicle_plate: formData.role === 'motoboy' ? formData.vehicle_plate : null,
                            vehicle_model: formData.role === 'motoboy' ? formData.vehicle_model : null,
                            pharmacy_id: pharmacyId
                        }
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (createError) {
                    console.error("Erro na Edge Function create-staff-user:", createError);
                    const errorBody = await createError.context?.json().catch(() => ({}));
                    const msg = errorBody?.error || createError.message || "Erro ao criar usuário";
                    throw new Error(msg);
                }

                const newUserId = authData?.user?.id;
                console.log("✅ Usuário criado com sucesso:", newUserId);

                showToast(displayMessage, 'success');
            }

            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', password: '', role: 'staff', vehicle_plate: '', vehicle_model: '' });
            fetchTeam();
        } catch (error: any) {
            console.error("Erro operação:", error);
            let msg = error.message;

            if (error.context?.json) {
                const jsonErr = error.context.json;
                msg = jsonErr.error || msg;
            } else if (error.status === 401) {
                msg = "Não autorizado. Sua sessão pode ter expirado. Por favor, faça login novamente.";
            }

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

    // Realtime subscription para atualizações da equipe
    useEffect(() => {
        if (!pharmacyId) return;

        const channelName = `team_pharmacy_${pharmacyId}`;
        console.log(`[Realtime] Iniciando subscription para pharmacy: ${pharmacyId}`);

        const channel = supabase
            .channel(channelName, {
                config: {
                    broadcast: { ack: false },
                    presence: { key: pharmacyId }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `pharmacy_id=eq.${pharmacyId}`
                },
                (payload) => {
                    console.log('[Realtime] Mudança detectada na equipe:', payload);
                    if (payload.eventType === 'INSERT') {
                        setTeam(prev => [...prev, payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setTeam(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    } else if (payload.eventType === 'DELETE') {
                        setTeam(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[Realtime] Status do canal ${channelName}:`, status);

                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] ✅ Canal SUBSCRIBED com sucesso!');
                }

                if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || err) {
                    console.error('[Realtime] ❌ Canal fechou ou erro:', err || status);
                    // Cleanup automático
                    supabase.removeChannel(channel);

                    // Re-subscribe após delay (evita loop rápido)
                    setTimeout(() => {
                        console.log('[Realtime] 🔄 Tentando reconectar automaticamente...');
                        // O useEffect vai re-executar e recriar o canal
                    }, 3000);
                }

                if (status === 'TIMED_OUT') {
                    console.warn('[Realtime] ⏱️ Timeout → possível rede lenta');
                }
            });

        return () => {
            console.log(`[Realtime] 🧹 Cleanup: removendo canal ${channelName}`);
            supabase.removeChannel(channel);
        };
    }, [pharmacyId]); // dependência importante para recriar quando mudar

    // Detectar aba visível e reconectar (resolve throttling em background)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && pharmacyId) {
                console.log('[Realtime] 👁️ Aba visível novamente → forçando refresh dos dados');
                fetchTeam(); // Recarrega dados ao voltar para aba
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [pharmacyId]);

    return (
        <MerchantLayout activeTab="team" title="Gestão de Equipe">
            <div className="p-6">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Gestão de Equipe</h1>
                        <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-bold uppercase tracking-widest mt-1">Gerentes, Caixas e Motoboys</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Botão de Teste Isolado */}
                        <button
                            onClick={async () => {
                                console.log("[TEST] Clicou no botão de teste manual");
                                if (!team[0]) {
                                    console.warn("[TEST] Equipe vazia, não há quem testar");
                                    return;
                                }
                                try {
                                    const { data, error } = await supabase.functions.invoke('delete-user-admin', {
                                        body: {
                                            user_id: team[0].id,
                                            pharmacy_id: pharmacyId
                                        }
                                    });
                                    console.log("[TEST] Resposta:", { data, error });
                                    if (error) alert("Erro no teste: " + error.message);
                                    else alert("Sucesso no teste!");
                                } catch (err: any) {
                                    console.error("[TEST] Erro fatal:", err);
                                    alert("Erro fatal: " + err.message);
                                }
                            }}
                            className="bg-red-600/20 text-red-500 h-10 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
                        >
                            Teste Delete (Primeiro da Lista)
                        </button>

                        {['merchant', 'manager', 'admin'].includes(myRole || '') && (
                            <button
                                onClick={handleAddNewClick}
                                className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                            >
                                <MaterialIcon name="person_add" />
                                <span>Novo Membro</span>
                            </button>
                        )}
                    </div>
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
                                                {member.role === 'motoboy' && (() => {
                                                    const c = contracts[member.id];
                                                    const fee = c && fmt(c.delivery_fee);
                                                    const salary = c && fmt(c.fixed_salary);
                                                    const daily = c && fmt(c.daily_rate);
                                                    const bonus = c && fmt(c.productivity_bonus);
                                                    const hasAny = fee || salary || daily || bonus;
                                                    return (
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {fee && <span className="text-[9px] font-black bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400 px-1.5 py-0.5 rounded">{fee}/entrega</span>}
                                                            {salary && <span className="text-[9px] font-black bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded">{salary}/mês</span>}
                                                            {daily && <span className="text-[9px] font-black bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded">{daily}/dia</span>}
                                                            {bonus && <span className="text-[9px] font-black bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 px-1.5 py-0.5 rounded">🎯 {bonus}</span>}
                                                            {!hasAny && <span className="text-[9px] text-slate-400 italic">sem contrato</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="col-span-2 flex justify-center items-center gap-2">
                                            <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${member.is_active
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                <div className={`size-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'} ${member.is_active ? 'animate-pulse' : ''}`}></div>
                                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                                                    {member.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>

                                            {['merchant', 'manager'].includes(myRole || '') && (
                                                <div className="flex items-center gap-1">
                                                    {member.role === 'motoboy' && (
                                                        <button
                                                            onClick={() => openContractModal(member)}
                                                            className="size-8 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                                                            title="Configurar contrato"
                                                        >
                                                            <MaterialIcon name="request_quote" className="text-[16px]" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEditClick(member)}
                                                        className="size-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                                                        title="Editar acesso"
                                                    >
                                                        <MaterialIcon name="edit" className="text-[16px]" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(member)}
                                                        className="size-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 transition-all flex items-center justify-center"
                                                        title="Remover da equipe"
                                                    >
                                                        <MaterialIcon name="delete" className="text-[16px]" />
                                                    </button>
                                                </div>
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

                                    {formData.role !== 'motoboy' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Telefone</label>
                                            <input
                                                required
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                placeholder="(DDD) 99999-9999"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 pl-1">Será usado como login (ex: 11999999999)</p>
                                        </div>
                                    )}

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

                                    {!editingMember && (
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
                                        </div>
                                    )}

                                    {formData.role === 'motoboy' && (
                                        <>
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

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Telefone (Login)</label>
                                                <input
                                                    required
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                                    placeholder="(DDD) 99999-9999"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 pl-1">Este número será usado como login.</p>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name={editingMember ? "save" : "how_to_reg"} />}
                                        {editingMember ? 'Salvar Alterações' : 'Cadastrar na Equipe'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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

                {/* Contract Modal */}
                {showContractModal && selectedMotoboy && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContractModal(false)}></div>
                        <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e23] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                            <form onSubmit={handleSaveContract} className="p-8 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Contrato & Valores</h2>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedMotoboy.full_name}</p>
                                    </div>
                                    <button type="button" onClick={() => setShowContractModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MaterialIcon name="local_shipping" className="text-green-500" />
                                            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Taxa por Entrega</label>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input type="number" step="0.01" min="0"
                                                value={contractData.delivery_fee}
                                                onChange={e => setContractData({ ...contractData, delivery_fee: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors"
                                                placeholder="0,00" />
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-2">Valor pago por cada entrega finalizada.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <MaterialIcon name="payments" className="text-blue-500" />
                                                <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Salário Fixo</label>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                                <input type="number" step="0.01" min="0"
                                                    value={contractData.fixed_salary}
                                                    onChange={e => setContractData({ ...contractData, fixed_salary: parseFloat(e.target.value) || 0 })}
                                                    className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <MaterialIcon name="calendar_today" className="text-slate-400" />
                                                <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Diária</label>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                                <input type="number" step="0.01" min="0"
                                                    value={contractData.daily_rate}
                                                    onChange={e => setContractData({ ...contractData, daily_rate: parseFloat(e.target.value) || 0 })}
                                                    className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MaterialIcon name="trending_up" className="text-orange-500" />
                                            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Bônus de Produtividade</label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Meta (nº Entregas)</p>
                                                <input type="number" min="0"
                                                    value={contractData.productivity_goal}
                                                    onChange={e => setContractData({ ...contractData, productivity_goal: parseInt(e.target.value) || 0 })}
                                                    className="w-full h-11 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors"
                                                    placeholder="Ex: 50" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Bônus (Valor)</p>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                                    <input type="number" step="0.01" min="0"
                                                        value={contractData.productivity_bonus}
                                                        onChange={e => setContractData({ ...contractData, productivity_bonus: parseFloat(e.target.value) || 0 })}
                                                        className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors"
                                                        placeholder="0,00" />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-2">Motoboy recebe o bônus ao atingir a meta no mês.</p>
                                    </div>
                                </div>

                                <button type="submit" disabled={saving}
                                    className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="save" />}
                                    Salvar Contrato
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </MerchantLayout>
    );
};

export default TeamManagement;
