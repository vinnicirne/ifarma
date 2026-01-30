import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const TeamManagement = () => {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [myRole, setMyRole] = useState<string | null>(null);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyId) return;

        setSaving(true);
        try {
            let loginEmail = formData.email;
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
                if (!formData.email) {
                    throw new Error("E-mail é obrigatório.");
                }
                // Gerar senha aleatória se não for motoboy
                loginPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
                displayMessage = `Membro cadastrado!\nEmail: ${loginEmail}\nSenha Temporária: ${loginPassword}`;
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

            alert(displayMessage);
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', password: '', role: 'staff', vehicle_plate: '', vehicle_model: '' });
            fetchTeam();
        } catch (error: any) {
            console.error("Erro cadastro:", error);
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
                msg = "Este usuário (telefone ou email) já está cadastrado no sistema. Tente fazer login ou use outro número.";
            } else if (msg.includes("weak_password") || error.code === 'PASSWORD_TOO_WEAK') {
                msg = "A senha é muito fraca. Certifique-se de seguir os requisitos: 6+ caracteres, números e símbolos.";
            }

            alert("Erro: " + msg);
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
                        onClick={() => setShowModal(true)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.map(member => (
                        <div key={member.id} className="bg-white dark:bg-[#1a2e23] p-5 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`size-12 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-white/5 ${member.role === 'manager' ? 'bg-amber-500/10 text-amber-500' :
                                    member.role === 'staff' ? 'bg-blue-500/10 text-blue-500' :
                                        member.role === 'motoboy' ? 'bg-green-500/10 text-green-500' : 'bg-slate-100 dark:bg-black/20 text-slate-400'
                                    }`}>
                                    <MaterialIcon name={
                                        member.role === 'manager' ? 'admin_panel_settings' :
                                            member.role === 'staff' ? 'point_of_sale' :
                                                member.role === 'motoboy' ? 'sports_motorsports' : 'person'
                                    } />
                                </div>
                                <span className="px-2 py-1 bg-slate-100 dark:bg-black/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    {getRoleLabel(member.role)}
                                </span>
                            </div>

                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white leading-tight">{member.full_name}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{member.email}</p>

                            <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-slate-50 dark:border-white/5">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <MaterialIcon name="call" className="text-[14px]" />
                                    <span className="text-xs font-medium">{member.phone || 'Sem telefone'}</span>
                                </div>
                                {member.role === 'motoboy' && (
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <MaterialIcon name="two_wheeler" className="text-[14px]" />
                                        <span className="text-xs font-medium">Motoboy Ativo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e22] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                        <form onSubmit={handleSave} className="p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Novo Colaborador</h2>
                                <button type="button" onClick={() => setShowModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Cargo / Função</label>
                                    <select
                                        required
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                    >
                                        <option value="staff">Caixa / Atendente</option>
                                        <option value="manager">Gerente de Equipe</option>
                                        <option value="motoboy">Motoboy</option>
                                    </select>
                                </div>

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

                                {/* Campos dinâmicos baseados no cargo */}
                                {formData.role !== 'motoboy' ? (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Email de Acesso</label>
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                            placeholder="ana@suafarma.com"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Campos específicos de Motoboy */}
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
                                        {formData.role === 'motoboy' ? 'Telefone (Login)' : 'WhatsApp / Telefone'}
                                    </label>
                                    <input
                                        required={formData.role === 'motoboy'}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="(00) 00000-0000"
                                    />
                                    {formData.role === 'motoboy' && (
                                        <p className="text-[10px] text-slate-400 mt-1 pl-1">Este número será usado como login.</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="how_to_reg" />}
                                Cadastrar na Equipe
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
