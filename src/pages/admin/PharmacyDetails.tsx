import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';
import RealtimeMetrics from '../../components/dashboard/RealtimeMetrics';
import PharmacyFinanceTab from '../../components/admin/PharmacyFinanceTab';

const PharmacyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'settings' | 'finance'>('overview');
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Refs for File Upload
    const logoInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        cep: '',
        address: '', // Campo legado (concatenação)
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
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
        last_access: '',
        logo_url: '',
        banner_url: ''
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
                    rating: pharmaData.rating?.toString() || '5.0',
                    logo_url: pharmaData.logo_url || '',
                    banner_url: pharmaData.banner_url || '',
                    // Address fields
                    cep: pharmaData.zip || pharmaData.cep || '',
                    street: pharmaData.street || '',
                    number: pharmaData.number || '',
                    neighborhood: pharmaData.neighborhood || '',
                    city: pharmaData.city || '',
                    state: pharmaData.state || ''
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

    // --- FILE UPLOAD HANDLER ---
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData(prev => ({ ...prev, [type === 'logo' ? 'logo_url' : 'banner_url']: base64String }));
        };
        reader.readAsDataURL(file);
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

            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            let lat = '', lng = '';

            if (apiKey) {
                const mapsResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`);
                const mapsData = await mapsResponse.json();
                if (mapsData.results?.[0]) {
                    lat = mapsData.results[0].geometry.location.lat.toString();
                    lng = mapsData.results[0].geometry.location.lng.toString();
                }
            }

            setFormData(prev => ({
                ...prev,
                address: fullAddress, // Legado
                street: viaCEPData.logradouro,
                neighborhood: viaCEPData.bairro,
                city: viaCEPData.localidade,
                state: viaCEPData.uf,
                latitude: lat,
                longitude: lng
            }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Nome é obrigatório");
        setLoading(true);

        // Concatenate address for legacy support if needed, or primarily rely on columns
        const finalAddress = isNew
            ? `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}`
            : formData.address;

        const payload = {
            name: formData.name,
            address: finalAddress,
            zip: formData.cep, // Saving ZIP to column
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
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
            establishment_phone: formData.establishment_phone,
            logo_url: formData.logo_url,
            banner_url: formData.banner_url
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
                        {['overview', 'orders', 'finance', 'settings'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === tab
                                    ? 'bg-white dark:bg-[#1a2e23] text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                            >
                                <span className="uppercase">{tab === 'overview' ? 'Visão Geral' : tab === 'finance' ? 'Financeiro' : tab === 'settings' ? 'Configurações' : 'Pedidos'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="px-4 md:px-0">
                {/* OMITTED TABS (Overview, Orders, Finance) - Rendered if active */}
                {activeTab === 'overview' && !isNew && (
                    <div className="space-y-8 animate-fade-in"><RealtimeMetrics orders={orders} /></div>
                )}
                {/* 2. ORDERS TAB */}
                {activeTab === 'orders' && !isNew && (
                    <div className="bg-white dark:bg-[#1a2e23] rounded-[40px] border border-slate-200 dark:border-white/5 overflow-hidden animate-fade-in shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Pedido</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Cliente</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Valor</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Status</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Data</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400 italic font-medium">
                                                Nenhum pedido encontrado para esta farmácia.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-6 font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</td>
                                                <td className="p-6 font-bold text-slate-700 dark:text-slate-200">{order.customer?.name || 'Cliente não identificado'}</td>
                                                <td className="p-6 font-bold text-primary">
                                                    {(order.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            order.status === 'canceled' ? 'bg-red-500/10 text-red-500' :
                                                                'bg-amber-500/10 text-amber-500'
                                                        }`}>
                                                        {order.status === 'completed' ? 'Concluído' :
                                                            order.status === 'canceled' ? 'Cancelado' :
                                                                order.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-sm text-slate-500">
                                                    {new Date(order.created_at).toLocaleDateString('pt-BR')} <span className="text-[10px] opacity-70">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="p-6">
                                                    <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                                        <MaterialIcon name="visibility" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ... (Orders Tab Logic would go here) ... */}

                {/* 3. SETTINGS TAB */}
                {
                    (activeTab === 'settings' || isNew) && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            <div className="lg:col-span-2 space-y-6">

                                {/* 3.1 IMAGENS DA LOJA (LOGO & BANNER) */}
                                <section className="bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-[40px] shadow-xl overflow-hidden">
                                    {/* BANNER AREA */}
                                    <div className="h-48 bg-slate-200 relative group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                                        {formData.banner_url ? (
                                            <img src={formData.banner_url} alt="Capa" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <span className="font-bold flex items-center gap-2"><MaterialIcon name="image" /> Adicionar Capa</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold flex items-center gap-2"><MaterialIcon name="upload" /> Alterar Capa</span>
                                        </div>
                                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                                    </div>

                                    <div className="px-8 pb-8 relative">
                                        <div className="-mt-12 mb-6 flex items-end">
                                            <div className="size-32 rounded-[32px] bg-white dark:bg-zinc-800 p-2 shadow-xl relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                                <div className="w-full h-full rounded-[24px] bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                                                    {formData.logo_url ? (
                                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <MaterialIcon name="store" className="text-4xl text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="absolute inset-2 bg-black/50 rounded-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MaterialIcon name="edit" className="text-white" />
                                                </div>
                                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">Clique nas imagens para alterar.</p>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="store" className="text-primary" />
                                        Dados do Estabelecimento
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Nome Fantasia</label>
                                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">CNPJ</label>
                                            <input value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Telefone da Loja</label>
                                            <input value={formData.establishment_phone} onChange={e => setFormData({ ...formData, establishment_phone: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Plano Atual</label>
                                            <select value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors appearance-none">
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
                                            <input value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} onBlur={handleCEPBlur} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="00000-000" />
                                        </div>
                                        <div className="col-span-12 md:col-span-8 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Rua / Logradouro</label>
                                            <input value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Número</label>
                                            <input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Bairro</label>
                                            <input value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Latitude</label>
                                            <input value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Longitude</label>
                                            <input value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Cidade / UF</label>
                                            <input value={`${formData.city} - ${formData.state}`} readOnly className="h-14 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-4 text-slate-500 font-bold outline-none cursor-not-allowed" />
                                        </div>

                                        {/* MAP PREVIEW */}
                                        <div className="col-span-12 h-[300px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 relative mt-4">
                                            {formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude)) ? (
                                                <AdminMap type="tracking" markers={[{ id: 'pharma-loc', lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude), type: 'pharmacy' }]} />
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
                                            <input value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">WhatsApp / Celular</label>
                                            <input value={formData.owner_phone} onChange={e => setFormData({ ...formData, owner_phone: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Email Principal</label>
                                            <input value={formData.owner_email} onChange={e => setFormData({ ...formData, owner_email: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" />
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="toggle_on" className="text-primary" />
                                        Status e Visibilidade
                                    </h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-white/5">
                                            <span className="text-sm font-bold text-white">Loja Aberta?</span>
                                            <div onClick={() => setFormData(prev => ({ ...prev, is_open: !prev.is_open }))} className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${formData.is_open ? 'bg-primary' : 'bg-slate-600'}`}>
                                                <div className={`size-6 bg-white rounded-full shadow-sm transition-transform ${formData.is_open ? 'translate-x-6' : ''}`}></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Status de Aprovação</label>
                                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors appearance-none">
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
