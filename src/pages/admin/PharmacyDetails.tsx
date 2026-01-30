import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';
import RealtimeMetrics from '../../components/dashboard/RealtimeMetrics';
import PharmacyFinanceTab from '../../components/admin/PharmacyFinanceTab';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const PharmacyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'settings' | 'finance'>('overview');
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        cep: '',
        address: '',
        addressBase: '',
        number: '',
        complement: '',
        latitude: '',
        longitude: '',
        rating: '5.0',
        is_open: true,
        plan: 'Gratuito',
        status: 'Aprovado',
        cnpj: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        establishment_phone: '',
        merchant_email: '',
        merchant_password: '',
        created_at: '',
        last_access: ''
    });

    const isNew = id === 'new';

    useEffect(() => {
        if (isNew) {
            setActiveTab('settings');
            setInitialLoading(false);
        } else if (id) {
            fetchPharmacyData(id);
        }
    }, [id]);

    const fetchPharmacyData = async (pharmacyId: string) => {
        setInitialLoading(true);
        try {
            // 1. Fetch Pharmacy Details
            const { data: pharmaData, error: pharmaError } = await supabase
                .from('pharmacies')
                .select('*')
                .eq('id', pharmacyId)
                .single();

            if (pharmaError) throw pharmaError;

            if (pharmaData) {
                setFormData(prev => ({
                    ...prev,
                    ...pharmaData,
                    latitude: pharmaData.latitude?.toString() || '',
                    longitude: pharmaData.longitude?.toString() || '',
                    rating: pharmaData.rating?.toString() || '5.0'
                }));
            }

            // 2. Fetch Orders for Analytics
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('pharmacy_id', pharmacyId) // Filter by real pharmacy ID
                .order('created_at', { ascending: false });

            if (!ordersError && ordersData) {
                setOrders(ordersData);
            }

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            alert("Erro ao carregar dados da farmácia.");
            navigate('/dashboard/pharmacies');
        } finally {
            setInitialLoading(false);
        }
    };

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        if (!id || id === 'new') return;

        const channel = supabase
            .channel(`pharmacy-orders-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `pharmacy_id=eq.${id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setOrders(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // --- Analytics Calculations ---
    const analytics = useMemo(() => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
        const ticketMedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Group by Date for Charts (Last 7 days mock)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(date => {
            const dayOrders = orders.filter(o => o.created_at.startsWith(date));
            const revenue = dayOrders.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
            return {
                name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                faturamento: revenue,
                pedidos: dayOrders.length
            };
        });

        return { totalOrders, totalRevenue, ticketMedio, chartData };
    }, [orders]);


    // --- Handlers (Save, CEP, etc) ---
    const handleCEPBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            setLoading(true);
            const viaCEPResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const viaCEPData = await viaCEPResponse.json();

            if (viaCEPData.erro) {
                alert("CEP não encontrado.");
                return;
            }

            const fullAddress = `${viaCEPData.logradouro}, ${viaCEPData.bairro}, ${viaCEPData.localidade} - ${viaCEPData.uf}`;

            const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'google_maps_api_key').single();
            let lat = '', lng = '';

            if (settings?.value) {
                const mapsResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${settings.value}`);
                const mapsData = await mapsResponse.json();
                if (mapsData.results?.[0]) {
                    lat = mapsData.results[0].geometry.location.lat.toString();
                    lng = mapsData.results[0].geometry.location.lng.toString();
                }
            }

            setFormData(prev => ({ ...prev, address: fullAddress, addressBase: fullAddress, latitude: lat, longitude: lng }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Nome é obrigatório");
        setLoading(true);

        const finalAddress = isNew
            ? `${formData.addressBase || formData.address}${formData.number ? `, ${formData.number}` : ''}${formData.complement ? `, ${formData.complement}` : ''}`
            : formData.address;

        const payload = {
            name: formData.name,
            address: finalAddress,
            latitude: parseFloat(formData.latitude) || 0,
            longitude: parseFloat(formData.longitude) || 0,
            rating: parseFloat(formData.rating) || 5.0,
            is_open: formData.is_open,
            plan: formData.plan,
            status: formData.status,
            cnpj: formData.cnpj,
            owner_name: formData.owner_name,
            owner_phone: formData.owner_phone,
            owner_email: formData.owner_email,
            establishment_phone: formData.establishment_phone
        };

        try {
            let pharmacyId = id;
            if (!isNew && id) {
                const { error } = await supabase.from('pharmacies').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('pharmacies').insert([payload]).select().single();
                if (error) throw error;
                pharmacyId = data.id;

                if (formData.merchant_email && formData.merchant_password) {
                    // ... Logic for creating user (omitted for brevity, same as before) ...
                    // Ideally extract this to a helper function
                    const { data: authData, error: authErr } = await supabase.functions.invoke('create-user-admin', {
                        body: { email: formData.merchant_email, password: formData.merchant_password, metadata: { full_name: formData.owner_name, role: 'merchant' } }
                    });
                    if (authErr) console.error("Auth error", authErr);
                    else if (authData?.user) {
                        await supabase.from('profiles').upsert({ id: authData.user.id, email: formData.merchant_email, full_name: formData.owner_name, role: 'merchant', pharmacy_id: pharmacyId });
                    }
                }
            }
            alert("Salvo com sucesso!");
            if (isNew) navigate(`/dashboard/pharmacy/${pharmacyId}`);
        } catch (err: any) {
            alert("Erro ao salvar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center">
            <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 min-h-screen pb-20">
            {/* Header Global */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/pharmacies')} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <MaterialIcon name="arrow_back" className="text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white flex items-center gap-2">
                            <MaterialIcon name="store" className="text-primary" />
                            {isNew ? 'Nova Farmácia' : formData.name}
                        </h1>
                        {!isNew && (
                            <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">
                                <span>Status: {formData.status}</span>
                                <span className="size-1 rounded-full bg-white/20"></span>
                                <span>Plano: {formData.plan}</span>
                                <span className="size-1 rounded-full bg-white/20"></span>
                                <span>Último Acesso: {formData.last_access ? new Date(formData.last_access).toLocaleString('pt-BR') : 'Nunca'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isNew && (
                        <button
                            onClick={() => {
                                localStorage.setItem('impersonatedPharmacyId', id || '');
                                navigate('/gestor');
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white flex h-10 px-4 items-center justify-center rounded-2xl transition-all active:scale-95 gap-2 text-xs font-black uppercase tracking-widest border border-white/10"
                            title="Acessar painel como esta farmácia"
                        >
                            <MaterialIcon name="login" />
                            <span>Acessar</span>
                        </button>
                    )}

                    {activeTab === 'settings' && (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-6 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                        >
                            {loading ? <MaterialIcon name="sync" className="animate-spin" /> : <MaterialIcon name="save" />}
                            <span>Salvar</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs Navigation */}
            {!isNew && (
                <div className="px-4 md:px-0">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
                            { id: 'orders', label: 'Pedidos', icon: 'receipt_long' },
                            { id: 'finance', label: 'Financeiro', icon: 'payments' },
                            { id: 'settings', label: 'Configurações', icon: 'settings' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === tab.id
                                    ? 'bg-white dark:bg-[#1a2e23] text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                            >
                                <MaterialIcon name={tab.icon} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="px-4 md:px-0">

                {/* 1. VISÃO GERAL TAB */}
                {activeTab === 'overview' && !isNew && (
                    <div className="space-y-8 animate-fade-in">

                        {/* New Realtime Metrics Widget */}
                        <RealtimeMetrics orders={orders} />

                        {/* Recent Activity Log */}
                        <div className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <MaterialIcon name="history" className="text-slate-400" />
                                Histórico Recente
                            </h3>
                            <div className="space-y-4">
                                {orders.slice(0, 5).map((order) => (
                                    <div key={order.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <MaterialIcon name="shopping_cart" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Novo pedido recebido <span className="text-primary">#{order.id.substring(0, 6)}</span></p>
                                            <p className="text-xs text-slate-500">Valor de R$ {order.total_price}</p>
                                        </div>
                                        <span className="text-xs font-mono text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                                {orders.length === 0 && <p className="text-slate-500 italic">Nenhuma atividade recente encontrada.</p>}
                            </div>
                        </div>
                    </div>
                )}


                {/* 2. PEDIDOS TAB */}
                {/* 2. PEDIDOS TAB */}
                {
                    activeTab === 'orders' && (
                        <div className="bg-white dark:bg-[#1a2e23] rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-black italic">Todos os Pedidos</h3>
                                <div className="flex gap-2">
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Filtrar por ID ou Valor..."
                                        className="bg-slate-50 dark:bg-black/20 h-10 px-4 rounded-xl text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-black/30 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                        <tr>
                                            <th className="p-4 rounded-tl-2xl">ID</th>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Cliente</th>
                                            <th className="p-4">Valor</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 rounded-tr-2xl">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {orders.filter(o =>
                                            o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            String(o.total_price).includes(searchTerm)
                                        ).map(order => (
                                            <tr key={order.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-mono text-slate-400">#{order.id.substring(0, 6)}</td>
                                                <td className="p-4 font-bold">{new Date(order.created_at).toLocaleDateString()} <span className="text-xs font-normal opacity-50">{new Date(order.created_at).toLocaleTimeString()}</span></td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-200">Cliente App</td>
                                                <td className="p-4 font-black text-primary">R$ {order.total_price}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'pendente' ? 'bg-blue-500/10 text-blue-500' :
                                                        order.status === 'entregue' ? 'bg-green-500/10 text-green-500' :
                                                            'bg-slate-500/10 text-slate-500'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => navigate('/dashboard/tracking')}
                                                        className="text-slate-400 hover:text-primary transition-colors"
                                                        title="Rastrear Pedido"
                                                    >
                                                        <MaterialIcon name="location_on" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {orders.filter(o => o.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && <div className="p-10 text-center text-slate-500">Nenhum pedido encontrado.</div>}
                            </div>
                        </div>
                    )
                }

                {/* 2.5 FINANCE TAB */}
                {activeTab === 'finance' && id && (
                    <PharmacyFinanceTab pharmacyId={id} />
                )}


                {/* 3. SETTINGS TAB (Original Form) */}
                {
                    (activeTab === 'settings' || isNew) && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            {/* Coluna 1: Dados Principais */}
                            <div className="lg:col-span-2 space-y-6">
                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="store" className="text-primary" />
                                        Dados do Estabelecimento
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Nome Fantasia</label>
                                            <input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                                placeholder="Ex: Farmácia Central"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">CNPJ</label>
                                            <input
                                                value={formData.cnpj}
                                                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                                placeholder="00.000.000/0000-00"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Telefone da Loja</label>
                                            <input
                                                value={formData.establishment_phone}
                                                onChange={e => setFormData({ ...formData, establishment_phone: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                                placeholder="(00) 0000-0000"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Plano Atual</label>
                                            <select
                                                value={formData.plan}
                                                onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors appearance-none"
                                            >
                                                <option value="Gratuito">Gratuito</option>
                                                <option value="Bronze">Bronze</option>
                                                <option value="Prata">Prata</option>
                                                <option value="Ouro">Ouro</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="location_on" className="text-primary" />
                                        Endereço e Localização
                                    </h3>

                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">CEP</label>
                                            <input
                                                value={formData.cep}
                                                onChange={e => setFormData({ ...formData, cep: e.target.value })}
                                                onBlur={handleCEPBlur}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                                placeholder="00000-000"
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-8 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Endereço Completo</label>
                                            <input
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                                placeholder="Rua, Número, Bairro..."
                                            />
                                        </div>
                                        <div className="col-span-6 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Latitude</label>
                                            <input value={formData.latitude} readOnly className="h-14 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-slate-500 font-bold outline-none cursor-not-allowed" />
                                        </div>
                                        <div className="col-span-6 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Longitude</label>
                                            <input value={formData.longitude} readOnly className="h-14 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-slate-500 font-bold outline-none cursor-not-allowed" />
                                        </div>

                                        {/* MAP PREVIEW */}
                                        <div className="col-span-12 h-[300px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 relative mt-4">
                                            {formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude)) ? (
                                                <AdminMap
                                                    type="tracking"
                                                    markers={[{
                                                        id: 'pharma-loc',
                                                        lat: parseFloat(formData.latitude),
                                                        lng: parseFloat(formData.longitude),
                                                        type: 'pharmacy'
                                                    }]}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 dark:bg-black/40 flex items-center justify-center flex-col gap-3 text-slate-400">
                                                    <MaterialIcon name="wrong_location" className="text-4xl" />
                                                    <span className="text-xs font-bold uppercase tracking-widest">Localização não definida</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Coluna 2: Dados do Proprietário e Status */}
                            <div className="space-y-6">
                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="person" className="text-primary" />
                                        Proprietário
                                    </h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Nome Completo</label>
                                            <input
                                                value={formData.owner_name}
                                                onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">WhatsApp / Celular</label>
                                            <input
                                                value={formData.owner_phone}
                                                onChange={e => setFormData({ ...formData, owner_phone: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Email Principal</label>
                                            <input
                                                value={formData.owner_email}
                                                onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="toggle_on" className="text-primary" />
                                        Status e Visibilidade
                                    </h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flexItems-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-white/5">
                                            <span className="text-sm font-bold text-white">Loja Aberta?</span>
                                            <div onClick={() => setFormData(prev => ({ ...prev, is_open: !prev.is_open }))} className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${formData.is_open ? 'bg-primary' : 'bg-slate-600'}`}>
                                                <div className={`size-6 bg-white rounded-full shadow-sm transition-transform ${formData.is_open ? 'translate-x-6' : ''}`}></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Status de Aprovação</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors appearance-none"
                                            >
                                                <option value="Pendente">Pendente</option>
                                                <option value="Aprovado">Aprovado</option>
                                                <option value="Bloqueado">Bloqueado</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
};

export default PharmacyDetails;
