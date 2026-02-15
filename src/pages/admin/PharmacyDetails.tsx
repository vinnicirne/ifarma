import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';
import RealtimeMetrics from '../../components/dashboard/RealtimeMetrics';
import PharmacyFinanceTab from '../../components/admin/PharmacyFinanceTab';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places" | "visualization")[] = ["places", "visualization"];

// --- HELPERS ---
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 600) {
    let t: number | undefined;
    return (...args: Parameters<T>) => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), wait);
    };
}

const parseNumberSafe = (value: string, fallback = 0) => {
    // Converte "10,5" -> "10.5" e garante número finito
    const v = value.toString().trim().replace(',', '.');
    if (v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const PharmacyDetails = () => {
    const [googleKey, setGoogleKey] = useState<string | null>(null);

    // Fetch Google Maps Key (Same logic as AdminDashboard)
    useEffect(() => {
        const fetchGoogleKey = async () => {
            const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (envKey) {
                setGoogleKey(envKey);
                return;
            }
            const { data: settings } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'google_maps_api_key')
                .single();

            if (settings?.value) {
                setGoogleKey(settings.value);
            }
        };
        fetchGoogleKey();
    }, []);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleKey ?? '',
        libraries: libraries,
        preventGoogleFontsLoading: true
    });

    const canUseMaps = !!googleKey && isLoaded;

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();

            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat().toString();
                const lng = place.geometry.location.lng().toString();

                let street = '';
                let street_number = '';
                let neighborhood = '';
                let city = '';
                let state = '';
                let cep = '';

                // Mapping Google Address Components to our fields
                place.address_components?.forEach(component => {
                    const types = component.types;
                    if (types.includes('route')) street = component.long_name;
                    if (types.includes('street_number')) street_number = component.long_name;
                    if (types.includes('sublocality_level_1') || types.includes('neighborhood')) neighborhood = component.long_name;
                    if (types.includes('administrative_area_level_2') || types.includes('locality')) city = component.long_name;
                    if (types.includes('administrative_area_level_1')) state = component.short_name;
                    if (types.includes('postal_code')) cep = component.long_name;
                });

                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    street: street || prev.street,
                    number: street_number || prev.number,
                    neighborhood: neighborhood || prev.neighborhood,
                    city: city || prev.city,
                    state: state || prev.state,
                    cep: cep || prev.cep,
                    address: place.formatted_address || prev.address
                }));
            }
        }
    };

    const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
        setAutocomplete(autocompleteInstance);
    };

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

    // Refs for Geocoding (Debounce & Cache)
    const lastGeocodeKeyRef = useRef<string>('');
    const isGeocodingRef = useRef(false);
    const formDataRef = useRef(formData);

    // Update ref with latest formData on every render to ensure geocoding uses current values
    formDataRef.current = formData;

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
        plan: 'FREE',
        status: 'pending', // Manter como string inicialmente para compatibilidade com UI
        cnpj: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        phone: '', // Adicionado para corrigir erro de TS no handleSave
        establishment_phone: '',
        merchant_email: '',
        merchant_password: '',
        created_at: '',
        last_access: '',
        logo_url: '',
        banner_url: '',
        // Delivery Fees
        delivery_fee_type: 'fixed',
        delivery_fee_fixed: 0,
        delivery_fee_per_km: 0,
        delivery_ranges: [] as { max_km: number, fee: number }[],
        delivery_free_min_km: 0,
        delivery_free_min_value: 0,
        delivery_max_km: 15,
        min_order_value: 0,
        allows_pickup: true,
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
            // Validate UUID before query
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(pharmacyId)) {
                console.warn("Invalid Pharmacy ID for fetch:", pharmacyId);
                return;
            }

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
                    state: pharmaData.state || '',
                    // Delivery Fees
                    delivery_fee_type: pharmaData.delivery_fee_type || 'fixed',
                    delivery_fee_fixed: pharmaData.delivery_fee_fixed || 0,
                    delivery_fee_per_km: pharmaData.delivery_fee_per_km || 0,
                    delivery_ranges: pharmaData.delivery_ranges || [],
                    delivery_free_min_km: pharmaData.delivery_free_min_km || 0,
                    delivery_free_min_value: pharmaData.delivery_free_min_value || 0,
                    delivery_max_km: pharmaData.delivery_max_km || 15,
                    status: pharmaData.status || 'pending'
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
    const [uploading, setUploading] = useState<{ logo: boolean, banner: boolean }>({ logo: false, banner: false });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id === 'new' ? 'temp' : id}_${type}_${Date.now()}.${fileExt}`;
            const filePath = `pharmacies/${fileName}`;

            // Upload to Supabase Storage (Bucket 'app-assets' used as general assets bucket)
            const { error: uploadError } = await supabase.storage
                .from('app-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('app-assets')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [type === 'logo' ? 'logo_url' : 'banner_url']: publicUrl }));
        } catch (err: any) {
            console.error('Erro no upload:', err);
            alert('Erro ao enviar imagem: ' + err.message);
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleApprovePharmacy = async () => {
        if (!id || id === 'new') return;

        const confirmApprove = window.confirm("Deseja aprovar esta farmácia? Isso verificará se há uma assinatura ativa.");
        if (!confirmApprove) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                alert('Sessão expirada. Faça login novamente.');
                return;
            }

            const { data, error } = await supabase.functions.invoke(
                'create-user-admin',
                {
                    body: {
                        pharmacy_id: id,
                        approve_pharmacy: true
                    },
                    headers: {
                        Authorization: `Bearer ${session.access_token}`
                    }
                }
            );

            if (error) {
                console.error("Erro na aprovação:", error);
                const errorBody = await error.context?.json().catch(() => ({}));
                const msg = errorBody?.error || error.message || "Erro desconhecido";
                alert(`Erro: ${msg}`);
                return;
            }

            if (data?.error) {
                alert(`Erro: ${data.error}`);
                return;
            }

            alert('Farmácia aprovada com sucesso!');
            fetchPharmacyData(id);

        } catch (err: any) {
            console.error("Erro ao aprovar:", err);
            alert("Erro ao aprovar farmácia.");
        } finally {
            setLoading(false);
        }
    };

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        if (!id || id === 'new') return;

        // Validate UUID for subscription using local regex since utils import might not be available or circle dep
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) return;

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

    // --- Geocoding Functions ---
    const geocodeAddress = async (address: string): Promise<{ lat: string, lng: string, formattedAddress?: string } | null> => {
        const apiKey = googleKey;
        if (!apiKey) {
            console.warn('Google Maps API key not found');
            return null;
        }

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results?.[0]) {
                const result = data.results[0];
                return {
                    lat: result.geometry.location.lat.toString(),
                    lng: result.geometry.location.lng.toString(),
                    formattedAddress: result.formatted_address
                };
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return null;
    };

    const reverseGeocode = async (lat: number, lng: number): Promise<any> => {
        const apiKey = googleKey;
        if (!apiKey) return null;

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results?.[0]) {
                const result = data.results[0];
                const addressComponents = result.address_components;

                // Extract address parts
                const getComponent = (type: string) =>
                    addressComponents.find((c: any) => c.types.includes(type))?.long_name || '';

                return {
                    street: getComponent('route'),
                    number: getComponent('street_number'),
                    neighborhood: getComponent('sublocality_level_1') || getComponent('neighborhood'),
                    city: getComponent('administrative_area_level_2') || getComponent('locality'),
                    state: getComponent('administrative_area_level_1'),
                    cep: getComponent('postal_code'),
                    formattedAddress: result.formatted_address
                };
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
        return null;
    };

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

            // Build full address for geocoding
            const fullAddress = `${viaCEPData.logradouro}, ${viaCEPData.bairro}, ${viaCEPData.localidade} - ${viaCEPData.uf}, Brasil`;

            // Get coordinates from Google Maps
            const geoResult = await geocodeAddress(fullAddress);

            setFormData(prev => ({
                ...prev,
                address: fullAddress, // Legado
                street: viaCEPData.logradouro,
                neighborhood: viaCEPData.bairro,
                city: viaCEPData.localidade,
                state: viaCEPData.uf,
                latitude: geoResult?.lat || '',
                longitude: geoResult?.lng || ''
            }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Advanced Geocoding Logic ---
    const geocodeFromForm = async () => {
        if (isGeocodingRef.current) return;
        const currentData = formDataRef.current;
        if (!currentData.street || !currentData.city || !currentData.state) return;

        const fullAddress =
            `${currentData.street}${currentData.number ? ', ' + currentData.number : ''}, ` +
            `${currentData.neighborhood ? currentData.neighborhood + ', ' : ''}` +
            `${currentData.city} - ${currentData.state}, Brasil`;

        // avoid repeating geocode for same string
        const normalizedKey = fullAddress.trim().toLowerCase();
        if (normalizedKey === lastGeocodeKeyRef.current) return;
        lastGeocodeKeyRef.current = normalizedKey;

        isGeocodingRef.current = true;
        try {
            const geoResult = await geocodeAddress(fullAddress);
            if (geoResult) {
                setFormData(prev => ({
                    ...prev,
                    latitude: geoResult.lat,
                    longitude: geoResult.lng,
                    address: geoResult.formattedAddress || prev.address,
                }));
            }
        } finally {
            isGeocodingRef.current = false;
        }
    };

    const debouncedGeocodeFromForm = useMemo(
        () => debounce(geocodeFromForm, 700),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [googleKey] // Recreate only if API key changes
    );

    // Auto-trigger geocode when address changes
    useEffect(() => {
        if (!googleKey) return;
        if (!formData.street || !formData.city || !formData.state) return;

        debouncedGeocodeFromForm();

        // cleanup if needed
        return () => { };
    }, [
        googleKey,
        formData.street,
        formData.number,
        formData.neighborhood,
        formData.city,
        formData.state,
        debouncedGeocodeFromForm
    ]);

    // Handler for manual address changes (Button)
    const handleAddressChange = () => {
        geocodeFromForm();
    };

    const handleSave = async () => {
        if (loading) return; // Prevent double submit
        if (!formData.name) return alert("Nome é obrigatório");
        setLoading(true);

        // Status mapping removed - using separate flow

        // Mapeia plano (PT -> EN) para satisfazer check constraint
        const planMap: Record<string, string> = {
            'FREE': 'FREE',
            'PROFESSIONAL': 'PROFESSIONAL',
            'ENTERPRISE': 'ENTERPRISE', // Padronizado
            // Fallbacks for legacy values
            'Gratuito': 'FREE',
            'Básico': 'PROFESSIONAL',
            'Pro': 'PROFESSIONAL', // Manter apenas para compatibilidade de leitura antiga
            'Bronze': 'PROFESSIONAL',
            'Prata': 'ENTERPRISE',
            'Ouro': 'ENTERPRISE',
            'basic': 'FREE',
            'pro': 'PROFESSIONAL',
            'premium': 'ENTERPRISE', // Mapeia antigo premium para enterprise
            'enterprise': 'ENTERPRISE'
        };


        const planValue = planMap[formData.plan] || 'FREE';

        // Safe numbers for delivery fees
        const safeFixed = Number.isFinite(formData.delivery_fee_fixed) ? formData.delivery_fee_fixed : 0;
        const safePerKm = Number.isFinite(formData.delivery_fee_per_km) ? formData.delivery_fee_per_km : 0;

        // Mapeamento correto dos campos do formulário para o banco de dados
        // address e establishment_phone são campos legados/redundantes mas mantidos por compatibilidade
        const payload: any = {
            name: formData.name,
            cnpj: formData.cnpj || null,
            // Endereço
            zip: formData.cep,
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            address: `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}`,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            // Contato
            phone: formData.establishment_phone || formData.phone,
            establishment_phone: formData.establishment_phone,
            is_open: formData.is_open,
            // status: REMOVED (Managed via separate flow)
            plan: planValue,
            rating: parseFloat(formData.rating) || 5.0,

            // Mídia
            logo_url: formData.logo_url,
            banner_url: formData.banner_url,

            // Dados do proprietário
            owner_name: formData.owner_name,
            owner_phone: formData.owner_phone,
            owner_email: formData.owner_email,

            // Configurações de Entrega
            delivery_fee_type: formData.delivery_fee_type,
            delivery_fee_fixed: safeFixed,
            delivery_fee_per_km: safePerKm,
            delivery_ranges: formData.delivery_ranges,
            delivery_free_min_km: formData.delivery_free_min_km,
            delivery_free_min_value: formData.delivery_free_min_value,
            delivery_max_km: formData.delivery_max_km,
            delivery_radius_km: formData.delivery_max_km,
            min_order_value: formData.min_order_value,
            allows_pickup: formData.allows_pickup,
            complement: formData.complement
        };

        try {
            let pharmacyId = id;

            if (!isNew && id) {
                // --- ATUALIZAÇÃO ---
                console.log("Atualizando farmácia:", id, payload);
                const { error } = await supabase.from('pharmacies').update(payload).eq('id', id);
                if (error) throw error;

                // Se houver alteração de senha/email do merchant, isso deve ser tratado separadamente ou aqui
                // Mas por enquanto foca nos dados da farmácia
            } else {
                // --- CRIAÇÃO ---
                console.log("Criando nova farmácia:", payload);
                const { data: newPharmacy, error: createError } = await supabase
                    .from('pharmacies')
                    .insert([payload])
                    .select()
                    .single();

                if (createError) throw createError;
                pharmacyId = newPharmacy.id;
                console.log("Farmácia criada com ID:", pharmacyId);



                // ⚠️ Criação de Assinatura via UPSERT para garantir idempotência
                console.log("Criando/Garantindo assinatura inicial...");
                const { error: directSubError } = await supabase
                    .from('pharmacy_subscriptions')
                    .upsert({
                        pharmacy_id: pharmacyId,
                        plan: 'ENTERPRISE',
                        status: 'trialing',
                    }, { onConflict: 'pharmacy_id' });

                if (directSubError) {
                    console.warn("Falha ao criar assinatura automática (pode ser RLS):", directSubError);
                    alert("Farmácia criada, mas NÃO consegui criar a assinatura (RLS). Sem assinatura, não dá pra aprovar. Verifique políticas/permite admin criar subscriptions.");
                } else {
                    console.log("Assinatura trialing criada com sucesso.");
                }

                // Criar Usuário Dono (Merchant) se dados fornecidos
                if (formData.merchant_email && formData.merchant_password) {
                    if (formData.merchant_password.length < 6) {
                        alert("A senha do gestor deve ter pelo menos 6 caracteres.");
                        return; // Don't try to create user
                    }
                    console.log("Criando usuário merchant...", formData.merchant_email);

                    // 🔥 OBTER TOKEN DE AUTENTICAÇÃO
                    const { data: { session: currentSession } } = await supabase.auth.getSession();

                    if (!currentSession?.access_token) {
                        alert("Sessão expirada. Recarregue a página e faça login novamente.");
                        return;
                    }

                    const { data: authData, error: authErr } = await supabase.functions.invoke('create-staff-user', {
                        body: {
                            email: formData.merchant_email,
                            password: formData.merchant_password,
                            pharmacy_id: pharmacyId,
                            metadata: {
                                full_name: formData.owner_name,
                                role: 'merchant',
                                pharmacy_id: pharmacyId,
                                phone: formData.owner_phone
                            }
                        },
                        headers: {
                            Authorization: `Bearer ${currentSession.access_token}`,
                        }
                    });

                    if (authErr) {
                        console.error("Erro ao criar usuário merchant (Detalhes):", authErr);
                        // Tentar extrair mensagem de erro do corpo se disponível
                        const errorBody = await authErr.context?.json().catch(() => ({}));
                        const msg = errorBody?.error || authErr.message || "Erro desconhecido";
                        alert(`Farmácia criada, mas erro ao criar usuário: ${msg}`);
                    } else if (authData?.user?.id) {
                        console.log("Usuário merchant criado com ID:", authData.user.id);

                        // ATA PONTO CHAVE: Atualizar farmácia com owner_id
                        const { error: updateOwnerError } = await supabase
                            .from('pharmacies')
                            .update({ owner_id: authData.user.id })
                            .eq('id', pharmacyId);

                        if (updateOwnerError) {
                            console.error("Erro ao vincular owner_id na farmácia:", updateOwnerError);
                        } else {
                            console.log("Vinculado owner_id com sucesso!");
                        }
                    }
                }
            }

            alert("Farmácia salva com sucesso!");
            navigate('/dashboard/pharmacies');
        } catch (err: any) {
            console.error("Erro fatal ao salvar:", err);
            alert("Erro ao salvar farmácia: " + (err.message || JSON.stringify(err)));
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
                                <span>
                                    Status:{' '}
                                    {formData.status === 'approved'
                                        ? 'Aprovado'
                                        : formData.status === 'pending'
                                            ? 'Pendente'
                                            : formData.status}
                                </span>
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
                                const isUuid = (v?: string | null) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
                                if (!isUuid(id)) {
                                    alert("ID da farmácia inválido ou não salvo. Recarregue a página.");
                                    return;
                                }
                                localStorage.setItem('impersonatedPharmacyId', id!);
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

                {/* 3. FINANCE TAB */}
                {activeTab === 'finance' && !isNew && (
                    <PharmacyFinanceTab pharmacyId={id || ''} />
                )}

                {/* ... (Orders Tab Logic would go here) ... */}

                {/* 4. SETTINGS TAB */}
                {
                    (activeTab === 'settings' || isNew) && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            <div className="lg:col-span-2 space-y-6">

                                {/* 3.1 IMAGENS DA LOJA (LOGO & BANNER) */}
                                <section className="bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-[40px] shadow-xl overflow-hidden">
                                    {/* BANNER AREA */}
                                    <div className="h-48 bg-slate-200 relative group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                                        {uploading.banner ? (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
                                                <MaterialIcon name="sync" className="animate-spin text-primary text-4xl" />
                                            </div>
                                        ) : formData.banner_url ? (
                                            <img src={formData.banner_url} alt="Capa" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <span className="font-bold flex items-center gap-2"><MaterialIcon name="image" /> Adicionar Capa</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold flex items-center gap-2"><MaterialIcon name="upload" /> Alterar Capa</span>
                                        </div>
                                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} disabled={uploading.banner} />
                                    </div>

                                    <div className="px-8 pb-8 relative">
                                        <div className="-mt-12 mb-6 flex items-end">
                                            <div className="size-32 rounded-[32px] bg-white dark:bg-zinc-800 p-2 shadow-xl relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                                <div className="w-full h-full rounded-[24px] bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                                                    {uploading.logo ? (
                                                        <MaterialIcon name="sync" className="animate-spin text-primary text-3xl" />
                                                    ) : formData.logo_url ? (
                                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <MaterialIcon name="store" className="text-4xl text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="absolute inset-2 bg-black/50 rounded-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MaterialIcon name="edit" className="text-white" />
                                                </div>
                                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} disabled={uploading.logo} />
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
                                            <input
                                                value={formData.plan}
                                                disabled
                                                className="h-14 bg-black/20 border border-white/10 rounded-2xl px-4 text-white font-black"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {isNew && (
                                    <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                        <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <MaterialIcon name="badge" className="text-primary" />
                                            Credenciais de Acesso (Gestor)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Email de Acesso *</label>
                                                <input type="email" value={formData.merchant_email} onChange={e => setFormData({ ...formData, merchant_email: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Login do gestor" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Senha Inicial *</label>
                                                <input type="password" value={formData.merchant_password} onChange={e => setFormData({ ...formData, merchant_password: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Mínimo 6 caracteres" />
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="location_on" className="text-primary" />
                                        Endereço e Localização
                                    </h3>
                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">CEP</label>
                                            <input value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} onBlur={handleCEPBlur} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="00000-000" />
                                        </div>
                                        <div className="col-span-12 md:col-span-9 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Rua / Logradouro</label>
                                            {canUseMaps ? (
                                                <Autocomplete
                                                    onLoad={onLoadAutocomplete}
                                                    onPlaceChanged={onPlaceChanged}
                                                    options={{
                                                        componentRestrictions: { country: 'br' },
                                                        fields: ['address_components', 'geometry', 'formatted_address']
                                                    }}
                                                >
                                                    <input
                                                        value={formData.street}
                                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                        className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors w-full"
                                                        placeholder="Comece a digitar o endereço..."
                                                    />
                                                </Autocomplete>
                                            ) : (
                                                <input
                                                    value={formData.street}
                                                    onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                    className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors w-full"
                                                />
                                            )}
                                        </div>

                                        <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Número</label>
                                            <input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Nº" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Complemento</label>
                                            <input value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Apto, Bloco..." />
                                        </div>
                                        <div className="col-span-12 md:col-span-5 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Bairro</label>
                                            <input value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Bairro" />
                                        </div>

                                        <div className="col-span-12 md:col-span-6 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Cidade</label>
                                            <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="Cidade" />
                                        </div>
                                        <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Estado (UF)</label>
                                            <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors uppercase text-center" placeholder="UF" maxLength={2} />
                                        </div>
                                        <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Localização GPS</label>
                                            <button
                                                type="button"
                                                onClick={handleAddressChange}
                                                disabled={loading || !formData.street || !formData.city}
                                                className="h-14 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl px-4 text-primary font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                title="Recalcular coordenadas a partir do endereço"
                                            >
                                                <MaterialIcon name="my_location" />
                                                <span>Recalcular</span>
                                            </button>
                                        </div>

                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Latitude</label>
                                            <input value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="0.0000" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Longitude</label>
                                            <input value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors" placeholder="0.0000" />
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Ação Rápida</label>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if ("geolocation" in navigator) {
                                                        navigator.geolocation.getCurrentPosition(async (position) => {
                                                            const lat = position.coords.latitude;
                                                            const lng = position.coords.longitude;
                                                            setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
                                                            const addressData = await reverseGeocode(lat, lng);
                                                            if (addressData) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    street: addressData.street || prev.street,
                                                                    number: addressData.number || prev.number,
                                                                    neighborhood: addressData.neighborhood || prev.neighborhood,
                                                                    city: addressData.city || prev.city,
                                                                    state: addressData.state || prev.state,
                                                                    cep: addressData.cep || prev.cep,
                                                                    address: addressData.formattedAddress || prev.address
                                                                }));
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 text-slate-400 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                <MaterialIcon name="gps_fixed" />
                                                <span>Minha Posição</span>
                                            </button>
                                        </div>

                                        {/* MAP PREVIEW */}
                                        <div className="col-span-12 h-[300px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 relative mt-4">
                                            <AdminMap
                                                type="tracking"
                                                markers={formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude))
                                                    ? [{ id: 'pharma-loc', lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude), type: 'pharmacy' }]
                                                    : []
                                                }
                                                autoCenter={true}
                                                center={formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude))
                                                    ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                                                    : undefined
                                                }
                                                onMapClick={async (e) => {
                                                    if (e.latLng) {
                                                        const lat = e.latLng.lat();
                                                        const lng = e.latLng.lng();

                                                        // Update coordinates immediately
                                                        setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));

                                                        // Fetch address from coordinates
                                                        const addressData = await reverseGeocode(lat, lng);
                                                        if (addressData) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                latitude: lat.toString(),
                                                                longitude: lng.toString(),
                                                                street: addressData.street || prev.street,
                                                                number: addressData.number || prev.number,
                                                                neighborhood: addressData.neighborhood || prev.neighborhood,
                                                                city: addressData.city || prev.city,
                                                                state: addressData.state || prev.state,
                                                                cep: addressData.cep || prev.cep,
                                                                address: addressData.formattedAddress || prev.address
                                                            }));
                                                        }
                                                    }
                                                }}
                                                isLoaded={canUseMaps}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* 3.3 DELIVERY FEES CONFIGURATION (Admin Review) */}
                                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <MaterialIcon name="delivery_dining" className="text-primary" />
                                        Regras de Entrega
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Tipo de Cobrança</label>
                                                <div className="flex bg-black/20 p-1 rounded-xl">
                                                    <button
                                                        onClick={() => setFormData({ ...formData, delivery_fee_type: 'fixed' })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.delivery_fee_type === 'fixed' ? 'bg-primary text-background-dark' : 'text-slate-500'}`}
                                                    >
                                                        Fixo
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, delivery_fee_type: 'km' })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.delivery_fee_type === 'km' ? 'bg-primary text-background-dark' : 'text-slate-500'}`}
                                                    >
                                                        Por KM
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, delivery_fee_type: 'range' as any })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${formData.delivery_fee_type === 'range' ? 'bg-primary text-background-dark' : 'text-slate-500'}`}
                                                    >
                                                        Faixas
                                                    </button>
                                                </div>
                                            </div>

                                            {formData.delivery_fee_type === 'fixed' ? (
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Valor Fixo (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.delivery_fee_fixed}
                                                        onChange={e =>
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                delivery_fee_fixed: parseNumberSafe(e.target.value, 0)
                                                            }))
                                                        }
                                                        className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            ) : formData.delivery_fee_type === 'km' ? (
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Valor por KM (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.delivery_fee_per_km}
                                                        onChange={e =>
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                delivery_fee_per_km: parseNumberSafe(e.target.value, 0)
                                                            }))
                                                        }
                                                        className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Faixas de Distância</label>
                                                        <button
                                                            onClick={() => setFormData({ ...formData, delivery_ranges: [...formData.delivery_ranges, { max_km: 0, fee: 0 }] })}
                                                            className="text-[9px] font-black uppercase bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all"
                                                        >
                                                            + Nova Faixa
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                                        {formData.delivery_ranges.map((range, idx) => (
                                                            <div key={idx} className="flex gap-2 items-center">
                                                                <input type="number" placeholder="KM" value={range.max_km} onChange={e => {
                                                                    const newRanges = [...formData.delivery_ranges];
                                                                    newRanges[idx].max_km = parseFloat(e.target.value);
                                                                    setFormData({ ...formData, delivery_ranges: newRanges });
                                                                }} className="w-1/2 h-10 bg-black/20 rounded-lg px-3 text-xs text-white" />
                                                                <input type="number" placeholder="R$" value={range.fee} onChange={e => {
                                                                    const newRanges = [...formData.delivery_ranges];
                                                                    newRanges[idx].fee = parseFloat(e.target.value);
                                                                    setFormData({ ...formData, delivery_ranges: newRanges });
                                                                }} className="w-1/2 h-10 bg-black/20 rounded-lg px-3 text-xs text-white" />
                                                                <button onClick={() => setFormData({ ...formData, delivery_ranges: formData.delivery_ranges.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                                                                    <MaterialIcon name="delete" className="text-sm" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/10 mb-4">
                                                <input type="checkbox" checked={formData.allows_pickup} onChange={e => setFormData({ ...formData, allows_pickup: e.target.checked })} className="size-5 accent-primary cursor-pointer" />
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] cursor-pointer">Permite Retirada no Local?</label>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Pedido Mínimo (R$)</label>
                                                <input type="number" value={formData.min_order_value} onChange={e => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50" />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Raio Frete Grátis (KM)</label>
                                                <input type="number" value={formData.delivery_free_min_km} onChange={e => setFormData({ ...formData, delivery_free_min_km: parseFloat(e.target.value) })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Valor Frete Grátis (R$)</label>
                                                <input type="number" value={formData.delivery_free_min_value} onChange={e => setFormData({ ...formData, delivery_free_min_value: parseFloat(e.target.value) })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Raio Máximo (KM)</label>
                                                <input type="number" value={formData.delivery_max_km} onChange={e => setFormData({ ...formData, delivery_max_km: parseFloat(e.target.value) })} className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50" />
                                            </div>
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
                                            <div className="flex gap-2">
                                                <div className="h-14 flex items-center px-4 rounded-2xl bg-black/20 border border-white/10 text-white font-black uppercase text-xs tracking-widest flex-1">
                                                    {formData.status === 'approved' ? 'Aprovado' :
                                                        formData.status === 'pending' ? 'Pendente' :
                                                            formData.status}
                                                </div>
                                                {!isNew && formData.status !== 'approved' && (
                                                    <button
                                                        onClick={handleApprovePharmacy}
                                                        disabled={loading}
                                                        className="h-14 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors shadow-lg shadow-emerald-500/20"
                                                        title="Aprovar Farmácia"
                                                    >
                                                        <MaterialIcon name="check_circle" />
                                                    </button>
                                                )}
                                            </div>
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
