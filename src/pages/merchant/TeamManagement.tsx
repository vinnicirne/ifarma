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
        role: 'staff', // staff, manager, motoboy
        // Motoboy specific
        vehicle_plate: '',
        vehicle_model: ''
    });

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

            const { data: members, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('pharmacy_id', profile.pharmacy_id)
                .in('role', ['manager', 'staff', 'motoboy', 'merchant']);

            if (members) setTeam(members);
            if (error) console.error(error);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyId) return;

        setSaving(true);
        try {
            const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

            // Usar a Edge Function para criar usuário sem deslogar o admin/manager
            const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
                body: {
                    email: formData.email,
                    password: tempPassword,
                    metadata: {
                        full_name: formData.name,
                        role: formData.role,
                        pharmacy_id: pharmacyId
                    }
                }
            });

            if (authErr || authData?.error) throw new Error(authErr?.message || authData?.error);

            // Criar perfil com dados adicionais
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.name,
                    phone: formData.phone,
                    role: formData.role,
                    pharmacy_id: pharmacyId,
                    is_active: true
                });

            if (profileError) throw profileError;

            alert(`Membro da equipe cadastrado!\nEmail: ${formData.email}\nSenha: ${tempPassword}`);
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', role: 'staff', vehicle_plate: '', vehicle_model: '' });
            fetchTeam();
        } catch (error: any) {
            alert("Erro: " + error.message);
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
                {(myRole === 'merchant' || myRole === 'manager') && (
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
                        <form onSubmit={handleSave} className="p-8">
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
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">WhatsApp / Telefone</label>
                                    <input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="(00) 00000-0000"
                                    />
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
