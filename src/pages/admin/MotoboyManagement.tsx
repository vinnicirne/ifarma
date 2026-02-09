import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const MotoboyManagement = ({ profile }: { profile: any }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [motoboys, setMotoboys] = useState<any[]>([]);
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        phone: '', // login
        pharmacy_id: '',
        vehicle_plate: '',
        vehicle_model: '',
        cnh_url: '',
        password: ''
    });

    const fetchData = async () => {
        setLoading(true);
        // Fetch Motoboys da tabela profiles
        const { data: boys, error: boysError } = await supabase
            .from('profiles')
            .select('id, full_name, phone, email, pharmacy_id, is_active, is_online, created_at')
            .eq('role', 'motoboy')
            .order('full_name');

        if (boysError) console.error('Error fetching motoboys:', boysError);

        // Buscar nomes das farmácias
        const { data: pharms } = await supabase
            .from('pharmacies')
            .select('id, name');

        const pharmaMap = (pharms || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

        // Mapear motoboys com nome da farmácia
        const formattedBoys = (boys || []).map(boy => ({
            id: boy.id,
            name: boy.full_name,
            phone: boy.phone,
            email: boy.email,
            pharmacy_id: boy.pharmacy_id,
            pharmacy: { name: pharmaMap[boy.pharmacy_id] || 'Sem farmácia' },
            status: boy.is_online ? 'Disponível' : 'Offline',
            cpf: 'N/A',
            vehicle_plate: 'N/A',
            vehicle_model: 'N/A',
            cnh_url: ''
        }));

        setMotoboys(formattedBoys);

        // Fetch Pharmacies for dropdown
        const { data: pharmsForDropdown } = await supabase
            .from('pharmacies')
            .select('id, name')
            .order('name');
        if (pharmsForDropdown) setPharmacies(pharmsForDropdown);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        if (!formData.name || !formData.pharmacy_id || !formData.phone || !formData.password) {
            return alert("Preencha os campos obrigatórios: Nome, Telefone, Senha e Farmácia.");
        }

        setSaving(true);
        try {
            // 1. Gerar e-mail de login baseado no telefone
            const loginEmail = `${formData.phone.replace(/\D/g, '')}@motoboy.ifarma.com`;

            // Manual Fetch to bypass potential Supabase Client invoke issues
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            if (!freshSession) throw new Error("Sessão expirada. Por favor, faça login novamente.");

            const baseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log("🚀 Custom Invoke Start (Motoboy)");

            const response = await fetch(`${baseUrl}/functions/v1/create-user-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshSession.access_token}`, // Restricted: Real user session token
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    email: loginEmail,
                    password: formData.password,
                    metadata: {
                        role: 'motoboy',
                        full_name: formData.name,
                        pharmacy_id: formData.pharmacy_id,
                        phone: formData.phone,
                        vehicle_plate: formData.vehicle_plate,
                        vehicle_model: formData.vehicle_model,
                        cnh_url: formData.cnh_url
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

            const data = result;

            // Sucesso!
            alert('Motoboy cadastrado com sucesso! Login: ' + formData.phone);
            setShowAddForm(false);
            setFormData({ name: '', cpf: '', phone: '', pharmacy_id: '', vehicle_plate: '', vehicle_model: '', cnh_url: '', password: '' });
            fetchData();

        } catch (err: any) {
            console.error('Erro ao salvar motoboy:', err);
            alert("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este motoboy?")) return;

        // TODO: Idealmente deletaríamos também o usuário do Auth via Edge Function 'delete-user-admin'
        // Por enquanto, deletamos apenas o perfil se as políticas permitirem, ou marcamos como inativo.
        // Como 'delete-user-admin' existe na lista de funções, vamos tentar usar se formos consistentes.
        // Mas para simplificar agora, deletamos da tabela profiles.

        const { error } = await supabase.from('profiles').delete().eq('id', id);

        if (error) {
            alert("Erro ao remover: " + error.message);
        } else {
            fetchData();
        }
    };


    // Transfer/Assign Pharmacy State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignData, setAssignData] = useState({ motoboyId: '', pharmacyId: '' });

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ id: '', name: '', phone: '', vehicle_plate: '', vehicle_model: '' });

    const handleEdit = (moto: any) => {
        setEditData({
            id: moto.id,
            name: moto.name,
            phone: moto.phone,
            vehicle_plate: moto.vehicle_plate === 'N/A' ? '' : moto.vehicle_plate,
            vehicle_model: moto.vehicle_model === 'N/A' ? '' : moto.vehicle_model
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editData.name || !editData.phone) return alert('Nome e Telefone obrigatórios');
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                full_name: editData.name,
                phone: editData.phone
                // Plate/Model update requires generic update or specific fields if they exist in a separate table.
                // Assuming basic profile update for now. 
            }).eq('id', editData.id);

            if (error) throw error;
            alert('Dados atualizados!');
            setShowEditModal(false);
            fetchData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (moto: any) => {
        const newStatus = !moto.is_active;
        const action = newStatus ? 'DESBLOQUEAR' : 'BLOQUEAR';
        if (!confirm(`Deseja realmente ${action} o motoboy ${moto.name}?`)) return;

        const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', moto.id);
        if (error) return alert('Erro ao atualizar status');
        fetchData();
    };

    const handleAssignPharmacy = (moto: any) => {
        setAssignData({ motoboyId: moto.id, pharmacyId: moto.pharmacy_id || '' });
        setShowAssignModal(true);
    };

    const saveAssignPharmacy = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                pharmacy_id: assignData.pharmacyId || null
            }).eq('id', assignData.motoboyId);

            if (error) throw error;
            alert('Vínculo de farmácia atualizado!');
            setShowAssignModal(false);
            fetchData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Contract Management State
    const [showContractModal, setShowContractModal] = useState(false);
    const [selectedMotoboy, setSelectedMotoboy] = useState<any>(null);
    const [contractData, setContractData] = useState({
        delivery_fee: 0,
        fixed_salary: 0,
        daily_rate: 0,
        productivity_goal: 0,
        productivity_bonus: 0
    });

    const openContractModal = async (boy: any) => {
        if (!boy.pharmacy_id) {
            alert('Este motoboy não está vinculado a nenhuma farmácia.');
            return;
        }

        setSelectedMotoboy(boy);
        setContractData({
            delivery_fee: 0,
            fixed_salary: 0,
            daily_rate: 0,
            productivity_goal: 0,
            productivity_bonus: 0
        });

        // Fetch existing contract using the motoboy's pharmacy
        const { data: contract } = await supabase
            .from('courier_contracts')
            .select('*')
            .eq('courier_id', boy.id)
            .eq('pharmacy_id', boy.pharmacy_id)
            .single();

        if (contract) {
            setContractData({
                delivery_fee: contract.delivery_fee || 0,
                fixed_salary: contract.fixed_salary || 0,
                daily_rate: contract.daily_rate || 0,
                productivity_goal: contract.productivity_goal || 0,
                productivity_bonus: contract.productivity_bonus || 0
            });
        }
        setShowContractModal(true);
    };

    const handleSaveContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMotoboy || !selectedMotoboy.pharmacy_id) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('courier_contracts')
                .upsert({
                    courier_id: selectedMotoboy.id,
                    pharmacy_id: selectedMotoboy.pharmacy_id,
                    ...contractData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'courier_id, pharmacy_id' });

            if (error) throw error;

            alert('Contrato atualizado com sucesso (Admin)!');
            setShowContractModal(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving contract:', error);
            alert('Erro ao salvar contrato: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Motoboys</h1>
                    <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest mt-1">Controle de entregadores e vínculos</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="person_add" />
                    <span className="hidden sm:inline">Cadastrar Motoboy</span>
                </button>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Motoboys', value: motoboys.length.toString(), icon: 'moped', color: 'primary' },
                        { label: 'Em Entrega', value: motoboys.filter(m => m.status === 'Em Rota').length.toString(), icon: 'local_shipping', color: 'blue-500' },
                        { label: 'Disponíveis', value: motoboys.filter(m => m.status === 'Disponível').length.toString(), icon: 'check_circle', color: 'green-500' },
                        { label: 'Bloqueados', value: motoboys.filter(m => !m.is_active).length.toString(), icon: 'block', color: 'red-500' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#1a2e23] p-5 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm">
                            <div className={`p-3 rounded-2xl bg-${stat.color}/10 text-${stat.color} w-fit mb-3`}>
                                <MaterialIcon name={stat.icon} />
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] font-black">{stat.label}</p>
                            <p className="text-2xl font-black italic mt-1">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-[#1a2e23] rounded-[40px] border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl animate-fade-in">
                    {loading ? (
                        <div className="p-12 text-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Motoboy</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Farmácia (Vínculo)</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Veículo</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Status</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {motoboys.map((moto) => (
                                        <tr key={moto.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black italic text-sm">
                                                        {moto.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-700 dark:text-white text-sm">{moto.name}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">{moto.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <MaterialIcon name="store" className="text-slate-400 text-sm" />
                                                    <span className={`text-xs font-bold ${moto.pharmacy?.name !== 'Sem farmácia' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 italic'}`}>
                                                        {moto.pharmacy?.name || 'Sem Vínculo'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-xs font-mono text-slate-500">
                                                {moto.vehicle_plate !== 'N/A' ? (
                                                    <span className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">{moto.vehicle_plate}</span>
                                                ) : <span className="opacity-50">-</span>}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${moto.is_online ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                        {moto.is_online ? 'Online' : 'Offline'}
                                                    </span>
                                                    {!moto.is_active && (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-500">BLOQUEADO</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleAssignPharmacy(moto)} title="Trocar Farmácia" className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-colors">
                                                        <MaterialIcon name="swap_horiz" className="text-base" />
                                                    </button>
                                                    <button onClick={() => openContractModal(moto)} title="Contrato" className="size-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors">
                                                        <MaterialIcon name="request_quote" className="text-base" />
                                                    </button>
                                                    <button onClick={() => handleEdit(moto)} title="Editar" className="size-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors">
                                                        <MaterialIcon name="edit" className="text-base" />
                                                    </button>
                                                    <button onClick={() => handleToggleStatus(moto)} title={moto.is_active ? "Bloquear/Banir" : "Desbloquear"} className={`size-8 rounded-lg flex items-center justify-center transition-colors ${moto.is_active ? 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-red-500 hover:text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                                                        <MaterialIcon name={moto.is_active ? "block" : "check_circle"} className="text-base" />
                                                    </button>
                                                    <button onClick={() => handleDelete(moto.id)} title="Excluir" className="size-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                                                        <MaterialIcon name="delete" className="text-base" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {motoboys.length === 0 && (
                                <div className="p-12 text-center text-slate-400 italic">Nenhum motoboy encontrado.</div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Registration Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
                        onClick={() => setShowAddForm(false)}
                    ></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e23] rounded-[40px] shadow-2xl overflow-hidden border border-white/10">
                        <div className="p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black italic tracking-tighter">Novo Motoboy</h2>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"
                                >
                                    <MaterialIcon name="close" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Completo</span>
                                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="Ex: Roberto Carlos" />
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">CPF</span>
                                        <input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="000.000.000-00" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Telefone (Login)</span>
                                        <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="(00) 00000-0000" />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Senha de Acesso</span>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <span className="text-[10px] text-slate-400">Essa senha será usada pelo motoboy para entrar no app.</span>
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Placa</span>
                                        <input value={formData.vehicle_plate} onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="ABC-1234" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Modelo</span>
                                        <input value={formData.vehicle_model} onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="Ex: Fan 160" />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Vincular a Farmácia</span>
                                    <select value={formData.pharmacy_id} onChange={e => setFormData({ ...formData, pharmacy_id: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic appearance-none">
                                        <option value="">Selecione uma farmácia...</option>
                                        {pharmacies.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Foto CNH (URL)</span>
                                    <input value={formData.cnh_url} onChange={e => setFormData({ ...formData, cnh_url: e.target.value })} className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="https://..." />
                                </label>
                            </div>

                            <button onClick={handleSave} disabled={saving} className="w-full mt-8 bg-primary text-background-dark font-black py-5 rounded-3xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? 'Cadastrando...' : 'Finalizar Cadastro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-[#1a2e22] rounded-[32px] p-8 animate-scale-in">
                        <h2 className="text-xl font-black italic mb-6">Editar Motoboy</h2>
                        <div className="space-y-4">
                            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Nome" className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-transparent focus:border-primary border-2 outline-none font-bold" />
                            <input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="Telefone" className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-transparent focus:border-primary border-2 outline-none font-bold" />
                            <button onClick={handleSaveEdit} className="w-full h-12 bg-primary text-background-dark font-black rounded-xl uppercase tracking-widest hover:opacity-90">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Pharmacy Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-[#1a2e22] rounded-[32px] p-8 animate-scale-in">
                        <h2 className="text-xl font-black italic mb-2">Vincular Farmácia</h2>
                        <p className="text-xs text-slate-500 mb-6 font-bold">Selecione onde o motoboy irá operar.</p>
                        <div className="space-y-4">
                            <select value={assignData.pharmacyId} onChange={e => setAssignData({ ...assignData, pharmacyId: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-transparent focus:border-primary border-2 outline-none font-bold appearance-none">
                                <option value="">Sem vínculo (Livre)</option>
                                {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={saveAssignPharmacy} className="w-full h-12 bg-blue-500 text-white font-black rounded-xl uppercase tracking-widest hover:bg-blue-600 transition-colors">Confirmar Vínculo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contract Management Modal (Admin Version) */}
            {showContractModal && selectedMotoboy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContractModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e22] rounded-[32px] shadow-2xl overflow-hidden border border-white/10 animate-scale-in">
                        <form onSubmit={handleSaveContract} className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Contrato Admin</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedMotoboy.name}</p>
                                    <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-0.5">{selectedMotoboy.pharmacy?.name}</p>
                                </div>
                                <button type="button" onClick={() => setShowContractModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>

                            <div className="space-y-6">
                                {/* Delivery Fee */}
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="local_shipping" className="text-slate-400" />
                                            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Taxa por Entrega</label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={contractData.delivery_fee}
                                            onChange={e => setContractData({ ...contractData, delivery_fee: parseFloat(e.target.value) })}
                                            className="w-full h-12 pl-10 pr-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Fixed Salary & Daily Rate */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-2">Salário Fixo</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={contractData.fixed_salary}
                                                onChange={e => setContractData({ ...contractData, fixed_salary: parseFloat(e.target.value) })}
                                                className="w-full h-10 pl-8 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-2">Diária (Freelance)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={contractData.daily_rate}
                                                onChange={e => setContractData({ ...contractData, daily_rate: parseFloat(e.target.value) })}
                                                className="w-full h-10 pl-8 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Productivity Bonus */}
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MaterialIcon name="trending_up" className="text-slate-400" />
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Bônus de Produtividade</label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Meta</p>
                                            <input
                                                type="number"
                                                min="0"
                                                value={contractData.productivity_goal}
                                                onChange={e => setContractData({ ...contractData, productivity_goal: parseInt(e.target.value) })}
                                                className="w-full h-10 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-sm"
                                                placeholder="Qtd"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Bônus</p>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={contractData.productivity_bonus}
                                                    onChange={e => setContractData({ ...contractData, productivity_bonus: parseFloat(e.target.value) })}
                                                    className="w-full h-10 pl-8 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="save" />}
                                Salvar (Admin)
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
