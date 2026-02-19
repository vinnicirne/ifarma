import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const CurrencyInput = ({
    value, onChange, placeholder = "0,00"
}: { value: number, onChange: (v: number) => void, placeholder?: string }) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
        <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-full h-11 pl-9 pr-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors"
            placeholder={placeholder}
        />
    </div>
);

const MerchantMotoboys = () => {
    const [motoboys, setMotoboys] = useState<any[]>([]);
    const [contracts, setContracts] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [selectedMotoboy, setSelectedMotoboy] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '', email: '', cpf: '', phone: '', password: '',
        cnh_url: '', vehicle_plate: '', vehicle_model: ''
    });

    const [contractData, setContractData] = useState({
        delivery_fee: 0,
        fixed_salary: 0,
        daily_rate: 0,
        productivity_goal: 0,
        productivity_bonus: 0
    });

    useEffect(() => { fetchPharmacyAndMotoboys(); }, []);

    const fetchPharmacyAndMotoboys = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: pharmacy } = await supabase
            .from('pharmacies').select('id').eq('user_id', user.id).single();

        if (pharmacy) setPharmacyId(pharmacy.id);

        let query = supabase.from('profiles')
            .select('id, full_name, phone, email, is_active, is_online, battery_level, is_charging, vehicle_plate, vehicle_model, pharmacy_id')
            .eq('role', 'motoboy');

        if (pharmacy?.id) query = query.eq('pharmacy_id', pharmacy.id);

        const { data: boys } = await query;
        const formattedMotoboys = (boys || []).map(boy => ({
            id: boy.id,
            name: boy.full_name,
            phone: boy.phone,
            email: boy.email,
            vehicle_plate: boy.vehicle_plate || 'N/A',
            vehicle_model: boy.vehicle_model || 'N/A',
            status: boy.is_online ? 'Disponível' : 'Offline',
            battery_level: boy.battery_level,
            is_charging: boy.is_charging,
            pharmacy_id: boy.pharmacy_id
        }));
        setMotoboys(formattedMotoboys);

        // Buscar contratos de todos os motoboys de uma vez
        if (boys && boys.length > 0) {
            const ids = boys.map(b => b.id);
            const { data: contractsData } = await supabase
                .from('courier_contracts')
                .select('*')
                .in('courier_id', ids);

            const contractMap: Record<string, any> = {};
            (contractsData || []).forEach(c => { contractMap[c.courier_id] = c; });
            setContracts(contractMap);
        }

        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pharmacyId) { alert("Erro: Farmácia não identificada."); return; }
        setSaving(true);
        try {
            const loginEmail = `${formData.phone.replace(/\D/g, '')}@motoboy.ifarma.com`;
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) throw new Error("Sessão expirada.");

            const { data, error } = await supabase.functions.invoke('create-user-admin', {
                body: {
                    email: loginEmail, password: formData.password, pharmacy_id: pharmacyId,
                    metadata: {
                        role: 'motoboy', full_name: formData.name, pharmacy_id: pharmacyId,
                        phone: formData.phone, vehicle_plate: formData.vehicle_plate,
                        vehicle_model: formData.vehicle_model, cnh_url: formData.cnh_url
                    }
                }
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            alert(`Motoboy cadastrado! Login: ${formData.phone}`);
            setShowModal(false);
            setFormData({ name: '', email: '', cpf: '', phone: '', password: '', cnh_url: '', vehicle_plate: '', vehicle_model: '' });
            fetchPharmacyAndMotoboys();
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const openContractModal = async (boy: any) => {
        setSelectedMotoboy(boy);
        // Preencher com dados do cache local, ou buscar novamente
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
            const { error } = await supabase.rpc('upsert_courier_contract_admin', {
                p_courier_id: selectedMotoboy.id,
                p_pharmacy_id: pharmacyId,
                p_delivery_fee: contractData.delivery_fee,
                p_fixed_salary: contractData.fixed_salary,
                p_daily_rate: contractData.daily_rate,
                p_productivity_goal: contractData.productivity_goal,
                p_productivity_bonus: contractData.productivity_bonus
            });

            if (error) throw error;

            // Atualizar cache local
            setContracts(prev => ({
                ...prev,
                [selectedMotoboy.id]: { ...contractData, courier_id: selectedMotoboy.id }
            }));

            alert('Contrato salvo com sucesso!');
            setShowContractModal(false);
        } catch (err: any) {
            alert('Erro ao salvar contrato: ' + (err.message || JSON.stringify(err)));
        } finally {
            setSaving(false);
        }
    };

    const fmt = (val: number) => val > 0 ? `R$ ${val.toFixed(2).replace('.', ',')}` : '—';

    return (
        <div className="p-6 pb-32 md:pb-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Meus Motoboys</h1>
                    <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-bold uppercase tracking-widest mt-1">Gerencie sua frota e contratos</p>
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
                <div className="py-20 flex justify-center">
                    <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            ) : motoboys.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#1a2e23] rounded-[32px] border border-dashed border-slate-300 dark:border-white/10">
                    <MaterialIcon name="two_wheeler" className="text-6xl text-slate-300 dark:text-white/10 mb-4" />
                    <p className="text-slate-500 dark:text-white/50 font-bold italic">Nenhum motoboy cadastrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {motoboys.map(boy => {
                        const contract = contracts[boy.id];
                        const hasContract = contract && (contract.delivery_fee > 0 || contract.fixed_salary > 0 || contract.daily_rate > 0);
                        return (
                            <div key={boy.id} className="bg-white dark:bg-[#1a2e23] p-5 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="size-12 rounded-2xl bg-slate-100 dark:bg-black/20 flex items-center justify-center border border-slate-100 dark:border-white/5">
                                        <MaterialIcon name="sports_motorsports" className="text-slate-400 dark:text-[#92c9a9]" />
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${boy.status === 'Disponível' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {boy.status || 'Offline'}
                                        </span>
                                        {boy.battery_level !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <MaterialIcon
                                                    name={boy.is_charging ? "battery_charging_full" : boy.battery_level > 20 ? "battery_full" : "battery_alert"}
                                                    className={`text-sm ${boy.battery_level <= 20 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                                                />
                                                <span className="text-[9px] font-black text-slate-500">{boy.battery_level}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black italic text-slate-900 dark:text-white leading-tight">{boy.name}</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{boy.vehicle_model} • {boy.vehicle_plate}</p>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-2">
                                    <MaterialIcon name="call" className="text-[14px]" />
                                    <span className="text-xs font-medium">{boy.phone || 'Sem telefone'}</span>
                                </div>

                                {/* Contract Summary */}
                                <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex-1`}>
                                    {hasContract ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {contract.delivery_fee > 0 && (
                                                <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3">
                                                    <p className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Por Entrega</p>
                                                    <p className="text-sm font-black text-green-700 dark:text-green-300 mt-0.5">{fmt(contract.delivery_fee)}</p>
                                                </div>
                                            )}
                                            {contract.fixed_salary > 0 && (
                                                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3">
                                                    <p className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Salário Fixo</p>
                                                    <p className="text-sm font-black text-blue-700 dark:text-blue-300 mt-0.5">{fmt(contract.fixed_salary)}</p>
                                                </div>
                                            )}
                                            {contract.daily_rate > 0 && (
                                                <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3">
                                                    <p className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Diária</p>
                                                    <p className="text-sm font-black text-purple-700 dark:text-purple-300 mt-0.5">{fmt(contract.daily_rate)}</p>
                                                </div>
                                            )}
                                            {contract.productivity_bonus > 0 && (
                                                <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3">
                                                    <p className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Bônus Meta</p>
                                                    <p className="text-sm font-black text-orange-700 dark:text-orange-300 mt-0.5">{fmt(contract.productivity_bonus)}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600">
                                            <MaterialIcon name="info" className="text-sm" />
                                            <p className="text-[10px] font-bold italic">Contrato não configurado</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => openContractModal(boy)}
                                    className="w-full mt-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/10 dark:hover:text-primary transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-white/5"
                                >
                                    <MaterialIcon name="request_quote" className="text-base" />
                                    <span>{hasContract ? 'Editar Contrato' : 'Configurar Contrato'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Novo Motoboy */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e22] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                        <form onSubmit={handleSave} className="p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Novo Motoboy</h2>
                                <button type="button" onClick={() => setShowModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Nome Completo</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="Ex: Carlos Silva" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Telefone (Login)</label>
                                        <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="(00) 00000-0000" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">CPF</label>
                                        <input required value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="000.000.000-00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Senha de Acesso</label>
                                    <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="Mínimo 6 caracteres" />
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1">Senha simples para o motoboy logar.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Placa</label>
                                        <input required value={formData.vehicle_plate} onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="ABC-1234" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 pl-1 block mb-1">Modelo Moto</label>
                                        <input required value={formData.vehicle_model} onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic focus:border-primary transition-colors" placeholder="Ex: Fan 160" />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="save" />}
                                Salvar Cadastro
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Contrato */}
            {showContractModal && selectedMotoboy && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContractModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e23] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
                        <form onSubmit={handleSaveContract} className="p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Contrato & Valores</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedMotoboy.name}</p>
                                </div>
                                <button type="button" onClick={() => setShowContractModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Taxa por Entrega */}
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MaterialIcon name="local_shipping" className="text-green-500" />
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Taxa por Entrega</label>
                                    </div>
                                    <CurrencyInput value={contractData.delivery_fee} onChange={v => setContractData({ ...contractData, delivery_fee: v })} />
                                    <p className="text-[9px] text-slate-400 mt-2 px-1">Valor pago ao motoboy por cada entrega finalizada.</p>
                                </div>

                                {/* Salário Fixo + Diária */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MaterialIcon name="payments" className="text-blue-500" />
                                            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Salário Fixo</label>
                                        </div>
                                        <CurrencyInput value={contractData.fixed_salary} onChange={v => setContractData({ ...contractData, fixed_salary: v })} />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MaterialIcon name="calendar_today" className="text-slate-400" />
                                            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Diária</label>
                                        </div>
                                        <CurrencyInput value={contractData.daily_rate} onChange={v => setContractData({ ...contractData, daily_rate: v })} />
                                    </div>
                                </div>

                                {/* Bônus de Produtividade */}
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MaterialIcon name="trending_up" className="text-orange-500" />
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Bônus de Produtividade</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Meta (nº Entregas)</p>
                                            <input
                                                type="number" min="0"
                                                value={contractData.productivity_goal}
                                                onChange={e => setContractData({ ...contractData, productivity_goal: parseInt(e.target.value) || 0 })}
                                                className="w-full h-11 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-primary font-bold italic text-sm transition-colors"
                                                placeholder="Ex: 50"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Bônus (Valor)</p>
                                            <CurrencyInput value={contractData.productivity_bonus} onChange={v => setContractData({ ...contractData, productivity_bonus: v })} />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-2 px-1">Motoboy recebe o bônus ao atingir a meta no mês.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 h-12 bg-primary text-background-dark rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {saving ? <div className="animate-spin size-4 border-2 border-background-dark border-t-transparent rounded-full"></div> : <MaterialIcon name="save" />}
                                Salvar Contrato
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantMotoboys;
