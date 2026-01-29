import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../App'; // We might need to adjust or refactor this shared component import

// Mock helper or import real one if extracted
const MaterialIconComponent = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>
        {name}
    </span>
);

const PharmacyManagement = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPharmacies = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
        if (!error) setPharmacies(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchPharmacies();
    }, []);

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Deseja APROVAR esta farmácia e gerar as credenciais de acesso do lojista?')) {
            try {
                setLoading(true);
                // 1. Fetch pharmacy details
                const { data: pharm, error: fetchErr } = await supabase
                    .from('pharmacies')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (fetchErr || !pharm) throw new Error('Farmácia não encontrada.');

                // 2. Check if a profile already exists
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('pharmacy_id', id)
                    .single();

                if (existingProfile) {
                    // If profile exists, just approve
                    await supabase.from('pharmacies').update({ status: 'Aprovado' }).eq('id', id);
                    alert('Farmácia aprovada! (Usuário já possuía acesso)');
                } else {
                    // 3. Create Credentials
                    const tempPassword = Math.random().toString(36).slice(-8) + '@';
                    const merchantEmail = pharm.owner_email;

                    if (!merchantEmail) {
                        throw new Error('E-mail do dono não encontrado para criar credenciais.');
                    }

                    // 4. Call Edge Function
                    const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
                        body: {
                            email: merchantEmail,
                            password: tempPassword,
                            metadata: {
                                full_name: pharm.owner_name || pharm.name,
                                role: 'merchant'
                            }
                        }
                    });

                    if (authErr || authData?.error) {
                        throw new Error(`Erro ao criar login: ${authErr?.message || authData?.error}`);
                    }

                    const newUser = authData.user;

                    // 5. Create Profile
                    const { error: profileErr } = await supabase.from('profiles').upsert({
                        id: newUser.id,
                        email: merchantEmail,
                        full_name: pharm.owner_name || pharm.name,
                        role: 'merchant',
                        phone: pharm.owner_phone,
                        pharmacy_id: id
                    });

                    if (profileErr) throw profileErr;

                    // 6. Final Approval
                    await supabase.from('pharmacies').update({ status: 'Aprovado' }).eq('id', id);

                    alert(`✅ Farmácia Aprovada!\n\nUm novo login foi criado:\nE-mail: ${merchantEmail}\nSenha Temporária: ${tempPassword}\n\nEnvie os dados para o lojista!`);
                }
                fetchPharmacies();
            } catch (error: any) {
                console.error('Erro na aprovação:', error);
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
                // 1. Buscar o perfil merchant vinculado a esta farmácia
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('pharmacy_id', id)
                    .single();

                // 2. Se existir um perfil, chamar a Edge Function para remover o login (Auth)
                if (profile) {
                    const { error: deleteFuncErr } = await supabase.functions.invoke('delete-user-admin', {
                        body: { user_id: profile.id }
                    });

                    if (deleteFuncErr) {
                        console.error("Erro ao deletar usuário do Auth:", deleteFuncErr);
                        // Não impedir a deleção do registro se falhar o auth, mas avisar console
                    }
                }

                // 3. Deletar a farmácia (Cascade deve deletar o profile, mas garantimos antes)
                const { error } = await supabase.from('pharmacies').delete().eq('id', id);
                if (error) throw error;

                fetchPharmacies();
            } catch (error: any) {
                alert("Erro ao excluir: " + error.message);
            }
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Farmácias</h1>
                    <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest mt-1">Controle de parceiros e aprovações</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/pharmacy/new')} // Navegar para página de criação
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIconComponent name="add_business" />
                    <span className="hidden sm:inline">Nova Farmácia</span>
                </button>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
                ) : (
                    <div className="bg-white dark:bg-[#1a2e23] rounded-[32px] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Farmácia</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] hidden md:table-cell">Localização</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] hidden sm:table-cell">Plano</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Status</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pharmacies.map((pharm) => (
                                        <tr
                                            key={pharm.id}
                                            onClick={() => navigate(`/dashboard/pharmacy/${pharm.id}`)}
                                            className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                        {pharm.logo_url ? (
                                                            <img src={pharm.logo_url} alt={pharm.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <MaterialIconComponent name="store" className="text-xl text-primary/40" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black italic text-slate-900 dark:text-white leading-tight">{pharm.name}</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Desde {new Date(pharm.created_at).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-5 hidden md:table-cell">
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <MaterialIconComponent name="location_on" className="text-slate-400 text-sm" />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{pharm.address || 'Endereço não informado'}</span>
                                                </div>
                                            </td>

                                            <td className="p-5 hidden sm:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${pharm.plan === 'Premium' ? 'bg-[#13ec6d]/10 text-[#13ec6d]' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'}`}>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{pharm.plan || 'Gratuito'}</span>
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pharm.status === 'Aprovado' ? 'bg-[#13ec6d]/10 text-[#13ec6d]' : 'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    <span className={`size-1.5 rounded-full ${pharm.status === 'Aprovado' ? 'bg-[#13ec6d]' : 'bg-yellow-500'}`}></span>
                                                    {pharm.status}
                                                </span>
                                            </td>

                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    {/* Approve Button (if distinct from status) or just Actions */}
                                                    {pharm.status !== 'Aprovado' && (
                                                        <button
                                                            onClick={(e) => handleApprove(pharm.id, e)}
                                                            className="size-9 rounded-xl bg-[#13ec6d]/10 hover:bg-[#13ec6d]/20 text-[#13ec6d] flex items-center justify-center transition-all"
                                                            title="Aprovar"
                                                        >
                                                            <MaterialIconComponent name="check" className="text-lg" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/pharmacy/${pharm.id}`); }}
                                                        className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white flex items-center justify-center transition-all"
                                                        title="Editar"
                                                    >
                                                        <MaterialIconComponent name="edit" className="text-lg" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleDelete(pharm.id, e)}
                                                        className="size-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all"
                                                        title="Excluir"
                                                    >
                                                        <MaterialIconComponent name="delete" className="text-lg" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {pharmacies.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-10 text-center text-slate-500">
                                                Nenhuma farmácia encontrada.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PharmacyManagement;
