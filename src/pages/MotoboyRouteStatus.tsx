import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// Componente para centralizar o mapa na localização
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    return null;
}

// Ícone customizado para o motoboy
const motoboyIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00ff00" stroke="#ffffff" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
        </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Ícone customizado para o destino
const destinationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff0000" stroke="#ffffff" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
    `),
    iconSize: [35, 35],
    iconAnchor: [17, 35]
});

const MotoboyRouteStatus = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Obter usuário logado
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    // Hook de Geolocalização Integrado (Fase 8)
    const { latitude, longitude, error: gpsError } = useGeolocation(userId, !!orderId, orderId || null);

    // Sincronizar coordenadas locais com o hook
    useEffect(() => {
        if (latitude && longitude) {
            setCoords({ lat: latitude, lng: longitude });
        }
    }, [latitude, longitude]);

    // Buscar dados do pedido
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, pharmacies(name, address)')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;
                setOrder(data);
            } catch (error) {
                console.error('Erro ao buscar pedido:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    // O rastreamento agora é gerenciado pelo hook useGeolocation acima

    if (loading) {
        return (
            <div className="bg-background-light dark:bg-[#102218] text-white min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin size-12 border-4 border-[#13ec6d] border-t-transparent rounded-full"></div>
                    <p className="text-sm font-bold text-white/60">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-background-light dark:bg-[#102218] text-white min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <MaterialIcon name="error" className="text-6xl text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
                    <p className="text-white/60 mb-4">O pedido #{orderId?.substring(0, 8)} não foi encontrado.</p>
                    <button onClick={() => navigate(-1)} className="bg-[#13ec6d] text-[#102218] px-6 py-3 rounded-xl font-bold">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    // Custom theme constants
    const routeTheme = {
        '--route-primary': '#13ec6d',
        '--route-bg-dark': '#102218',
        '--route-card-bg': '#193324',
        '--route-text-light': '#92c9a9',
    } as React.CSSProperties;

    const center: [number, number] = coords ? [coords.lat, coords.lng] : [-22.9068, -43.1729];
    const destination: [number, number] | null = order.delivery_lat && order.delivery_lng ? [order.delivery_lat, order.delivery_lng] : null;

    return (
        <div className="bg-background-light dark:bg-[#102218] text-white min-h-screen flex flex-col font-display transition-colors duration-200" style={routeTheme}>
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-[#102218]/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-90 transition-transform"
                    >
                        <MaterialIcon name="arrow_back_ios" />
                    </button>
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Pedido #{orderId?.substring(0, 8)}</h2>
                    <div className="flex w-12 items-center justify-end">
                        <div className="size-2 rounded-full bg-[#13ec6d] animate-ping mr-2"></div>
                        <button className="flex items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-white p-0">
                            <MaterialIcon name="info" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
                {/* Headline and Steps Section */}
                <div className="pt-6 px-4">
                    <h3 className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight text-center pb-4 uppercase italic">
                        {coords ? 'Localização Ativa' : 'Aguardando GPS...'}
                    </h3>
                    {/* PageIndicators / Step Progress */}
                    <div className="flex w-full flex-row items-center justify-center gap-4 py-2">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-2.5 w-16 rounded-full bg-[#13ec6d] shadow-[0_0_10px_rgba(19,236,109,0.5)]"></div>
                            <span className="text-[10px] font-bold text-[#13ec6d] uppercase tracking-wider">Em Rota</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-2.5 w-16 rounded-full bg-slate-300 dark:bg-[#326748]"></div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-[#92c9a9] uppercase tracking-wider">Entregue</span>
                        </div>
                    </div>
                </div>

                {/* Map Section */}
                <div className="flex px-4 py-6 flex-1 min-h-[350px]">
                    <div className="relative w-full h-full min-h-[350px] bg-slate-200 dark:bg-[#193324] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
                        <MapContainer
                            center={center}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            {coords && (
                                <>
                                    <MapUpdater center={center} />
                                    <Marker position={[coords.lat, coords.lng]} icon={motoboyIcon} />
                                </>
                            )}
                            {destination && (
                                <Marker position={destination} icon={destinationIcon} />
                            )}
                        </MapContainer>

                        {/* Map Overlay Elements */}
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-[#102218]/80 backdrop-blur-md p-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm z-[1000]">
                            <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] uppercase font-bold">Sinal GPS</p>
                            <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tighter">{coords ? 'Excelente' : 'Procurando...'}</p>
                        </div>
                    </div>
                </div>

                {/* Delivery Card Section */}
                <div className="p-4 pb-0">
                    <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-[#193324] p-5 shadow-xl border border-gray-100 dark:border-white/5">
                        <div className="flex flex-col gap-1 flex-[2_2_0px]">
                            <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold leading-normal uppercase tracking-widest">Destinatário</p>
                            <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight">{order.customer_name || 'Cliente'}</p>
                            <div className="flex items-start gap-1 mt-1">
                                <MaterialIcon name="near_me" className="text-slate-400 dark:text-[#92c9a9] !text-sm mt-0.5" />
                                <p className="text-slate-500 dark:text-[#92c9a9] text-sm font-medium leading-tight">{order.address}</p>
                            </div>
                        </div>
                        <div className="w-20 h-20 bg-[#13ec6d]/20 rounded-lg flex-none border border-gray-200 dark:border-white/10 flex items-center justify-center">
                            <MaterialIcon name="person" className="text-4xl text-[#13ec6d]" />
                        </div>
                    </div>
                </div>

                {/* Sticky Action Button Container */}
                <div className="p-4 mt-auto">
                    <Link
                        to={`/motoboy-confirm/${orderId}`}
                        className="w-full bg-[#13ec6d] hover:bg-[#11d662] active:scale-[0.98] transition-all text-[#102218] h-16 rounded-xl flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(19,236,109,0.3)]"
                    >
                        <span className="text-xl font-black uppercase tracking-tight">Confirmar Entrega</span>
                        <MaterialIcon name="check_circle" className="font-bold" />
                    </Link>
                    <div className="h-6"></div> {/* Safe area spacing */}
                </div>
            </main>
        </div>
    );
};

export default MotoboyRouteStatus;
