import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

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

    const [successModal, setSuccessModal] = useState<{ open: boolean, email?: string, password?: string }>({ open: false });

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Deseja APROVAR esta farmácia e gerar as credenciais de acesso do lojista?')) {
            try {
                setLoading(true);

                // 1. Get Pharmacy Details
                const { data: pharm, error: pharmErr } = await supabase.from('pharmacies').select('*').eq('id', id).single();
                if (pharmErr || !pharm) throw new Error('Farmácia não encontrada');

                const merchantEmail = pharm.owner_email;
                if (!merchantEmail) {
                    throw new Error('E-mail do dono não encontrado.');
                }

                // 2. Generate credentials and try to create user
                const tempPassword = Math.random().toString(36).slice(-8) + 'A1@';

                // Get current session token
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (!currentSession?.access_token) {
                    throw new Error("Sessão expirada. Recarregue a página e faça login novamente.");
                }

                const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://isldwcghygyehuvohxaq.supabase.co'}/functions/v1/create-user-admin`;

                console.log("Tentando criar/aprovar usuário:", merchantEmail);

                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentSession.access_token}`
                    },
                    body: JSON.stringify({
                        email: merchantEmail,
                        password: tempPassword,
                        auth_token: currentSession.access_token,
                        pharmacy_id: id, // Send ID so Edge Function approves it directly (Bypass RLS)
                        metadata: {
                            full_name: pharm.owner_name || pharm.name,
                            role: 'merchant'
                        }
                    })
                });

                const responseText = await response.text();
                console.log("Resposta da Edge Function:", responseText);

                let userWasCreated = false;
                let userId: string | null = null;

                if (!response.ok) {
                    // 🔥 AUTO-LOGOUT SE JWT FOR INVÁLIDO
                    if (response.status === 401) {
                        try {
                            const errorJson = JSON.parse(await response.clone().text());
                            if (errorJson.message === 'Invalid JWT' || errorJson.error === 'Invalid JWT') {
                                console.error("Sessão expirada detectada. Realizando logout forçado.");
                                await supabase.auth.signOut();
                                alert("Sua sessão expirou. Por favor, faça login novamente.");
                                window.location.href = '/login';
                                return;
                            }
                        } catch (e) {
                            // ignore json parse error
                        }
                    }

                    try {
                        const errorJson = JSON.parse(responseText);

                        // Check if user already exists (check error message text)
                        const errorText = (errorJson.error || errorJson.message || '').toLowerCase();

                        if (errorText.includes('already registered') ||
                            errorText.includes('already exists') ||
                            errorText.includes('already been registered')) {

                            console.log("Usuário já existe, buscando ID...");

                            // User exists, we need to find their ID
                            // Check if profile exists first
                            const { data: existingProfile } = await supabase.from('profiles')
                                .select('id')
                                .eq('email', merchantEmail)
                                .single();

                            if (existingProfile) {
                                userId = existingProfile.id;
                                console.log("Profile encontrado:", userId);
                            } else {
                                // Profile doesn't exist but user does in auth
                                // We need to get user from auth - but we can't easily do this from client
                                // We rely on the Edge Function having approved the pharmacy already.
                                alert('✅ Farmácia aprovada!\n\n⚠️ O usuário já existe no sistema mas sem perfil vinculado.\nEntre em contato com o suporte para vincular o acesso.');
                                fetchPharmacies();
                                return;
                            }
                        } else {
                            // Other error
                            const errorMessage = errorJson.error || errorJson.message || JSON.stringify(errorJson);
                            throw new Error(errorMessage);
                        }
                    } catch (e) {
                        if (e instanceof Error && e.message.includes('Farmácia aprovada')) {
                            throw e; // Re-throw our custom message
                        }
                        throw new Error(responseText.substring(0, 200));
                    }
                } else {
                    // User was created successfully
                    const authData = JSON.parse(responseText);
                    const newUser = authData.user;
                    userWasCreated = true;
                    if (authData.user?.id) userId = authData.user.id; // Ensure we get ID
                }

                // 3. Create/Update Profile if we have userId
                if (userId) {
                    console.log("Vinculando perfil para usuário:", userId);
                    const { error: profileErr } = await supabase.from('profiles').upsert({
                        id: userId,
                        email: merchantEmail,
                        full_name: pharm.owner_name || pharm.name,
                        role: 'merchant',
                        phone: pharm.owner_phone,
                        pharmacy_id: id
                    });

                    if (profileErr) {
                        console.error('Erro ao criar/vincular profile:', profileErr);
                        alert('⚠️ Usuário vinculado, mas houve erro ao atualizar dados do perfil: ' + profileErr.message);
                    }
                }

                // 4. Pharmacy Approval is done by Edge Function now. 
                // We just assume success if we got here (function didn't throw)

                if (userWasCreated) {
                    setSuccessModal({
                        open: true,
                        email: merchantEmail,
                        password: tempPassword
                    });
                } else {
                    // USER EXISTS - Show modal but without password (indicate existing user)
                    setSuccessModal({
                        open: true,
                        email: merchantEmail,
                        password: undefined
                    });
                }

                fetchPharmacies();
            } catch (error: any) {
                console.error('Erro na aprovação:', error);
                const errText = error.message || JSON.stringify(error);
                if (errText.includes('Auth session missing') ||
                    errText.includes('Invalid requester token') ||
                    errText.includes('JWT expired')) {
                    alert('⚠️ Sua sessão expirou. Faça login novamente.');
                    await supabase.auth.signOut();
                    navigate('/login');
                    return;
                }
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
                    const { data: { session } } = await supabase.auth.getSession();
                    const { error: deleteFuncErr } = await supabase.functions.invoke('delete-user-admin', {
                        body: { user_id: profile.id },
                        headers: { Authorization: `Bearer ${session?.access_token}` }
                    });
                    if (deleteFuncErr) console.error("Erro ao deletar usuário do Auth:", deleteFuncErr);
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

    const copyToClipboard = () => {
        let text = `Acesso ao Appifarma:\nLink: https://appifarma.com\nEmail: ${successModal.email}`;

        if (successModal.password) {
            text += `\nSenha: ${successModal.password}`;
        } else {
            text += `\n(Use sua senha atual)`;
        }

        navigator.clipboard.writeText(text);
        alert("Copiado para a área de transferência!");
    };

    return (
        <div className="flex flex-col gap-6 relative">
            {/* SUCCESS MODAL OVERLAY */}
            {successModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/10 p-8 rounded-[32px] shadow-2xl max-w-md w-full relative transform transition-all scale-100">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                                <MaterialIcon name="check_circle" className="text-4xl text-green-500" />
                            </div>
                            <h2 className="text-2xl font-black italic text-slate-900 dark:text-white">Farmácia Aprovada!</h2>
                            <p className="text-sm text-slate-500 font-medium">As credenciais de acesso foram geradas.</p>

                            <div className="w-full bg-slate-50 dark:bg-black/30 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 mt-2 text-left space-y-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] block mb-1">E-mail</span>
                                    <code className="text-sm font-bold text-slate-700 dark:text-slate-200 select-all">{successModal.email}</code>
                                </div>
                                {successModal.password ? (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] block mb-1">Senha Temporária</span>
                                        <code className="text-lg font-black text-primary select-all">{successModal.password}</code>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 block mb-1">Aviso</span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Usuário já existia. Senha mantida.</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex w-full gap-3 mt-4">
                                <button
                                    onClick={copyToClipboard}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-background-dark h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <MaterialIcon name="content_copy" />
                                    <span>Copiar Dados</span>
                                </button>
                                <button
                                    onClick={() => setSuccessModal({ open: false })}
                                    className="px-6 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 h-12 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Fechar
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Dica: Envie agora mesmo para o lojista.</p>
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Farmácias</h1>
                    <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest mt-1">Controle de parceiros e aprovações</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/pharmacy/new')} // Navegar para página de criação
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="add_business" />
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
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Loja</th>
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
                                                            <MaterialIcon name="store" className="text-xl text-primary/40" />
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
                                                    <MaterialIcon name="location_on" className="text-slate-400 text-sm" />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{pharm.address || 'Endereço não informado'}</span>
                                                </div>
                                            </td>

                                            <td className="p-5 hidden sm:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${pharm.plan === 'Premium' ? 'bg-[#13ec6d]/10 text-[#13ec6d]' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'}`}>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{pharm.plan || 'Gratuito'}</span>
                                                </div>
                                            </td>

                                            <td className="p-5" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={async () => {
                                                        const newStatus = !pharm.is_open;
                                                        // Optimistic Update
                                                        setPharmacies(prev => prev.map(p => p.id === pharm.id ? { ...p, is_open: newStatus } : p));

                                                        const { error } = await supabase.from('pharmacies').update({ is_open: newStatus }).eq('id', pharm.id);
                                                        if (error) {
                                                            alert('Erro ao atualizar status da loja');
                                                            fetchPharmacies(); // Revert on error
                                                        }
                                                    }}
                                                    className={`h-8 px-3 rounded-full flex items-center gap-2 transition-all ${pharm.is_open
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                                        }`}
                                                >
                                                    <span className={`size-2 rounded-full ${pharm.is_open ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none pt-0.5">
                                                        {pharm.is_open ? 'Aberta' : 'Fechada'}
                                                    </span>
                                                </button>
                                            </td>

                                            <td className="p-5">
                                                {(() => {
                                                    const statusMap: Record<string, { label: string, color: string, dot: string }> = {
                                                        'approved': { label: 'Aprovado', color: 'bg-[#13ec6d]/10 text-[#13ec6d]', dot: 'bg-[#13ec6d]' },
                                                        'pending': { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500', dot: 'bg-yellow-500' },
                                                        'rejected': { label: 'Rejeitado', color: 'bg-red-500/10 text-red-500', dot: 'bg-red-500' },
                                                        'suspended': { label: 'Suspenso', color: 'bg-slate-500/10 text-slate-500', dot: 'bg-slate-500' }
                                                    };

                                                    // Fallback for unknown status or uppercase
                                                    const normalizedStatus = (pharm.status || 'pending').toLowerCase();
                                                    const style = statusMap[normalizedStatus] || statusMap['pending'];

                                                    return (
                                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${style.color}`}>
                                                            <span className={`size-1.5 rounded-full ${style.dot}`}></span>
                                                            {style.label}
                                                        </span>
                                                    );
                                                })()}
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
                                                            <MaterialIcon name="check" className="text-lg" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/pharmacy/${pharm.id}`); }}
                                                        className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white flex items-center justify-center transition-all"
                                                        title="Editar"
                                                    >
                                                        <MaterialIcon name="edit" className="text-lg" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleDelete(pharm.id, e)}
                                                        className="size-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all"
                                                        title="Excluir"
                                                    >
                                                        <MaterialIcon name="delete" className="text-lg" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {pharmacies.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center text-slate-500">
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
