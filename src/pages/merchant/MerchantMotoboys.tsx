import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantMotoboys = () => { // Assuming session/profile context or fetching internally if wrapped
    const [motoboys, setMotoboys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Getting pharmacy_id from user metadata or profile context is ideal
    // For now assuming we fetch it based on logged user
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        cnh_url: '',
        vehicle_plate: '',
        vehicle_model: ''
    });

    useEffect(() => {
        fetchPharmacyAndMotoboys();
    }, []);

    const fetchPharmacyAndMotoboys = async () => {
        setLoading(true);
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        // 2. Find pharmacy owned by user
        const { data: pharmacy } = await supabase
            .from('pharmacies')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (pharmacy) {
            setPharmacyId(pharmacy.id);
        }

        // 3. Buscar motoboys
        let query = supabase
            .from('profiles')
            .select('id, full_name, phone, email, is_active, is_online, created_at, pharmacy_id')
            .eq('role', 'motoboy');

        // Se tem pharmacy_id, filtrar por ela. Senão, mostrar todos
        if (pharmacy?.id) {
            query = query.eq('pharmacy_id', pharmacy.id);
        }

        const { data: boys, error } = await query;

        console.log('=== DEBUG MOTOBOYS ===');
        console.log('Pharmacy ID:', pharmacy?.id);
        console.log('Motoboys encontrados:', boys);
        console.log('Quantidade:', boys?.length);
        console.log('Erro:', error);

        // Mapear para formato esperado pelo componente
        const formattedMotoboys = (boys || []).map(boy => ({
            id: boy.id,
            name: boy.full_name,
            phone: boy.phone,
            email: boy.email,
            cpf: 'N/A',
            cnh_url: '',
            vehicle_plate: 'N/A',
            vehicle_model: 'N/A',
            status: boy.is_online ? 'Disponível' : 'Offline',
            pharmacy_id: boy.pharmacy_id
        }));

        setMotoboys(formattedMotoboys);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyId) {
            alert("Erro: Farmácia não identificada.");
            return;
        }

        setSaving(true);
        try {
            // 1. Criar usuário Auth primeiro
            const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!'; // Senha temporária

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: tempPassword,
                options: {
                    data: {
                        full_name: formData.name,
                        role: 'motoboy'
                    }
                }
            });

            if (authError) throw new Error(`Erro ao criar usuário: ${authError.message}`);
            if (!authData.user) throw new Error('Usuário não foi criado');

            // 2. Criar/Atualizar perfil com pharmacy_id
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.name,
                    phone: formData.phone,
                    role: 'motoboy',
                    pharmacy_id: pharmacyId, // ← Atribuir automaticamente
                    is_active: true,
                    is_online: false
                });

            if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);

            alert(`Motoboy cadastrado com sucesso!\nEmail: ${formData.email}\nSenha temporária: ${tempPassword}\n\nEnvie essas credenciais para o motoboy.`);

            setShowModal(false);
            setFormData({ name: '', email: '', cpf: '', phone: '', cnh_url: '', vehicle_plate: '', vehicle_model: '' });
            fetchPharmacyAndMotoboys();
        } catch (error: any) {
            alert("Erro ao salvar: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 pb-32 md:pb-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Meus Motoboys</h1>
                    <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-bold uppercase tracking-widest mt-1">Gerencie sua frota</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="sports_motorsports" />
                    <span>Novo Motoboy</span>
                </button>
            </header>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
            ) : motoboys.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#1a2e23] rounded-[32px] border border-dashed border-slate-300 dark:border-white/10">
                    <MaterialIcon name="two_wheeler" className="text-6xl text-slate-300 dark:text-white/10 mb-4" />
                    <p className="text-slate-500 dark:text-white/50 font-bold italic">Nenhum motoboy cadastrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {motoboys.map(boy => (
                        <div key={boy.id} className="bg-white dark:bg-[#1a2e23] p-5 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-black/20 flex items-center justify-center border border-slate-100 dark:border-white/5">
                                    <MaterialIcon name="sports_motorsports" className="text-slate-400 dark:text-[#92c9a9]" />
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${boy.status === 'Disponível' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {boy.status || 'Offline'}
                                </span>
                            </div>

                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white leading-tight">{boy.name}</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5 mb-3">{boy.vehicle_model} • {boy.vehicle_plate}</p>

                            <div className="flex flex-col gap-2 pt-3 border-t border-slate-50 dark:border-white/5">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <MaterialIcon name="badge" className="text-[14px]" />
                                    <span className="text-xs font-medium">CPF: {boy.cpf}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <MaterialIcon name="call" className="text-[14px]" />
                                    <span className="text-xs font-medium">{boy.phone || 'Sem telefone'}</span>
                                </div>
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
                                <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Novo Motoboy</h2>
                                <button type="button" onClick={() => setShowModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Nome Completo</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="Ex: Carlos Silva"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="Ex: carlos@exemplo.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">CPF</label>
                                        <input
                                            required
                                            value={formData.cpf}
                                            onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Telefone</label>
                                        <input
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
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
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Foto CNH (URL)</label>
                                    <input
                                        value={formData.cnh_url}
                                        onChange={e => setFormData({ ...formData, cnh_url: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="save" />}
                                Salvar Cadastro
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantMotoboys;
