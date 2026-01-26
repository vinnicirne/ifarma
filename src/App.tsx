import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import HelpSupport from './pages/HelpSupport';
import UserProfile from './pages/UserProfile';
import PrivacyData from './pages/PrivacyData';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import ForgotPassword from './pages/ForgotPassword';
import MotoboyLogin from './pages/MotoboyLogin';
import MotoboyOrders from './pages/MotoboyOrders';
import MotoboyDeliveryDetail from './pages/MotoboyDeliveryDetail';
import MotoboyRouteStatus from './pages/MotoboyRouteStatus';
import MotoboyDeliveryConfirm from './pages/MotoboyDeliveryConfirm';
import MotoboyHistory from './pages/MotoboyHistory';
import { supabase } from './lib/supabase';

// --- Shared Components & Icons ---
const MaterialIcon = ({ name, className = "", fill = false }: { name: string, className?: string, fill?: boolean }) => (
  <span className={`material-symbols-outlined ${className} ${fill ? 'FILL-1' : ''}`} style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>
    {name}
  </span>
);

// --- Auth Components ---
const Auth = ({ view = 'login' }: { view?: 'login' | 'signup' }) => {
  const [isLogin, setIsLogin] = useState(view === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else navigate(-1);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) alert(error.message);
      else alert('Verifique seu e-mail para confirmar o cadastro!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-[#1a2e23] rounded-[40px] p-8 border border-white/5 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <MaterialIcon name="lock" className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-black italic text-white tracking-tighter">
            {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            PharmaLink Platform
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Completo</span>
              <input
                required
                className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
                placeholder="Ex: João Silva"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </label>
          )}
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">E-mail</span>
            <input
              required
              type="email"
              className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Senha</span>
            <input
              required
              type="password"
              className="h-14 px-5 bg-black/20 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/20 font-bold italic"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background-dark font-black py-5 rounded-3xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter mt-4"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminRoute = ({ children, session, profile }: { children: React.ReactNode, session: any, profile: any }) => {
  if (!session) return <Auth view="login" />;
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <MaterialIcon name="block" className="text-red-500 text-6xl mb-4" />
        <h2 className="text-xl font-black italic text-white">Acesso Negado</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs">Esta área é restrita para administradores da plataforma.</p>
        <Link to="/" className="mt-8 text-primary font-black uppercase tracking-widest text-xs hover:underline">Voltar para a Home</Link>
      </div>
    );
  }
  return <>{children}</>;
};

const ProtectedRoute = ({ children, session }: { children: React.ReactNode, session: any }) => {
  if (!session) return <Auth view="login" />;
  return <>{children}</>;
};

// --- AREA 1: CLIENT COMPONENTS ---
// --- Helper Functions ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TopAppBar = ({ onSearch, userLocation }: { onSearch: (query: string) => void, userLocation: { lat: number, lng: number } | null }) => {
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('Localização Atual');

  useEffect(() => {
    const fetchAddress = async () => {
      if (!userLocation) return;

      try {
        const { data: settings } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'google_maps_api_key')
          .single();

        if (settings?.value) {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lng}&key=${settings.value}`
          );
          const data = await response.json();
          if (data.results && data.results[0]) {
            // Pegar o endereço formatado mais curto ou relevante
            const fullAddress = data.results[0].formatted_address;
            const shortAddress = fullAddress.split(',').slice(0, 2).join(',');
            setAddress(shortAddress);
          }
        }
      } catch (error) {
        console.error("Erro na geocodificação reversa:", error);
      }
    };
    fetchAddress();
  }, [userLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearch(val);
  };

  return (
    <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
      <div className="flex items-center p-4 pb-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="text-primary flex size-6 shrink-0 items-center">
            <MaterialIcon name="location_on" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Entregar em</span>
            <h2 className="text-[#0d161b] dark:text-white text-sm font-bold leading-tight flex items-center gap-1">
              {address || 'Localização Atual'}
              <MaterialIcon name="keyboard_arrow_down" className="text-sm" />
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cart" className="relative flex items-center justify-center rounded-full w-10 h-10 bg-slate-100 dark:bg-slate-800">
            <MaterialIcon name="shopping_cart" className="text-[#0d161b] dark:text-white" />
            <span className="absolute top-1 right-1 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-background-dark">2</span>
          </Link>
          <button className="flex items-center justify-center rounded-full w-10 h-10 bg-slate-100 dark:bg-slate-800">
            <MaterialIcon name="notifications" className="text-[#0d161b] dark:text-white" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
            <div className="text-[#4c799a] flex border-none bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
              <MaterialIcon name="search" />
            </div>
            <input
              value={query}
              onChange={handleInputChange}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#0d161b] dark:text-white focus:outline-0 focus:ring-0 border-none bg-slate-100 dark:bg-slate-800 focus:border-none h-full placeholder:text-[#4c799a] px-4 pl-2 text-base font-normal leading-normal"
              placeholder="Buscar remédios ou farmácias"
            />
          </div>
        </label>
      </div>
    </div>
  );
};

const PromoCarousel = () => (
  <div className="flex overflow-x-auto hide-scrollbar">
    <div className="flex items-stretch p-4 gap-3">
      <div className="flex h-full flex-1 flex-col gap-3 rounded-xl min-w-[280px]">
        <div className="w-full bg-center bg-no-repeat aspect-[21/9] bg-cover rounded-xl flex flex-col relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1392ec 0%, #0056b3 100%)' }}>
          <div className="p-4 flex flex-col justify-center h-full text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Ofertas da Semana</p>
            <p className="text-xl font-bold leading-tight">Itens selecionados com até 50% OFF</p>
          </div>
        </div>
      </div>
      <div className="flex h-full flex-1 flex-col gap-3 rounded-xl min-w-[280px]">
        <div className="w-full bg-center bg-no-repeat aspect-[21/9] bg-cover rounded-xl flex flex-col relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
          <div className="p-4 flex flex-col justify-center h-full text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Saúde em Dia</p>
            <p className="text-xl font-bold leading-tight">Suplementos 20% OFF. Aproveite agora!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CategoryGrid = () => (
  <>
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Categorias</h3>
      <button className="text-primary text-sm font-semibold">Ver todas</button>
    </div>
    <div className="grid grid-cols-2 gap-3 p-4">
      {[
        { name: 'Dor e Febre', icon: 'pill' },
        { name: 'Higiene', icon: 'clean_hands' },
        { name: 'Infantil', icon: 'child_care' },
        { name: 'Suplementos', icon: 'fitness_center' }
      ].map(cat => (
        <div key={cat.name} className="flex flex-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 items-center shadow-sm">
          <div className="text-primary bg-primary/10 p-2 rounded-lg">
            <MaterialIcon name={cat.icon} />
          </div>
          <h2 className="text-[#0d161b] dark:text-white text-sm font-bold leading-tight">{cat.name}</h2>
        </div>
      ))}
    </div>
  </>
);

const FeaturedPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
  <>
    <div className="px-4 pt-6 pb-2">
      <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias em Destaque</h3>
    </div>
    <div className="flex overflow-x-auto hide-scrollbar">
      <div className="flex items-stretch p-4 gap-4">
        {pharmacies.filter(p => p.rating >= 4.5).map(pharma => (
          <Link to="/pharmacy/1" key={pharma.id} className="min-w-[160px] flex flex-col gap-2">
            <div className="w-full aspect-square rounded-2xl bg-slate-100 flex items-center justify-center p-4 border border-slate-100 dark:border-slate-800 dark:bg-slate-900 overflow-hidden relative shadow-sm">
              {pharma.logo_url ? (
                <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-black text-2xl italic`}>
                  {pharma.name.charAt(0)}
                </div>
              )}
              {pharma.is_open && (
                <div className="absolute bottom-2 right-2 bg-success text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ABERTO</div>
              )}
            </div>
            <div>
              <p className="text-[#0d161b] dark:text-white text-sm font-bold truncate">{pharma.name}</p>
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <MaterialIcon name="star" className="text-xs text-yellow-500" fill /> {pharma.rating || '0.0'} • 15-25 min
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </>
);

const NearbyPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
  <>
    <div className="px-4 pt-6 pb-2 flex justify-between items-center">
      <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias Próximas</h3>
      <Link to="/pharmacies" className="text-primary text-sm font-bold">Ver tudo</Link>
    </div>
    <div className="px-4 flex flex-col gap-4 pb-20">
      {pharmacies.map(pharma => (
        <Link to="/pharmacy/1" key={pharma.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 items-start shadow-sm hover:border-primary/30 transition-colors">
          <div className="size-16 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden">
            {pharma.logo_url ? (
              <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 text-primary flex items-center justify-center font-bold text-xl">{pharma.name.charAt(0)}</div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h4 className="text-base font-bold text-[#0d161b] dark:text-white">{pharma.name}</h4>
              <div className="flex items-center gap-1 text-xs font-bold bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                <MaterialIcon name="star" className="text-[14px]" fill /> {pharma.rating || '0.0'}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[14px]" /> 20-30 min</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MaterialIcon name="location_on" className="text-[14px]" />
                {pharma.distance === Infinity ? 'N/A' : `${pharma.distance.toFixed(1)} km`}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </>
);

const PharmacyList = ({ pharmacies, session }: { pharmacies: any[], session: any }) => {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-24">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MaterialIcon name="location_on" className="text-[#0d1b13] dark:text-white" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Entregar em</span>
              <span className="text-sm font-semibold text-[#0d1b13] dark:text-white">Localização Atual</span>
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-sm">
            <MaterialIcon name="person" className="text-[#0d1b13] dark:text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0d1b13] dark:text-white mb-4">Farmácias</h1>
        <div className="pb-2">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
              <div className="text-[#4c9a6c] flex border-none bg-white dark:bg-zinc-800 items-center justify-center pl-4 rounded-l-xl">
                <MaterialIcon name="search" />
              </div>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#0d1b13] dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-zinc-800 placeholder:text-gray-400 px-4 pl-2 text-base font-normal leading-normal" placeholder="Buscar farmácia ou medicamento" />
            </div>
          </label>
        </div>
        <div className="flex gap-2 py-2 overflow-x-auto hide-scrollbar">
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary text-[#0d1b13] px-4 shadow-sm">
            <p className="text-sm font-semibold">Distância</p>
            <MaterialIcon name="keyboard_arrow_down" className="text-[18px]" />
          </button>
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-zinc-800 text-[#0d1b13] dark:text-white px-4 border border-gray-100 dark:border-zinc-700 shadow-sm font-medium text-sm">
            Avaliação <MaterialIcon name="star" className="text-[18px]" />
          </button>
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-zinc-800 text-[#0d1b13] dark:text-white px-4 border border-gray-100 dark:border-zinc-700 shadow-sm font-medium text-sm">
            Entrega Grátis
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-2 space-y-4">
        {pharmacies.length === 0 ? (
          <div className="text-center py-20 opacity-50 font-bold italic">Nenhuma farmácia encontrada</div>
        ) : (
          pharmacies.map((pharma, i) => (
            <div key={i} className="group flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-gray-50 dark:border-zinc-800">
              <div className="flex flex-[2_2_0px] flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <MaterialIcon name="star" className="text-orange-400 text-[16px]" fill />
                    <p className="text-[#0d1b13] dark:text-white text-sm font-bold">{pharma.rating || '0.0'}</p>
                    <span className="text-gray-400 text-xs font-normal">• 100+ avaliações</span>
                  </div>
                  <p className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight">{pharma.name}</p>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                    <MaterialIcon name="schedule" className="text-[16px]" />
                    <span>20-40 min</span>
                    <span>•</span>
                    <span>{pharma.distance === Infinity ? 'Distância N/A' : `${pharma.distance.toFixed(1)} km`}</span>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-primary">Entrega Grátis</span>
                  </div>
                </div>
                <Link to="/pharmacy/1" className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-[#0d1b13] text-sm font-bold leading-normal w-fit transition-transform active:scale-95">
                  Ver produtos
                </Link>
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 dark:bg-zinc-800 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-700">
                {pharma.logo_url ? (
                  <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
                ) : (
                  <MaterialIcon name="storefront" className="text-4xl text-primary/20" />
                )}
              </div>
            </div>
          ))
        )}
      </main>
      <BottomNav />
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 w-full max-w-[480px] bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-6 pt-2 z-50">
      <div className="flex justify-around items-center">
        <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-primary' : 'text-slate-400'}`}>
          <MaterialIcon name="home" fill={location.pathname === '/'} />
          <span className="text-[10px] font-bold">Início</span>
        </Link>
        <Link to="/pharmacies" className={`flex flex-col items-center gap-1 ${location.pathname === '/pharmacies' ? 'text-primary' : 'text-slate-400'}`}>
          <MaterialIcon name="search" fill={location.pathname === '/pharmacies'} />
          <span className="text-[10px] font-bold">Busca</span>
        </Link>
        <Link to="/wallet" className={`flex flex-col items-center gap-1 ${location.pathname === '/wallet' ? 'text-primary' : 'text-slate-400'}`}>
          <MaterialIcon name="account_balance_wallet" fill={location.pathname === '/wallet'} />
          <span className="text-[10px] font-bold">Carteira</span>
        </Link>
        <Link to="/order-tracking" className={`flex flex-col items-center gap-1 ${location.pathname === '/order-tracking' ? 'text-primary' : 'text-slate-400'}`}>
          <MaterialIcon name="receipt_long" fill={location.pathname === '/order-tracking'} />
          <span className="text-[10px] font-bold">Pedidos</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-primary' : 'text-slate-400'}`}>
          <MaterialIcon name="person" fill={location.pathname === '/profile'} />
          <span className="text-[10px] font-bold">Perfil</span>
        </Link>
      </div>
    </nav>
  );
};

const ClientHome = ({ userLocation, sortedPharmacies, session }: { userLocation: { lat: number, lng: number } | null, sortedPharmacies: any[], session: any }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle Search Logic
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from('pharmacy_products')
        .select(`
          id,
          price,
          product:products!inner(name, category, image_url),
          pharmacy:pharmacies!inner(name, latitude, longitude)
        `)
        .ilike('products.name', `%${searchQuery}%`)
        .order('price', { ascending: true });

      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else if (data) {
        // Calculate distance and sort
        const processed = data.map((item: any) => {
          let distance = Infinity;
          const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };
          if (item.pharmacy.latitude && item.pharmacy.longitude) {
            distance = calculateDistance(
              referenceLoc.lat,
              referenceLoc.lng,
              Number(item.pharmacy.latitude),
              Number(item.pharmacy.longitude)
            );
          }
          return { ...item, distance };
        });

        // Sort by distance if prices are close, or just by price then distance
        const sorted = processed.sort((a, b) => {
          if (Math.abs(a.price - b.price) < 0.01) return a.distance - b.distance;
          return a.price - b.price;
        });

        setSearchResults(sorted);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, userLocation]);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-[480px] mx-auto shadow-xl bg-white dark:bg-background-dark">
      <TopAppBar
        onSearch={setSearchQuery}
        userLocation={userLocation}
      />

      <main className="flex-1">
        {searchQuery.length > 0 ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white italic">
                {isSearching ? 'Buscando...' : `Resultados para "${searchQuery}"`}
              </h2>
              {searchResults.length > 0 && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">
                  {searchResults.length} {searchResults.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <MaterialIcon name="search_off" className="text-6xl mb-4 opacity-20" />
                <p className="font-bold italic">Nenhum produto encontrado</p>
                <p className="text-xs opacity-60">Tente buscar por termos mais genéricos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map((item, i) => (
                  <div key={i} className="bg-white dark:bg-[#1a2e23] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex gap-4">
                    <div className="size-24 rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <MaterialIcon name="medication" className="text-4xl text-primary/20" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-slate-800 dark:text-white italic leading-tight">{item.product.name}</h4>
                          <span className="text-primary font-black text-lg italic tracking-tighter">R$ {parseFloat(item.price).toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.product.category}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <MaterialIcon name="store" className="text-[14px] text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black italic text-slate-700 dark:text-slate-200">{item.pharmacy.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.distance === Infinity ? 'Distância N/A' : `${item.distance.toFixed(1)} km`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => !session ? navigate('/login') : alert('Adicionado ao carrinho!')}
                          className="bg-primary text-background-dark size-8 rounded-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg shadow-primary/20"
                        >
                          <MaterialIcon name="add" className="font-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <PromoCarousel />
            <CategoryGrid />
            <FeaturedPharmacies pharmacies={sortedPharmacies} />
            <NearbyPharmacies pharmacies={sortedPharmacies} />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

// --- Dummy pages for other routes (to be styled later) ---
const PharmacyPage = ({ session }: { session: any }) => {
  const navigate = useNavigate();
  return (
    <div className="max-w-lg mx-auto bg-background-light dark:bg-background-dark min-h-screen pb-32">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
            <MaterialIcon name="arrow_back" className="text-[#0d1b13] dark:text-white" />
          </button>
          <div className="flex gap-2">
            <button className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
              <MaterialIcon name="share" className="text-[#0d1b13] dark:text-white" />
            </button>
            <button className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
              <MaterialIcon name="favorite" className="text-[#0d1b13] dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Header Image & Profile Overlay */}
      <div className="relative w-full">
        <div className="w-full h-56 bg-center bg-cover bg-slate-200"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCQBDaY_dE4pipP291S60byN57w3BiBNIwXXGNkWFE2iPvamSwi6vO6c0vefPKMHs6C4qPo7-2YG0PBmIIjeqw8OEpDcsgzGu6WfrNH7_itF0OS-sU1jLh1L4o5LEm10OsRf06GFI6v33ikohZZXnQej20ZCTAmHJJUOjn8NS3mHyFqhE2X07wtELz1_XbpAAtXWen50uezl6Z1p_W7wSW2HRlksM7Ve4_QO2Xn9YOQo0vQmhvvujzUCH8JkGM0IQ9nbZPHWTlrPQ")' }}>
        </div>
        <div className="absolute -bottom-12 left-4">
          <div className="size-24 rounded-2xl bg-white p-1 shadow-lg overflow-hidden border-2 border-white">
            <div className="w-full h-full bg-center bg-cover rounded-xl bg-primary/10"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCnDWZVczM2bNSQOUkeaiYLMHMv04jn1tMigOdVpqCs0Ww6klygIAhRPlj6bOIniWQbRHWq6E4YjtPvvMxzUyp8s8KVA7Mw1pB-EbTd7PMxeRnRCZn_21kghhMZAzowGEJ8fbr36M5-mYqBIEGxxouVVK54N_-Q3SqEvZHL89OtoHN_aOGrkaV_OSE5NfHqYP6e-qlr1-8bBfQTZecjiUC7gD3cbq7DFDiJ6-eiOmC3llfrO77qUq-CAUqXaKkwC9OWpPH1lByi7A")' }}>
            </div>
          </div>
        </div>
      </div>

      {/* Store Information */}
      <div className="pt-16 px-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0d1b13] dark:text-white">HealthWay Pharmacy</h1>
            <div className="flex items-center gap-1 mt-1">
              <MaterialIcon name="star" className="text-yellow-400 text-lg" fill />
              <span className="text-sm font-bold text-[#0d1b13] dark:text-white">4.8</span>
              <span className="text-sm text-zinc-500">(120+ reviews)</span>
            </div>
          </div>
          <div className="bg-primary/20 px-3 py-1 rounded-full">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Open Now</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-zinc-500">
          <MaterialIcon name="location_on" className="text-sm" />
          <p className="text-sm">123 Medical Blvd, San Francisco, CA</p>
        </div>
      </div>

      {/* Sticky Interaction Section */}
      <div className="sticky top-16 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm pt-4">
        {/* Search Bar */}
        <div className="px-4">
          <label className="flex flex-col w-full">
            <div className="flex items-center rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 h-12">
              <div className="text-zinc-400 flex items-center justify-center pl-4">
                <MaterialIcon name="search" />
              </div>
              <input className="w-full bg-transparent border-none focus:ring-0 text-[#0d1b13] dark:text-white placeholder:text-zinc-400 px-3 text-base" placeholder="Search in this store" />
            </div>
          </label>
        </div>
        {/* Categories Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-4">
          {['Featured', 'Medicines', 'Personal Care', 'First Aid', 'Supplements'].map((cat, i) => (
            <button key={cat} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all ${i === 0 ? 'bg-primary text-black' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700 font-medium'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 mt-2">
        <h3 className="text-lg font-bold mb-4">Featured Products</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Daily Multivitamins (60 count)', price: '24.99', controlled: false },
            { name: 'Digital Infrared Thermometer', price: '15.50', controlled: false },
            { name: 'Medical Grade Face Masks (50pk)', price: '9.99', controlled: false },
            { name: 'Moisturizing Skin Lotion 250ml', price: '12.45', controlled: false },
            { name: 'Compact Travel First Aid Kit', price: '18.00', controlled: false },
            { name: 'Hand Sanitizer Spray (100ml)', price: '4.99', controlled: false }
          ].map((prod, i) => (
            <div key={i} className="bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-sm border border-zinc-100 dark:border-zinc-700 group">
              <div className="block relative w-full aspect-square rounded-lg bg-zinc-50 dark:bg-zinc-900 mb-3 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <MaterialIcon name="medication" className="text-zinc-200 text-5xl group-hover:scale-110 transition-transform" />
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    !session ? navigate('/login') : alert('Adicionado ao carrinho!');
                  }}
                  className="absolute bottom-2 right-2 size-8 bg-primary rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95"
                >
                  <MaterialIcon name="add" className="text-black font-bold" />
                </button>
              </div>
              <Link to="/product/1" className="text-sm font-semibold line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors">{prod.name}</Link>
              <p className="text-primary font-bold mt-1">${prod.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 max-w-lg mx-auto">
        <div className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-full px-6 py-4 flex items-center justify-between shadow-2xl border border-white/10 ring-1 ring-white/5">
          <Link to="/" className="flex flex-col items-center text-zinc-400">
            <MaterialIcon name="storefront" />
            <span className="text-[10px] font-medium">Shop</span>
          </Link>
          <Link to="/wallet" className="flex flex-col items-center text-zinc-400">
            <MaterialIcon name="account_balance_wallet" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center relative text-primary">
            <div className="bg-primary size-5 rounded-full absolute -top-2 -right-2 flex items-center justify-center border-2 border-zinc-900">
              <span className="text-[10px] text-black font-black font-sans">3</span>
            </div>
            <MaterialIcon name="shopping_cart" fill />
            <span className="text-[10px] font-medium">Cart</span>
          </Link>
          <Link to="/order-tracking" className="flex flex-col items-center text-zinc-400">
            <MaterialIcon name="receipt_long" />
            <span className="text-[10px] font-medium">Orders</span>
          </Link>
          <button className="flex flex-col items-center text-zinc-400 opacity-50">
            <MaterialIcon name="person" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductPage = ({ session }: { session: any }) => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-white dark:bg-background-dark pb-32">
      <div className="relative h-64 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-12">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 size-10 bg-white/90 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg z-10">
          <MaterialIcon name="arrow_back" />
        </button>
        <MaterialIcon name="medication" className="text-primary text-[120px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-background-dark/20 opacity-40"></div>
      </div>

      <div className="px-6 -mt-6 relative z-10">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full self-start flex items-center gap-1">
            <MaterialIcon name="description" className="text-[12px]" /> EXIGE RECEITA MÉDICA
          </span>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mt-2">Amoxicilina 500mg</h1>
          <p className="text-slate-400 font-medium">Antibiótico • 21 comprimidos • EMS</p>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Descrição</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
            A amoxicilina é um antibiótico eficaz contra uma grande variedade de bactérias, indicada para o tratamento de infecções bacterianas causadas por germes sensíveis à amoxicilina.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-slate-300 text-xs line-through">De R$ 56,90</span>
            <span className="text-4xl font-black text-primary">R$ 45,90</span>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border">
            <button className="size-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center font-bold">-</button>
            <span className="font-black text-lg">1</span>
            <button className="size-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center font-bold text-primary">+</button>
            <p className="text-primary font-bold text-base leading-tight">Este medicamento exige receita médica</p>
            <p className="text-primary/80 dark:text-primary/60 text-sm font-medium">A venda será finalizada apenas após a validação da sua receita.</p>
          </div>
        </div>
      </div>

      {/* Product Description */}
      <div className="px-4 py-2">
        <h3 className="text-[#1c140d] dark:text-white text-lg font-bold pb-2 border-b border-gray-100 dark:border-white/10 mb-3 font-sans">Descrição detalhada</h3>
        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed font-medium">
          Este medicamento é indicado para o tratamento de infecções bacterianas causadas por germes sensíveis aos componentes da fórmula. Atua como um agente antibiótico de amplo espectro.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
            <span className="font-bold text-sm">Composição</span>
            <MaterialIcon name="add" className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
            <span className="font-bold text-sm">Como Usar</span>
            <MaterialIcon name="add" className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/10 p-4 pb-8">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => !session ? navigate('/login') : navigate('/prescription-upload')}
            className="flex w-full items-center justify-center gap-2 h-14 rounded-full border-2 border-primary bg-transparent text-primary font-bold text-base transition-all active:scale-95"
          >
            <MaterialIcon name="photo_camera" /> Enviar Receita
          </button>
          <button
            onClick={() => !session ? navigate('/login') : alert('Adicionado ao carrinho!')}
            className="flex w-full items-center justify-center gap-2 h-14 rounded-full bg-primary text-slate-900 font-bold text-lg shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <MaterialIcon name="shopping_cart" /> Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
};

const PrescriptionUpload = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex h-auto min-h-screen w-full max-w-md mx-auto flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-x-hidden border-x border-black/5 dark:border-white/5 pb-24">
      {/* TopAppBar */}
      <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark border-b border-black/5 dark:border-white/5">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button onClick={() => navigate(-1)} className="text-background-dark dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <MaterialIcon name="arrow_back_ios" className="text-xl" />
          </button>
          <h1 className="text-background-dark dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            Enviar Receita Médica
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4 w-full">
        {/* EmptyState (Upload Area) */}
        <div className="flex flex-col">
          <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed border-primary/40 dark:border-primary/20 bg-primary/5 px-6 py-14 hover:bg-primary/10 transition-colors cursor-pointer group shadow-sm">
            <div className="bg-primary/20 p-4 rounded-full text-primary">
              <MaterialIcon name="cloud_upload" className="text-4xl" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-background-dark dark:text-white text-lg font-bold leading-tight text-center">
                Fazer upload da foto ou PDF
              </p>
              <p className="text-background-dark/60 dark:text-white/60 text-sm font-medium leading-normal text-center">
                Formatos aceitos: JPG, PNG ou PDF
              </p>
            </div>
            <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-background-dark text-sm font-bold leading-normal tracking-wide shadow-sm hover:scale-105 transition-transform active:scale-95">
              <span className="truncate">Selecionar Arquivo</span>
            </button>
          </div>
        </div>

        {/* TextField (Observations) */}
        <div className="flex flex-col gap-2">
          <label className="flex flex-col w-full">
            <p className="text-background-dark dark:text-white text-sm font-bold leading-normal pb-2 px-1 uppercase tracking-wider opacity-60">
              Observações adicionais
            </p>
            <textarea className="form-input flex w-full resize-none overflow-hidden rounded-2xl text-background-dark dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/30 border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:border-primary min-h-[140px] placeholder:text-background-dark/30 dark:placeholder:text-white/30 p-4 text-base font-medium leading-normal transition-all" placeholder="Ex: Necessito de genérico, entrega urgente, etc."></textarea>
          </label>
        </div>

        {/* Privacy & Security Notice */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="text-primary shrink-0">
            <MaterialIcon name="verified_user" />
          </div>
          <p className="text-background-dark/70 dark:text-white/70 text-[13px] leading-snug font-medium">
            Seus dados estão protegidos. Suas informações médicas são tratadas com total sigilo e segurança conforme a LGPD.
          </p>
        </div>
      </main>

      {/* Footer Action */}
      <footer className="p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 w-full fixed bottom-0 max-w-md left-1/2 -translate-x-1/2 z-20">
        <div className="flex">
          <button onClick={() => navigate(-1)} className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 flex-1 bg-primary text-background-dark text-lg font-black leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter">
            Confirmar Envio
          </button>
        </div>
        {/* iOS Home Indicator Spacing */}
        <div className="h-6"></div>
      </footer>
    </div>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-32 bg-background-light dark:bg-background-dark font-display text-[#0d1b13] dark:text-white antialiased">
      {/* TopAppBar */}
      <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:opacity-70">
          <MaterialIcon name="arrow_back_ios" />
        </button>
        <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Shopping Cart</h2>
      </header>

      <main className="flex-1 flex flex-col gap-2 p-2">
        {/* Cart Items List */}
        <div className="flex flex-col gap-1 mt-2">
          {[
            { name: 'Paracetamol 500mg', detail: '10 tablets', price: '$4.50', qty: 2 },
            { name: 'Vitamin C Serum', detail: '30ml bottle', price: '$12.00', qty: 1 },
            { name: 'Digital Thermometer', detail: '1 unit', price: '$15.00', qty: 1 }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-white dark:bg-background-dark/40 rounded-xl px-4 min-h-[88px] py-3 justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="size-16 bg-slate-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 bg-center bg-no-repeat bg-cover">
                  <MaterialIcon name="medication" className="text-primary/20 text-3xl" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#0d1b13] dark:text-white text-base font-semibold leading-tight line-clamp-1">{item.name}</p>
                  <p className="text-[#4c9a6c] text-sm font-medium mt-1">{item.detail}</p>
                  <p className="text-[#0d1b13] dark:text-gray-300 text-sm font-bold mt-1">{item.price}</p>
                </div>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-3 text-[#0d1b13] dark:text-white bg-background-light dark:bg-gray-800 rounded-full px-2 py-1">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 shadow-sm active:scale-90 transition-transform cursor-pointer">
                    <MaterialIcon name="remove" className="text-sm font-bold" />
                  </button>
                  <input className="text-base font-bold w-6 p-0 text-center bg-transparent focus:outline-0 focus:ring-0 border-none" type="number" defaultValue={item.qty} />
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm active:scale-90 transition-transform cursor-pointer">
                    <MaterialIcon name="add" className="text-sm font-bold" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add more items button */}
        <div className="flex px-4 py-6 justify-center">
          <Link to="/" className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-6 bg-primary/10 dark:bg-primary/20 text-[#0d1b13] dark:text-primary gap-2 text-sm font-bold leading-normal tracking-wide transition-colors hover:bg-primary/20">
            <MaterialIcon name="add_circle" className="text-xl" />
            <span className="truncate">Add more items</span>
          </Link>
        </div>

        {/* Order Summary */}
        <div className="mt-4 mx-2 p-5 bg-white dark:bg-background-dark/40 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">Order Summary</h3>
          <div className="flex justify-between gap-x-6 py-2 px-1">
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Subtotal</p>
            <p className="text-[#0d1b13] dark:text-white text-base font-semibold leading-normal text-right">$36.00</p>
          </div>
          <div className="flex justify-between gap-x-6 py-2 px-1">
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Delivery Fee</p>
            <p className="text-primary text-base font-semibold leading-normal text-right">FREE</p>
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-3"></div>
          <div className="flex justify-between gap-x-6 py-2 px-1">
            <p className="text-[#0d1b13] dark:text-white text-lg font-bold leading-normal">Total Amount</p>
            <p className="text-[#0d1b13] dark:text-white text-xl font-bold leading-normal text-right">$36.00</p>
          </div>
        </div>
      </main>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 pb-8 z-50 shadow-sm">
        <Link to="/order-tracking" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-4 bg-primary text-white gap-3 text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
          <span className="truncate">Proceed to Payment</span>
          <MaterialIcon name="arrow_forward" />
        </Link>
      </div>
    </div>
  );
};

const OrderTracking = () => {
  const navigate = useNavigate();
  return (
    <div className="relative mx-auto flex h-auto min-h-screen max-w-[480px] flex-col overflow-x-hidden shadow-2xl bg-white dark:bg-background-dark pb-10">
      {/* TopAppBar */}
      <header className="sticky top-0 z-20 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between">
        <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
          <MaterialIcon name="arrow_back_ios" className="ml-2" />
        </button>
        <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12 font-sans">Acompanhamento</h2>
      </header>

      {/* Map Section */}
      <div className="px-4 py-3">
        <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-zinc-800 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex items-center justify-center">
          <MaterialIcon name="map" className="text-6xl text-primary/20" />
          {/* Overlay badge for ETA */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between border-l-4 border-primary border border-white/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-2xl shadow-inner">
                <MaterialIcon name="moped" className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Chegada estimada</p>
                <p className="text-lg font-black leading-tight">15 - 20 min</p>
              </div>
            </div>
            <MaterialIcon name="info" className="text-gray-300" />
          </div>
        </div>
      </div>

      {/* SectionHeader */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <h3 className="text-[#0d1b13] dark:text-white text-xl font-black leading-tight tracking-[-0.015em]">Status do Pedido</h3>
        <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-primary/5">#48291</span>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-[48px_1fr] gap-x-2 px-8 py-4">
        {/* Step 1: Pedido Recebido (Done) */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-primary text-slate-900 rounded-full p-1.5 shadow-lg shadow-primary/20">
            <MaterialIcon name="check" className="text-[18px]" />
          </div>
          <div className="w-[3px] bg-primary h-12 opacity-50"></div>
        </div>
        <div className="flex flex-1 flex-col pb-8">
          <p className="text-[#0d1b13] dark:text-white text-base font-black leading-normal italic">Pedido Recebido</p>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Confirmado às 10:30</p>
        </div>

        {/* Step 2: Preparando (Active) */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-primary ring-8 ring-primary/10 text-slate-900 rounded-full p-2 shadow-xl scale-110">
            <MaterialIcon name="pill" className="text-[20px]" fill />
          </div>
          <div className="w-[3px] bg-gray-100 dark:bg-zinc-800 h-12"></div>
        </div>
        <div className="flex flex-1 flex-col pb-8">
          <p className="text-[#0d1b13] dark:text-white text-base font-black leading-normal italic">Preparando seu pedido</p>
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-1 pulse">Em andamento</p>
        </div>

        {/* Step 3: Em rota (Pending) */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-gray-100 dark:bg-zinc-800 text-gray-300 rounded-full p-1.5 grayscale opacity-50">
            <MaterialIcon name="local_shipping" className="text-[20px]" />
          </div>
          <div className="w-[3px] bg-gray-100 dark:bg-zinc-800 h-10"></div>
        </div>
        <div className="flex flex-1 flex-col pb-8">
          <p className="text-gray-400 dark:text-gray-600 text-base font-black leading-normal italic opacity-60">Em rota de entrega</p>
          <p className="text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">Aguardando saída</p>
        </div>

        {/* Step 4: Entregue (Pending) */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-gray-100 dark:bg-zinc-800 text-gray-300 rounded-full p-1.5 grayscale opacity-50">
            <MaterialIcon name="home" className="text-[20px]" />
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <p className="text-gray-400 dark:text-gray-600 text-base font-black leading-normal italic opacity-60">Entregue</p>
          <p className="text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">Pendente</p>
        </div>
      </div>

      {/* Chat Button */}
      <div className="flex px-6 py-4">
        <button className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[28px] h-14 px-5 bg-primary text-slate-900 gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98] uppercase tracking-tighter ring-1 ring-primary/5">
          <MaterialIcon name="chat" className="text-2xl font-bold" fill />
          <span className="truncate text-base font-black leading-normal">Chat com a Farmácia</span>
        </button>
      </div>

      {/* Resumo do Pedido */}
      <div className="px-6 pb-12 mt-4">
        <h3 className="text-[#0d1b13] dark:text-white text-lg font-black leading-tight tracking-[-0.015em] pb-6 font-sans">Itens do Pedido</h3>
        <div className="space-y-4">
          {[
            { name: 'Paracetamol 750mg', qty: '2 unidades', price: 'R$ 18,90', icon: 'pill' },
            { name: 'Vitamina C Efervescente 1g', qty: '1 unidade', price: 'R$ 24,50', icon: 'vaccines' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 group shadow-sm">
              <div className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center p-2 border border-gray-100 dark:border-white/5 transition-transform group-hover:scale-110">
                <MaterialIcon name={item.icon} className="text-primary/30 text-2xl" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black line-clamp-1">{item.name}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.qty}</p>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-white">{item.price}</p>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="mt-8 pt-6 border-t border-dashed border-gray-100 dark:border-gray-800 flex justify-between items-center px-2">
          <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total com entrega</span>
          <span className="text-2xl font-black text-primary tracking-tighter">R$ 51,30</span>
        </div>
      </div>

      {/* Bottom Indicator Area (iOS Style) */}
      <div className="h-10 flex justify-center items-center">
        <div className="w-32 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full opacity-50"></div>
      </div>
    </div>
  );
};

const MerchantDashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-display">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="flex items-center p-4 pb-2 justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-[14px] bg-primary/20 flex items-center justify-center">
              <MaterialIcon name="local_pharmacy" className="text-primary text-2xl" />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter">HealthyCare Store</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Merchant Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <MaterialIcon name="notifications" className="text-slate-700 dark:text-slate-300" />
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 border-2 border-white dark:border-background-dark rounded-full"></span>
            </button>
            <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors lg:hidden">
              <MaterialIcon name="menu" className="text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Summary Stats Section */}
        <div className="overflow-x-auto no-scrollbar flex gap-4 p-4">
          {[
            { label: "Today's Orders", val: "42", trend: "+15%", icon: "shopping_bag" },
            { label: "Daily Revenue", val: "$1,240", trend: "+8.2%", icon: "payments" },
            { label: "Active Orders", val: "12", sub: "4 pending pickup", icon: "pending_actions" }
          ].map((stat, i) => (
            <div key={i} className="flex min-w-[160px] flex-1 flex-col gap-2 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm border-b-4 border-b-primary/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <MaterialIcon name={stat.icon} className="text-primary text-xl" />
              </div>
              <p className="text-slate-900 dark:text-white tracking-tighter text-3xl font-black leading-tight italic">{stat.val}</p>
              {stat.trend ? (
                <div className="flex items-center gap-1">
                  <MaterialIcon name="trending_up" className="text-primary text-sm" />
                  <p className="text-primary text-xs font-black">{stat.trend}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-xs font-bold leading-none">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Weekly Sales Chart Section */}
        <section className="px-4 py-2">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight font-sans">Weekly Sales</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Revenue overview</p>
              </div>
              <div className="text-right">
                <p className="text-slate-900 dark:text-white text-2xl font-black tracking-tighter">$8,650</p>
                <p className="text-primary text-[10px] font-black leading-normal uppercase tracking-tighter">+12.5% vs last week</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-3 items-end h-40 px-2 italic">
              {[
                { day: 'Mon', h: '40%' },
                { day: 'Tue', h: '60%' },
                { day: 'Wed', h: '85%' },
                { day: 'Thu', h: '55%' },
                { day: 'Fri', h: '100%', active: true },
                { day: 'Sat', h: '75%' },
                { day: 'Sun', h: '45%' }
              ].map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-3 group">
                  <div className={`w-full rounded-t-xl transition-all duration-500 ${d.active ? 'bg-primary shadow-[0_-4px_20px_rgba(19,236,109,0.3)]' : 'bg-primary/10 group-hover:bg-primary/40'}`} style={{ height: d.h }}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${d.active ? 'text-primary' : 'text-slate-300 dark:text-slate-700'}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Best Selling Products List */}
        <section className="p-4 mt-2">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">Best Sellers</h2>
            <button className="text-primary text-xs font-black uppercase tracking-widest">See All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Paracetamol 500mg', cat: 'Healthcare & Wellness', sold: '124', price: '$496.00' },
              { name: 'Vitamin C 1000mg', cat: 'Supplements', sold: '98', price: '$686.00' },
              { name: 'Cough Syrup (Herbal)', cat: 'OTC Medicine', sold: '76', price: '$380.00' }
            ].map((prod, i) => (
              <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 dark:border-white/5 transition-transform group-hover:scale-105">
                  <MaterialIcon name="medication" className="text-primary/20 text-3xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-800 dark:text-white font-black truncate text-sm">{prod.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{prod.cat}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-900 dark:text-white font-black text-sm">{prod.sold} sold</p>
                  <p className="text-primary text-[10px] font-black uppercase tracking-tighter mt-0.5 italic">{prod.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="p-4 grid grid-cols-2 gap-4 mt-2">
          <Link to="/merchant-orders" className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-primary text-slate-900 font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98] uppercase tracking-tighter text-xs">
            <MaterialIcon name="receipt_long" className="text-2xl" />
            <span>Pedidos</span>
          </Link>
          <Link to="/merchant/inventory" className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-white/5 transition-colors uppercase tracking-tighter text-xs">
            <MaterialIcon name="inventory_2" className="text-2xl text-primary" />
            <span>Estoque</span>
          </Link>
        </section>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
        <div className="max-w-md mx-auto flex items-center justify-around bg-slate-900 dark:bg-zinc-800 rounded-full py-2 px-6 shadow-2xl ring-1 ring-white/10">
          <Link to="/merchant" className="flex flex-col items-center gap-1 text-primary p-2">
            <MaterialIcon name="home" fill />
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </Link>
          <Link to="/merchant/financial" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="account_balance_wallet" />
            <span className="text-[9px] font-black uppercase tracking-widest">Financeiro</span>
          </Link>
          <Link to="/merchant-orders" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="receipt_long" />
            <span className="text-[9px] font-black uppercase tracking-widest">Pedidos</span>
          </Link>
          <Link to="/merchant/settings" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="settings" />
            <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

const MerchantOrderManagement = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display pb-24">
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#1a2433] border-b border-[#cfd9e7] dark:border-slate-700 p-4 pb-2 justify-between">
        <button onClick={() => navigate('/merchant')} className="text-[#0d131b] dark:text-slate-100 flex size-12 shrink-0 items-center">
          <MaterialIcon name="menu" />
        </button>
        <h2 className="text-[#0d131b] dark:text-slate-100 text-lg font-black leading-tight tracking-[-0.015em] flex-1 text-center font-display">Gerenciamento de Pedidos</h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent text-[#0d131b] dark:text-slate-100">
            <MaterialIcon name="search" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1a2433] pb-1 sticky top-[62px] z-40">
        <div className="flex border-b border-[#cfd9e7] dark:border-slate-700 px-4 gap-8">
          <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4">
            <p className="text-sm font-black leading-normal tracking-[0.015em] font-display">Ativos (12)</p>
          </button>
          <button className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4c6c9a] dark:text-slate-400 pb-[13px] pt-4">
            <p className="text-sm font-bold leading-normal tracking-[0.015em] font-display">Histórico</p>
          </button>
          <button className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4c6c9a] dark:text-slate-400 pb-[13px] pt-4">
            <p className="text-sm font-bold leading-normal tracking-[0.015em] font-display">Agendados</p>
          </button>
        </div>
      </div>

      {/* Main Content (Orders List) */}
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Urgent Order Card */}
        <div className="bg-white dark:bg-[#1a2433] rounded-2xl shadow-sm border border-[#cfd9e7] dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-4 px-4 min-h-[72px] py-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-14 w-14 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                <MaterialIcon name="person" className="text-slate-400 text-3xl" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[#0d131b] dark:text-slate-100 text-base font-black leading-normal line-clamp-1 italic">João Silva • #4582</p>
                <p className="text-orange-500 dark:text-orange-400 text-xs font-black uppercase tracking-widest">Pendente</p>
              </div>
            </div>
            <div className="shrink-0">
              <p className="text-[#4c6c9a] dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">há 2 min</p>
            </div>
          </div>

          {/* Prescription Alert */}
          <div className="flex items-center gap-4 bg-primary/10 dark:bg-primary/20 mx-4 mb-2 rounded-xl px-4 min-h-12 justify-between py-2">
            <div className="flex items-center gap-4">
              <div className="text-primary flex items-center justify-center shrink-0 size-8">
                <MaterialIcon name="description" />
              </div>
              <p className="text-primary dark:text-white text-xs font-black uppercase tracking-tight flex-1 truncate">Receita Pendente de Validação</p>
            </div>
            <div className="shrink-0">
              <MaterialIcon name="info" className="text-primary" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-1 gap-3 px-4 py-4 justify-between">
            <Link to="/chat" className="flex size-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-primary transition-all active:scale-95 shadow-sm">
              <MaterialIcon name="chat" />
            </Link>
            <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-slate-100 dark:bg-slate-800 text-[#0d131b] dark:text-slate-100 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm">
              Recusar
            </button>
            <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-primary text-slate-900 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20">
              Aprovar
            </button>
          </div>
        </div>

        {/* In Preparation Card */}
        <div className="bg-white dark:bg-[#1a2433] rounded-2xl shadow-sm border border-[#cfd9e7] dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-4 px-4 min-h-[72px] py-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-14 w-14 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                <MaterialIcon name="person" className="text-slate-400 text-3xl" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[#0d131b] dark:text-slate-100 text-base font-black leading-normal line-clamp-1 italic">Maria Souza • #4580</p>
                <p className="text-blue-500 dark:text-blue-400 text-xs font-black uppercase tracking-widest">Em Preparo</p>
              </div>
            </div>
            <div className="shrink-0">
              <p className="text-[#4c6c9a] dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">há 12 min</p>
            </div>
          </div>
          <div className="px-4 py-4">
            <button className="w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-primary/10 text-primary dark:text-white text-xs font-black uppercase tracking-widest border border-primary/20 transition-all active:scale-95">
              Finalizar Pedido
            </button>
          </div>
        </div>

        {/* Pending Card Without Prescription */}
        <div className="bg-white dark:bg-[#1a2433] rounded-2xl shadow-sm border border-[#cfd9e7] dark:border-slate-700 overflow-hidden opacity-90">
          <div className="flex items-center gap-4 px-4 min-h-[72px] py-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-14 w-14 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                <MaterialIcon name="person" className="text-slate-400 text-3xl" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[#0d131b] dark:text-slate-100 text-base font-black leading-normal line-clamp-1 italic">Ricardo M. • #4579</p>
                <p className="text-orange-500 dark:text-orange-400 text-xs font-black uppercase tracking-widest">Pendente</p>
              </div>
            </div>
            <div className="shrink-0">
              <p className="text-[#4c6c9a] dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">há 25 min</p>
            </div>
          </div>
          <div className="flex flex-1 gap-3 px-4 py-4 justify-between">
            <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-slate-100 dark:bg-slate-800 text-[#0d131b] dark:text-slate-100 text-xs font-black uppercase tracking-widest transition-all active:scale-95">
              Recusar
            </button>
            <button className="flex-1 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-primary text-slate-900 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20">
              Aprovar
            </button>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-28 right-6 z-50">
        <Link to="/merchant/add-product" className="flex size-14 items-center justify-center rounded-2xl bg-primary text-slate-900 shadow-2xl shadow-primary/30 transition-all active:scale-90 hover:rotate-12">
          <MaterialIcon name="add" className="scale-125" />
        </Link>
      </div>

      {/* Bottom Tab Bar (iOS style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
        <div className="max-w-md mx-auto flex items-center justify-around bg-slate-900 dark:bg-zinc-800 rounded-full py-2 px-6 shadow-2xl ring-1 ring-white/10">
          <Link to="/merchant" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="home" />
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </Link>
          <Link to="/merchant/financial" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="account_balance_wallet" />
            <span className="text-[9px] font-black uppercase tracking-widest">Financeiro</span>
          </Link>
          <Link to="/merchant-orders" className="flex flex-col items-center gap-1 text-primary p-2">
            <MaterialIcon name="receipt_long" fill />
            <span className="text-[9px] font-black uppercase tracking-widest">Pedidos</span>
          </Link>
          <Link to="/merchant/settings" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="settings" />
            <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

const AddProduct = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background-light dark:bg-background-dark text-white min-h-screen flex flex-col font-display">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-[#326748]/20">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
          <button onClick={() => navigate(-1)} className="text-white flex size-10 shrink-0 items-center justify-center cursor-pointer transition-transform active:scale-90">
            <MaterialIcon name="arrow_back_ios" />
          </button>
          <h2 className="text-white text-lg font-black leading-tight tracking-tight flex-1 text-center italic">Cadastrar Produto</h2>
          <div className="flex size-10 items-center justify-end cursor-pointer">
            <span onClick={() => navigate(-1)} className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">Cancelar</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 max-w-md mx-auto w-full">
        {/* Section: Media */}
        <section>
          <h3 className="text-white text-sm font-black px-4 pb-2 pt-6 uppercase tracking-widest">Imagens do Produto</h3>
          <p className="text-[#92c9a9] text-[10px] px-4 pb-4 font-black uppercase-none italic">Adicione até 5 fotos nítidas da embalagem.</p>
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
            {/* Add Image Button */}
            <div className="flex flex-col shrink-0">
              <div className="w-24 h-24 bg-[#193324]/50 border-2 border-dashed border-[#326748] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#92c9a9] cursor-pointer hover:bg-[#193324] transition-colors group">
                <MaterialIcon name="add_a_photo" className="text-2xl group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest">Adicionar</span>
              </div>
            </div>
            {/* Image Placeholders */}
            <div className="flex flex-col shrink-0">
              <div className="w-24 h-24 bg-slate-800 rounded-2xl border border-[#326748] flex items-center justify-center">
                <MaterialIcon name="medication" className="text-white/20 text-3xl" />
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <div className="w-24 h-24 bg-slate-800 rounded-2xl border border-[#326748] flex items-center justify-center">
                <MaterialIcon name="info" className="text-white/20 text-3xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Section: Basic Info */}
        <section className="mt-6 space-y-4">
          {/* TextField: Product Name */}
          <div className="px-4">
            <label className="flex flex-col w-full">
              <p className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Nome do Produto</p>
              <input className="flex w-full rounded-2xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] bg-[#193324]/50 h-14 placeholder:text-[#92c9a9]/30 p-4 text-base font-bold italic shadow-sm" placeholder="Ex: Paracetamol 500mg (20 Comprimidos)" />
            </label>
          </div>
          {/* TextField: Description */}
          <div className="px-4">
            <label className="flex flex-col w-full">
              <p className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Descrição</p>
              <textarea className="flex w-full resize-none rounded-2xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] bg-[#193324]/50 min-h-28 placeholder:text-[#92c9a9]/30 p-4 text-base font-bold italic shadow-sm" placeholder="Descreva os benefícios, contraindicações e modo de uso..."></textarea>
            </label>
          </div>
          {/* Dropdown: Category */}
          <div className="px-4">
            <label className="flex flex-col w-full">
              <p className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Categoria</p>
              <div className="relative">
                <select className="w-full appearance-none rounded-2xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] bg-[#193324]/50 h-14 px-4 text-base font-bold italic shadow-sm">
                  <option disabled defaultValue="" value="">Selecione uma categoria</option>
                  <option value="analgesicos">Analgésicos</option>
                  <option value="vitaminas">Vitaminas e Suplementos</option>
                  <option value="higiene">Higiene Pessoal</option>
                  <option value="dermocosmeticos">Dermocosméticos</option>
                  <option value="antibioticos">Antibióticos</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#92c9a9]">
                  <MaterialIcon name="expand_more" />
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Section: Price & Stock */}
        <section className="mt-4 px-4 flex gap-4">
          <div className="flex-1">
            <label className="flex flex-col">
              <p className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Preço (R$)</p>
              <input className="w-full rounded-2xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] bg-[#193324]/50 h-14 p-4 text-base font-black italic shadow-sm text-primary" placeholder="0,00" type="text" />
            </label>
          </div>
          <div className="flex-1">
            <label className="flex flex-col">
              <p className="text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Estoque Inicial</p>
              <input className="w-full rounded-2xl text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] bg-[#193324]/50 h-14 p-4 text-base font-black italic shadow-sm" placeholder="0" type="number" />
            </label>
          </div>
        </section>

        {/* Section: Safety/Legal Toggle */}
        <section className="mt-8 px-4">
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-xl">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MaterialIcon name="description" className="text-primary text-xl" />
                <h4 className="text-white text-sm font-black uppercase tracking-tighter italic">Exige Receita Médica</h4>
              </div>
              <p className="text-[#4c9a6c] text-[10px] font-black italic leading-tight">O cliente precisará enviar uma foto da receita para concluir a compra.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" />
              <div className="w-12 h-7 bg-[#326748] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>
        </section>
      </main>

      {/* Fixed Footer Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-[#326748]/20 z-50">
        <div className="max-w-md mx-auto">
          <button className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black text-sm uppercase tracking-tighter py-5 rounded-3xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 group">
            <MaterialIcon name="save" className="group-hover:rotate-12 transition-transform" />
            Salvar Produto
          </button>
        </div>
      </footer>
    </div>
  );
};

const MerchantFinancial = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen pb-24 font-display transition-colors duration-200">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 pb-2 justify-between max-w-md mx-auto w-full">
          <button onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-start active:scale-90 transition-transform">
            <MaterialIcon name="arrow_back_ios" />
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter flex-1 text-center italic">Financeiro</h2>
          <div className="flex size-10 shrink-0 items-center justify-end">
            <MaterialIcon name="account_balance_wallet" className="text-primary" />
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto">
        {/* Main Stats Summary */}
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-3xl p-6 bg-slate-100 dark:bg-[#1a3526] border border-slate-200 dark:border-[#326748]/30 shadow-sm relative overflow-hidden group">
            <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest leading-none">Saldo Disponível</p>
            <p className="text-slate-900 dark:text-white tracking-tighter text-2xl font-black italic mt-1">R$ 12.450,00</p>
            <div className="absolute -right-4 -bottom-4 size-16 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          </div>
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-3xl p-6 bg-slate-100 dark:bg-[#1a3526] border border-slate-200 dark:border-[#326748]/30 shadow-sm relative overflow-hidden group">
            <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest leading-none">Próximos Recebimentos</p>
            <p className="text-slate-900 dark:text-white tracking-tighter text-2xl font-black italic mt-1">R$ 3.120,50</p>
            <div className="absolute -right-4 -bottom-4 size-16 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          </div>
        </div>

        {/* Withdrawal Action */}
        <div className="flex px-4 py-2">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-3xl h-16 px-5 flex-1 bg-primary text-[#112218] text-sm font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all group">
            <MaterialIcon name="payments" className="mr-3 group-hover:rotate-12 transition-transform" />
            <span className="truncate">Solicitar Saque</span>
          </button>
        </div>

        {/* Performance Chart Section */}
        <section className="mt-4">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h3 className="text-slate-900 dark:text-white text-lg font-black tracking-tighter italic leading-none">Faturamento Mensal</h3>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Semestral</span>
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-3">
            <div className="flex min-w-full flex-1 flex-col gap-2 bg-slate-100 dark:bg-[#1a3526]/30 p-6 rounded-[32px] border border-slate-200 dark:border-[#326748]/20 shadow-inner">
              <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest leading-none opacity-60">Total do Período</p>
              <p className="text-slate-900 dark:text-white tracking-tighter text-[32px] font-black italic mt-1 truncate">R$ 45.000,00</p>
              <div className="flex gap-2 items-center mb-6">
                <MaterialIcon name="trending_up" className="text-primary text-sm" />
                <p className="text-primary text-[10px] font-black uppercase tracking-widest">+12.5% vs mês anterior</p>
              </div>
              <div className="h-40 w-full relative">
                <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 478 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 109C18.15 109 18.15 21 36.3 21C54.46 21 54.46 41 72.61 41C90.76 41 90.76 93 108.92 93C127.07 93 127.07 33 145.23 33C163.38 33 163.38 101 181.53 101C199.69 101 199.69 61 217.84 61C236 61 236 45 254.15 45C272.3 45 272.3 121 290.46 121C308.61 121 308.61 149 326.76 149C344.92 149 344.92 1 363.07 1C381.23 1 381.23 81 399.38 81C417.53 81 417.53 129 435.69 129C453.84 129 453.84 25 472 25V149H0V109Z" fill="url(#paint0_linear)"></path>
                  <path d="M0 109C18.15 109 18.15 21 36.3 21C54.46 21 54.46 41 72.61 41C90.76 41 90.76 93 108.92 93C127.07 93 127.07 33 145.23 33C163.38 33 163.38 101 181.53 101C199.69 101 199.69 61 217.84 61C236 61 236 45 254.15 45C272.3 45 272.3 121 290.46 121C308.61 121 308.61 149 326.76 149C344.92 149 344.92 1 363.07 1C381.23 1 381.23 81 399.38 81C417.53 81 417.53 129 435.69 129C453.84 129 453.84 25 472 25" stroke="#13ec6d" strokeLinecap="round" strokeWidth="4"></path>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear" x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="#13ec6d" stopOpacity="0.4"></stop>
                      <stop offset="1" stopColor="#13ec6d" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex justify-between mt-4 px-1">
                  {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN'].map(m => (
                    <p key={m} className="text-slate-400 dark:text-[#92c9a9]/40 text-[9px] font-black tracking-widest uppercase">{m}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="mt-4 pb-10">
          <div className="flex items-center justify-between px-4 pb-4">
            <h3 className="text-slate-900 dark:text-white text-lg font-black tracking-tighter italic">Transações Recentes</h3>
            <span className="text-primary text-[10px] font-black uppercase tracking-widest cursor-pointer hover:opacity-70 transition-opacity">Ver tudo</span>
          </div>
          <div className="flex flex-col gap-3 px-4">
            {/* Transaction Items */}
            {[
              { id: "#59201", type: "Pedido", date: "Hoje, 14:35", amount: "+ R$ 145,20", icon: "shopping_cart", color: "primary" },
              { id: "#59198", type: "Pedido", date: "Ontem, 18:20", amount: "+ R$ 82,00", icon: "shopping_cart", color: "primary" },
              { id: "Transferência", type: "Saque Efetuado", date: "10 Out, 09:00", amount: "- R$ 5.000,00", icon: "outbound", color: "slate-400" }
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-[#1a2e22]/50 rounded-3xl border border-slate-100 dark:border-[#326748]/20 shadow-sm group hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-2xl bg-${t.color}/10 flex items-center justify-center border border-${t.color}/20 shadow-inner group-hover:rotate-6 transition-transform`}>
                    <MaterialIcon name={t.icon} className={`text-${t.color} text-2xl`} />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white font-black text-sm italic">{t.type} {t.id.startsWith('#') ? t.id : ''}</p>
                    <p className="text-slate-400 dark:text-[#92c9a9]/60 text-[9px] font-black uppercase tracking-widest mt-0.5">{t.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-${t.color} font-black text-sm italic`}>{t.amount}</p>
                  <p className="text-slate-400 dark:text-[#92c9a9]/40 text-[8px] font-black uppercase tracking-widest mt-0.5">{t.id.startsWith('#') ? 'Líquido' : t.id}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* iOS Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 bg-slate-900 dark:bg-zinc-800 rounded-full px-6 shadow-2xl ring-1 ring-white/10">
          <Link to="/merchant" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="home" />
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-primary p-2">
            <MaterialIcon name="account_balance_wallet" fill />
            <span className="text-[9px] font-black uppercase tracking-widest">Financeiro</span>
          </button>
          <Link to="/merchant-orders" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="receipt_long" />
            <span className="text-[9px] font-black uppercase tracking-widest">Pedidos</span>
          </Link>
          <Link to="/merchant/settings" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="settings" />
            <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
          </Link>
        </div>
      </nav>

      {/* Home Indicator */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-[60]"></div>
    </div>
  );
};

const StoreCustomization = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen pb-24 font-display transition-colors duration-200">
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 bg-background-light dark:bg-background-dark/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center -ml-2 p-2 active:scale-90 transition-transform">
              <MaterialIcon name="arrow_back_ios" />
            </button>
            <h2 className="text-white text-lg font-black leading-tight tracking-tighter italic">Personalização da Loja</h2>
          </div>
          <button className="text-primary font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform">Salvar</button>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Section: Identidade Visual */}
        <h3 className="text-white text-lg font-black leading-tight tracking-tighter px-4 pb-2 pt-6 italic">Identidade Visual</h3>
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Logo Upload */}
          <div className="flex flex-col gap-3">
            <div className="relative group cursor-pointer shadow-lg">
              <div className="w-full aspect-square bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex items-center justify-center bg-center bg-no-repeat bg-cover overflow-hidden" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpyVe5HQng67zwngMSblW7jDfnOcIw7KnB4L3Hl_SJGfIdWAkFN19eOxKN9snNAMvtkf929VGiE2tFpJedAV_9DhigNNcnnxgCY8_spfpcWdF7gNMBB0vaDPu0LDa0laHUL08HmszD7jjrQY0OguELKgPPZku6HmomE9MgUKMAPt2tGiVLe6HfldtKmxv5p4cEkXu_i8OqeEQs1irY7ogC06uOB6XE_1KegDOic0IZB2cOQyYcvG1GAfVzUPX9WDS44d_mpijfOw")' }}>
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl backdrop-blur-[2px]">
                <MaterialIcon name="add_a_photo" className="text-white text-3xl" />
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-black uppercase tracking-widest leading-none">Logo da Loja</p>
              <p className="text-primary text-[9px] font-black uppercase tracking-widest mt-1">512x512px recomendado</p>
            </div>
          </div>
          {/* Banner Upload */}
          <div className="flex flex-col gap-3">
            <div className="relative group cursor-pointer shadow-lg">
              <div className="w-full aspect-square bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex items-center justify-center bg-center bg-no-repeat bg-cover overflow-hidden" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC7PtmZx8S6za3u-SsO2wsoWoDpWd0Sr7Xwlwgq7rZWlmd1sjt3CrlTuowPnwrfDliXsK-VVsmU3IbDaeIlWr_UY9c6l1ID2RMNWu9qLG5Pg6uBzukGIouu_LS_cxYr967OlQY9C44dZR_QgDfSGybsUq63-j5pgNaWnDGfRIxnbPjz-768Xwa3fCUqXhIM9qSQ8yBlI2QWkSRY3c4ZjmHt5FxGrc6v5nRrYnVGFmEISRqSmg0sFm0Po3C4Yt3g3TBghAv64658AA")' }}>
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl backdrop-blur-[2px]">
                <MaterialIcon name="add_photo_alternate" className="text-white text-3xl" />
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-black uppercase tracking-widest leading-none">Banner de Capa</p>
              <p className="text-primary text-[9px] font-black uppercase tracking-widest mt-1">16:9 recomendado</p>
            </div>
          </div>
        </div>

        {/* Section: Informações Gerais */}
        <h3 className="text-white text-lg font-black leading-tight tracking-tighter px-4 pb-2 pt-6 italic">Informações Gerais</h3>
        <div className="px-4 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-white/40 text-[10px] font-black uppercase tracking-widest px-1">Descrição da Farmácia</label>
            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 focus:ring-primary/20 focus:border-primary font-bold italic shadow-inner" placeholder="Conte um pouco sobre sua farmácia e serviços..." rows={4}></textarea>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-white/40 text-[10px] font-black uppercase tracking-widest px-1">Endereço Físico</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60">
                <MaterialIcon name="location_on" />
              </span>
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-primary/20 focus:border-primary font-bold italic shadow-inner" placeholder="Ex: Av. Paulista, 1000 - São Paulo" type="text" defaultValue="São Paulo" />
            </div>
          </div>
        </div>

        {/* Section: Horários de Funcionamento */}
        <div className="flex items-center justify-between px-4 pb-2 pt-8">
          <h3 className="text-white text-lg font-black leading-tight tracking-tighter italic">Horário de Funcionamento</h3>
          <MaterialIcon name="schedule" className="text-primary" />
        </div>
        <div className="px-4 space-y-3">
          {[
            { day: "Seg", time: "08:00 às 20:00", active: true },
            { day: "Ter-Sex", info: "Mesmo de segunda", active: true },
            { day: "Sáb", time: "08:00 às 14:00", active: true },
            { day: "Dom", info: "Fechado", active: false }
          ].map((item, i) => (
            <div key={i} className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm transition-opacity ${!item.active && 'opacity-40'}`}>
              <div className="flex items-center gap-3">
                <div className="w-14">
                  <span className="text-white text-xs font-black uppercase tracking-widest">{item.day}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.time ? (
                    <div className="flex items-center gap-2">
                      <input className="w-16 bg-white/5 border-b border-primary/30 text-white text-center text-xs font-black focus:border-primary p-1 rounded-t-sm" type="text" defaultValue={item.time.split(' às ')[0]} />
                      <span className="text-white/40 text-[10px] font-black uppercase">às</span>
                      <input className="w-16 bg-white/5 border-b border-primary/30 text-white text-center text-xs font-black focus:border-primary p-1 rounded-t-sm" type="text" defaultValue={item.time.split(' às ')[1]} />
                    </div>
                  ) : (
                    <span className="text-white/40 text-[10px] font-black uppercase italic tracking-widest">{item.info}</span>
                  )}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input defaultChecked={item.active} className="sr-only peer" type="checkbox" />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>
          ))}
        </div>
        <div className="h-10"></div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur-xl border-t border-white/10 p-4 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 text-white text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-transform border border-white/5 shadow-inner">
            <MaterialIcon name="visibility" className="text-sm" />
            Visualizar
          </button>
          <button className="flex-[1.5] py-4 bg-primary text-background-dark text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-transform">
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

const PharmacyChat = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-gray-100 dark:border-gray-800 bg-background-light dark:bg-background-dark font-display">
      {/* TopAppBar */}
      <header className="sticky top-0 z-10 flex flex-col bg-white dark:bg-[#1a2e22] border-b border-gray-100 dark:border-gray-800 pt-10 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex items-center justify-center p-2 -ml-2 transition-transform active:scale-90">
              <MaterialIcon name="arrow_back_ios" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-slate-200 dark:bg-slate-800 rounded-full w-10 h-10 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                  <MaterialIcon name="store" className="text-primary" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white dark:border-[#1a2e22] rounded-full"></div>
              </div>
              <div>
                <h2 className="text-[#0d1b13] dark:text-white text-base font-black leading-tight tracking-tighter italic">Saúde Total</h2>
                <p className="text-[10px] text-[#4c9a6c] font-black uppercase tracking-widest">Online agora</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[#4c9a6c] text-[9px] font-black uppercase tracking-widest">Pedido</p>
            <p className="text-[#0d1b13] dark:text-white text-sm font-black italic">#12345</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-light dark:bg-background-dark no-scrollbar">
        {/* Date Separator */}
        <div className="flex justify-center my-4">
          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-[9px] text-gray-500 dark:text-gray-400 rounded-full font-black uppercase tracking-widest">Hoje</span>
        </div>

        {/* SingleMessage (Pharmacy) */}
        <div className="flex items-end gap-2 max-w-[85%]">
          <div className="bg-primary/20 rounded-full w-8 h-8 shrink-0 mb-5 flex items-center justify-center text-primary">
            <MaterialIcon name="store" className="text-lg" />
          </div>
          <div className="flex flex-col gap-1 items-start">
            <div className="text-sm font-bold leading-relaxed rounded-2xl px-4 py-2 bg-white dark:bg-[#1a2e22] text-[#0d1b13] dark:text-gray-100 shadow-sm rounded-bl-sm italic">
              Olá! Recebemos sua receita. Gostaria de confirmar o endereço de entrega?
            </div>
            <p className="text-[10px] text-gray-400 font-bold ml-1 uppercase">14:18</p>
          </div>
        </div>

        {/* SingleMessage (User) */}
        <div className="flex items-end gap-2 justify-end">
          <div className="flex flex-col gap-1 items-end max-w-[85%]">
            <div className="text-sm font-black leading-relaxed rounded-2xl px-4 py-2 bg-primary text-[#0d1b13] shadow-sm rounded-br-sm italic">
              Sim, é o mesmo do último pedido.
            </div>
            <div className="flex items-center gap-1 mr-1">
              <p className="text-[10px] text-gray-400 font-black uppercase">14:19</p>
              <MaterialIcon name="done_all" className="text-sm text-primary" />
            </div>
          </div>
        </div>

        {/* SingleMessage with Image (User) */}
        <div className="flex items-end gap-2 justify-end">
          <div className="flex flex-col gap-1 items-end max-w-[85%] w-full">
            <div className="text-sm font-black leading-relaxed rounded-2xl px-4 py-2 bg-primary text-[#0d1b13] shadow-sm mb-1 rounded-br-sm italic">
              Vou enviar uma foto do cartão de convênio.
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 aspect-video rounded-2xl w-full border-4 border-primary shadow-lg overflow-hidden flex items-center justify-center">
              <MaterialIcon name="image" className="text-4xl text-primary/30" />
            </div>
            <div className="flex items-center gap-1 mr-1">
              <p className="text-[10px] text-gray-400 font-black uppercase">14:20</p>
              <MaterialIcon name="done_all" className="text-sm text-primary" />
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
          <p className="text-[10px] text-[#4c9a6c] font-black uppercase tracking-widest italic">Farmácia está digitando...</p>
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white dark:bg-[#1a2e22] p-4 pb-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-transform active:scale-90">
            <MaterialIcon name="add" />
          </button>
          <div className="flex-1 relative">
            <input className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full py-3.5 px-6 text-sm focus:ring-2 focus:ring-primary/20 dark:text-white placeholder-gray-500 font-bold italic" placeholder="Escreva sua mensagem..." type="text" />
          </div>
          <button className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-[#0d1b13] shadow-xl shadow-primary/20 transition-all active:scale-95 hover:rotate-12">
            <MaterialIcon name="send" />
          </button>
        </div>
      </footer>

      {/* iOS Home Indicator (Visual Only) */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-300 dark:bg-gray-700 rounded-full opacity-50"></div>
    </div>
  );
};

const InventoryControl = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl font-display">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-background-light dark:bg-background-dark/95 backdrop-blur-md">
        {/* TopAppBar */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={() => navigate(-1)} className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start transition-transform active:scale-90">
            <MaterialIcon name="arrow_back_ios" />
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tight flex-1 text-center italic">Estoque</h2>
          <div className="flex w-12 items-center justify-end">
            <button className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-white p-0">
              <MaterialIcon name="notifications" />
            </button>
          </div>
        </div>
        {/* SearchBar */}
        <div className="px-4 py-2">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-2xl h-full shadow-sm">
              <div className="text-slate-400 dark:text-[#92c9a9] flex border-none bg-white dark:bg-[#234833] items-center justify-center pl-4 rounded-l-2xl">
                <MaterialIcon name="search" />
              </div>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-[#234833] h-full placeholder:text-slate-400 dark:placeholder:text-[#92c9a9] px-4 pl-2 text-base font-bold italic" placeholder="Buscar por nome ou código..." />
            </div>
          </label>
        </div>
        {/* Chips / Category Filters */}
        <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar">
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary px-5 cursor-pointer shadow-lg shadow-primary/20">
            <p className="text-background-dark text-xs font-black uppercase tracking-widest">Todos</p>
          </button>
          {['Medicamentos', 'Higiene', 'Beleza', 'Infantil'].map(cat => (
            <button key={cat} className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-[#234833] px-5 cursor-pointer hover:bg-slate-200 dark:hover:bg-[#2d5c41] transition-colors border border-black/5 dark:border-white/5">
              <p className="text-slate-700 dark:text-white text-xs font-black uppercase tracking-widest leading-none">{cat}</p>
            </button>
          ))}
        </div>
        <div className="h-px bg-slate-200 dark:bg-white/10 mx-4"></div>
      </div>

      {/* Product List */}
      <div className="flex flex-col pb-32">
        {[
          { name: "Paracetamol 500mg", price: "12,50", stock: 5, low: true, icon: "medication" },
          { name: "Sabonete Líquido 250ml", price: "8,90", stock: 42, low: false, icon: "sanitizer" },
          { name: "Vitamina C 1g", price: "24,90", stock: 15, low: false, icon: "pill" },
          { name: "Fralda G 32un", price: "54,90", stock: 2, low: true, icon: "child_care" },
          { name: "Escova Dental Macia", price: "15,00", stock: 28, low: false, icon: "brush" }
        ].map((item, i) => (
          <div key={i} className="flex gap-4 bg-transparent px-4 py-4 justify-between items-center border-b border-slate-100 dark:border-white/5 group">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-slate-200 dark:bg-[#234833] rounded-2xl size-[72px] shrink-0 shadow-inner flex items-center justify-center text-slate-400">
                <MaterialIcon name={item.icon} className="text-3xl" />
              </div>
              <div className="flex flex-1 flex-col justify-center py-1">
                <p className="text-slate-900 dark:text-white text-base font-black leading-tight mb-1 italic">{item.name}</p>
                {item.low ? (
                  <div className="flex items-center gap-1.5 mb-1">
                    <MaterialIcon name="warning" className="text-red-500 text-[16px]" />
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Estoque Baixo</p>
                  </div>
                ) : (
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-1">Em estoque</p>
                )}
                <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-black italic">R$ {item.price}</p>
              </div>
            </div>
            <div className="shrink-0 pl-2">
              <div className="flex items-center gap-3 text-slate-900 dark:text-white bg-slate-100 dark:bg-[#1a3325] p-1.5 rounded-full shadow-inner">
                <button className="text-lg font-black flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#234833] shadow-sm cursor-pointer active:scale-90 transition-transform hover:rotate-6 border border-black/5 dark:border-white/5">-</button>
                <span className="text-base font-black w-6 text-center italic">{item.stock}</span>
                <button className="text-lg font-black flex h-9 w-9 items-center justify-center rounded-full bg-primary text-background-dark shadow-sm cursor-pointer active:scale-90 transition-transform hover:-rotate-6">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <Link to="/merchant/add-product" className="fixed bottom-28 right-6 flex items-center justify-center w-14 h-14 rounded-[20px] bg-primary text-background-dark shadow-2xl shadow-primary/30 z-50 active:scale-90 transition-all hover:rotate-12">
        <MaterialIcon name="add" className="scale-125" />
      </Link>

      {/* Bottom Tab Bar (iOS Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
        <div className="max-w-md mx-auto flex items-center justify-around bg-slate-900 dark:bg-zinc-800 rounded-full py-2 px-6 shadow-2xl ring-1 ring-white/10">
          <Link to="/merchant" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="home" />
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </Link>
          <Link to="/merchant/financial" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="account_balance_wallet" />
            <span className="text-[9px] font-black uppercase tracking-widest">Financeiro</span>
          </Link>
          <Link to="/merchant-orders" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="receipt_long" />
            <span className="text-[9px] font-black uppercase tracking-widest">Pedidos</span>
          </Link>
          <Link to="/merchant/settings" className="flex flex-col items-center gap-1 text-slate-400 p-2 opacity-50">
            <MaterialIcon name="settings" />
            <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};
const AdminLayout = ({ children, activeTab, profile }: { children: React.ReactNode, activeTab: string, profile: any }) => {

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-zinc-900 border-r border-white/5 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <MaterialIcon name="admin_panel_settings" className="text-primary text-2xl" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic text-white leading-none">Admin</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">PharmaLink</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {[
            { to: "/admin", icon: "dashboard", label: "Dashboard", id: "dash" },
            { to: "/admin/users", icon: "group", label: "Usuários", id: "users" },
            { to: "/admin/pharmacies", icon: "storefront", label: "Farmácias", id: "pharmacies" },
            { to: "/admin/motoboys", icon: "moped", label: "Motoboys", id: "motoboys" },
            { to: "/admin/ads", icon: "campaign", label: "Anúncios", id: "ads" },
            { to: "/admin/promotions", icon: "local_offer", label: "Promoções", id: "promos" },
            { to: "/admin/settings", icon: "settings", label: "Configurações", id: "settings" },
          ].map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-primary text-background-dark font-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <MaterialIcon name={item.icon} fill={activeTab === item.id} />
              <span className="text-sm uppercase tracking-widest font-black italic">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <MaterialIcon name="person" className="text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate italic">{profile?.full_name || 'Usuário'}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{profile?.role === 'admin' ? 'Super Admin' : 'Usuário'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="flex-1 w-full max-w-7xl mx-auto md:px-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation (Visible only on app view) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto bg-slate-900 dark:bg-zinc-800 rounded-full px-4 shadow-2xl ring-1 ring-white/10">
            <Link to="/admin" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'dash' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="dashboard" fill={activeTab === 'dash'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Dash</span>
            </Link>
            <Link to="/admin/users" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'users' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="group" fill={activeTab === 'users'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Users</span>
            </Link>
            <Link to="/admin/pharmacies" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'pharmacies' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="storefront" fill={activeTab === 'pharmacies'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Lojas</span>
            </Link>
            <Link to="/admin/motoboys" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'motoboys' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="moped" fill={activeTab === 'motoboys'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Motoboys</span>
            </Link>
            <Link to="/admin/ads" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'ads' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="campaign" fill={activeTab === 'ads'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Ads</span>
            </Link>
            <Link to="/admin/promotions" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'promos' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="local_offer" fill={activeTab === 'promos'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Promos</span>
            </Link>
            <Link to="/admin/settings" className={`flex flex-col items-center justify-center p-2 ${activeTab === 'settings' ? 'text-primary' : 'text-gray-500 opacity-50'}`}>
              <MaterialIcon name="settings" fill={activeTab === 'settings'} />
              <span className="text-[9px] font-black uppercase tracking-widest">Configs</span>
            </Link>
          </div>
        </nav>

        {/* Home Indicator (iOS Mobile Only) */}
        <div className="md:hidden fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-[60]"></div>
      </main>
    </div>
  );
};

const PharmacyManagement = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPharm, setEditingPharm] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    cep: '',
    address: '',
    addressBase: '', // Campo auxiliar para guardar o logradouro vindo do CEP
    number: '',
    complement: '',
    latitude: '',
    longitude: '',
    rating: '5.0',
    is_open: true,
    plan: 'Gratuito',
    status: 'Aprovado'
  });

  const fetchPharmacies = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
    if (!error) setPharmacies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Formatar o endereço completo antes de salvar
    const finalAddress = `${formData.addressBase || formData.address}${formData.number ? `, ${formData.number}` : ''}${formData.complement ? `, ${formData.complement}` : ''}`;

    const payload = {
      name: formData.name,
      address: finalAddress,
      latitude: parseFloat(formData.latitude) || 0,
      longitude: parseFloat(formData.longitude) || 0,
      rating: parseFloat(formData.rating) || 5.0,
      is_open: formData.is_open,
      plan: formData.plan,
      status: formData.status
    };

    let error;
    if (editingPharm) {
      const { error: err } = await supabase.from('pharmacies').update(payload).eq('id', editingPharm.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('pharmacies').insert([payload]);
      error = err;
    }

    if (error) alert(error.message);
    else {
      setShowModal(false);
      setEditingPharm(null);
      fetchPharmacies();
    }
  };

  const handleCEPBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      // 1. Buscar endereço via ViaCEP
      const viaCEPResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const viaCEPData = await viaCEPResponse.json();

      if (viaCEPData.erro) {
        alert("CEP não encontrado.");
        return;
      }

      const fullAddress = `${viaCEPData.logradouro}, ${viaCEPData.bairro}, ${viaCEPData.localidade} - ${viaCEPData.uf}`;

      // 2. Buscar coordenadas via Google Maps (usando a chave salva no sistema)
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'google_maps_api_key')
        .single();

      let lat = '';
      let lng = '';

      if (settings?.value) {
        const mapsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${settings.value}`
        );
        const mapsData = await mapsResponse.json();
        if (mapsData.results && mapsData.results[0]) {
          lat = mapsData.results[0].geometry.location.lat.toString();
          lng = mapsData.results[0].geometry.location.lng.toString();
        }
      }

      setFormData(prev => ({
        ...prev,
        address: fullAddress,
        addressBase: fullAddress, // Guardar o endereço base sem número/complemento
        latitude: lat,
        longitude: lng
      }));

    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta farmácia?')) {
      const { error } = await supabase.from('pharmacies').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchPharmacies();
    }
  };

  const openEdit = (pharm: any) => {
    setEditingPharm(pharm);
    setFormData({
      name: pharm.name,
      cep: '',
      address: pharm.address,
      addressBase: pharm.address, // No edit, tratamos o endereço atual como base
      number: '',
      complement: '',
      latitude: pharm.latitude?.toString() || '',
      longitude: pharm.longitude?.toString() || '',
      rating: pharm.rating?.toString() || '5.0',
      is_open: pharm.is_open,
      plan: pharm.plan || 'Gratuito',
      status: pharm.status || 'Aprovado'
    });
    setShowModal(true);
  };

  return (
    <AdminLayout activeTab="pharmacies" profile={profile}>
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center p-5 justify-between w-full">
          <div className="flex items-center gap-3">
            <MaterialIcon name="storefront" className="text-primary md:hidden" />
            <h1 className="text-xl font-black tracking-tighter italic">Gestão de Farmácias</h1>
          </div>
          <button
            onClick={() => {
              setEditingPharm(null);
              setFormData({
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
                status: 'Aprovado'
              });
              setShowModal(true);
            }}
            className="flex items-center justify-center rounded-2xl w-10 h-10 bg-primary/20 text-primary hover:bg-primary/30 transition-all active:scale-95 shadow-sm"
          >
            <MaterialIcon name="add" />
          </button>
        </div>
      </header>

      <main className="pb-32 md:pb-10">
        <div className="px-5 py-6 flex flex-col md:flex-row gap-4">
          <label className="relative flex items-center group flex-1">
            <div className="absolute left-4 text-slate-400 dark:text-[#92c9a9] group-focus-within:text-primary transition-colors">
              <MaterialIcon name="search" />
            </div>
            <input className="w-full h-14 pl-12 pr-4 bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-2xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-[#92c9a9]/30 shadow-inner font-bold italic" placeholder="Buscar farmácia por nome..." type="text" />
          </label>
        </div>

        <div className="px-5 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Cadastrado', value: pharmacies.length.toString(), color: 'slate-500', icon: 'bar_chart' },
            { label: 'Planos Premium', value: pharmacies.filter(p => p.plan === 'Ouro').length.toString(), color: 'primary', icon: 'stars' },
            { label: 'Pendentes', value: pharmacies.filter(p => p.status === 'Pendente').length.toString(), color: 'orange-500', icon: 'hourglass_empty' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e23] p-6 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}/10 text-${stat.color}`}>
                <MaterialIcon name={stat.icon} />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-[#92c9a9] font-black">{stat.label}</p>
                <p className={`text-2xl font-black italic mt-0.5`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
          ) : pharmacies.map((pharm) => (
            <div key={pharm.id} className="bg-white dark:bg-[#1a2e23] rounded-[32px] border border-slate-200 dark:border-white/5 p-6 shadow-md flex flex-col gap-6 group hover:scale-[1.02] transition-all hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#234833]/10 border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0">
                  <MaterialIcon name="store" className="text-3xl text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <h3 className="font-black text-lg italic truncate leading-tight">{pharm.name}</h3>
                    <span className={`w-fit mt-1.5 bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest`}>{pharm.plan || 'Bronze'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] mt-2 font-bold italic truncate opacity-70">{pharm.address}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${pharm.status === 'Pendente' ? 'bg-orange-500' : 'bg-primary'} animate-pulse`}></span>
                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{pharm.status || 'Aprovado'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(pharm)} className="p-2.5 flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl transition-colors hover:bg-primary/20 active:scale-90 shadow-sm border border-transparent hover:border-primary/20">
                    <MaterialIcon name="edit" className="text-sm" />
                  </button>
                  <button onClick={() => handleDelete(pharm.id)} className="p-2.5 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl transition-colors hover:bg-red-500 hover:text-white active:scale-90 shadow-sm border border-transparent">
                    <MaterialIcon name="delete" className="text-sm" />
                  </button>
                </div>
              </div>

              <button className={`w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white border border-black/5 dark:border-white/5 font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl transition-all active:scale-95 shadow-sm`}>
                <MaterialIcon name="star" className="text-lg" />
                Destaque
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1a2e22] rounded-[32px] shadow-2xl overflow-hidden border border-white/10">
            <form onSubmit={handleSave} className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic tracking-tighter">{editingPharm ? 'Editar Farmácia' : 'Nova Farmácia'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="size-10 rounded-full bg-slate-100 dark:bg-black/20 flex items-center justify-center hover:rotate-90 transition-transform"><MaterialIcon name="close" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">CEP (Busca endereço e localização)</span>
                  <input
                    required
                    placeholder="00000-000"
                    className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic"
                    value={formData.cep}
                    onChange={e => setFormData({ ...formData, cep: e.target.value })}
                    onBlur={handleCEPBlur}
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Nome da Farmácia</span>
                  <input required className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </label>
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Endereço (Auto-preenchido pelo CEP)</span>
                  <input required className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.addressBase} onChange={e => setFormData({ ...formData, addressBase: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Nº</span>
                  <input required placeholder="Ex: 06" className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Complemento</span>
                  <input placeholder="Ex: lj 04" className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Plano</span>
                  <select className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}>
                    <option value="Gratuito">Gratuito (15 pedidos)</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Prata">Prata</option>
                    <option value="Ouro">Ouro</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Status</span>
                  <select className="h-12 px-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none font-bold italic" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="w-full mt-8 bg-primary text-background-dark font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-98 transition-all uppercase tracking-tighter">
                {editingPharm ? 'Salvar Alterações' : 'Cadastrar Loja'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const AdManagement = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  return (
    <AdminLayout activeTab="ads" profile={profile}>
      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-5 items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Anúncios e Destaques</h1>
        <div className="flex gap-3">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
            <MaterialIcon name="bar_chart" className="text-primary" />
            <span className="truncate">Relatório</span>
          </button>
          <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
            <MaterialIcon name="add_photo_alternate" />
            <span>Novo Banner</span>
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 md:hidden">
        <div className="flex items-center p-4 justify-between w-full">
          <div className="flex items-center gap-3">
            <MaterialIcon name="campaign" className="text-primary" />
            <h1 className="text-lg font-black tracking-tighter italic">Anúncios e Destaques</h1>
          </div>
          <button className="flex items-center justify-center rounded-full w-10 h-10 bg-slate-200 dark:bg-white/10 active:scale-95 transition-transform">
            <MaterialIcon name="account_circle" />
          </button>
        </div>
      </header>

      <main className="pb-32 md:pb-10 p-4 md:p-8">
        {/* Stats Row */}
        <div className="flex md:grid md:grid-cols-4 flex-nowrap gap-4 mb-8 overflow-x-auto no-scrollbar md:overflow-visible">
          {[
            { label: 'CTR Médio', value: '1.2%', trend: '+0.2%', icon: 'trending_up' },
            { label: 'Cliques', value: '4.5k', trend: '+12%', icon: 'trending_up' },
            { label: 'Impressões', value: '124k', trend: '+8%', icon: 'visibility' },
            { label: 'Ocupação', value: '8/10', sub: '2 vago(s)', icon: 'space_dashboard' }
          ].map((stat, i) => (stat.label !== 'Ocupação' ? (
            <div key={i} className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-[24px] p-5 bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
              <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black italic tracking-tighter mt-1">{stat.value}</p>
              <p className="text-primary text-[10px] font-black uppercase flex items-center gap-1">
                <MaterialIcon name={stat.icon} className="text-xs" /> {stat.trend}
              </p>
            </div>
          ) : (
            <div key={i} className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-[24px] p-5 bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
              <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black italic tracking-tighter mt-1">{stat.value}</p>
              <p className="text-slate-400 dark:text-[#92c9a9] text-[10px] font-black uppercase opacity-60">{stat.sub}</p>
            </div>
          )))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* New Banner Form */}
          <div className="lg:w-1/3">
            <div className="bg-white dark:bg-[#193324] rounded-[32px] p-6 border border-slate-200 dark:border-white/5 shadow-md sticky top-24">
              <h3 className="font-black text-lg mb-5 flex items-center gap-2 italic tracking-tighter">
                <MaterialIcon name="add_photo_alternate" className="text-primary" />
                Novo Banner
              </h3>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-black/20 hover:border-primary/50 transition-colors cursor-pointer group">
                  <MaterialIcon name="cloud_upload" className="text-4xl opacity-50 group-hover:scale-110 transition-transform text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Toque para subir imagem</p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-black/40 rounded-2xl">
                  {['Topo', 'Meio', 'Base'].map((pos, i) => (
                    <button key={pos} className={`${i === 0 ? 'bg-primary text-background-dark font-black' : 'text-slate-400 dark:text-white/40 font-bold'} text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all`}>
                      {pos}
                    </button>
                  ))}
                </div>

                <button className="w-full bg-primary text-background-dark font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-primary/20 uppercase tracking-tighter text-sm">
                  <MaterialIcon name="send" />
                  Publicar Anúncio
                </button>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between pb-6 pt-2">
              <h2 className="text-xl font-black tracking-tighter italic">Banners Ativos</h2>
              <button className="text-primary text-[10px] font-black uppercase tracking-widest italic hover:opacity-70 transition-opacity">Ver todos</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Ofertas Tech", expires: "4 dias", pos: "Topo", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHACRZmVb42PYIBzLy7gmzY_q_YhSIHyvDau2dxOA2z_U3gzJacmOzSkMClFVtyAPzNlH27cJrWQpM1PuL4OyIxvy0xqPb7ciZMEphK-DxtyAMasGNk_ygqzjDeE6oQypV8mHEenKAbT6I7bNB2wPTaT8OcEeXrhSOafXQLuZd86KLf_yxEamRbwRwi05Tz9om_4LYDcczkBt3TTytmpDwheSDLPu8aaqducBjhg2KlO2jzvJQUKxHOM_tGl4B-cyfui7Ny7moCg", perf: 80, ctr: "0.8%" },
                { title: "Coleção Verão", expires: "12 dias", pos: "Meio", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ04Sw1VT5QvkJqYdvfTJoDG5ErpqPQ69kAw-tdAxZpJT7XLhmtP-knbT84AGm3FPtM-kMBGE_gdXbWQVY18kE6c7R7GO2VIi9u5pjxpNJV74ueHwVitIAqdcozVScJTaothKpmn_sUpDHDS3yrsssaDL2PbnTYf9JUHsG8bFogG0EiHPAX9y8FdvOrXQ9Zd-mSE25shiGXTlR_cXmjlZlgZ5s520e-23FzsUNLVOeE0_QZomXX2L72Aw4o38jHCC9qy3bR0k0kQ", perf: 100, ctr: "1.4%" },
                { title: "Semana da Beleza", expires: "20 dias", pos: "Base", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAc3-5o_8tY_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9_y_9f9o-o-Y_8-t9", perf: 45, ctr: "0.5%" },
              ].map((ad, i) => (
                <div key={i} className="flex flex-col gap-4 rounded-[32px] bg-white dark:bg-[#193324] p-5 shadow-sm border border-slate-200 dark:border-white/5 group hover:scale-[1.01] transition-transform">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-2xl flex-shrink-0 border border-slate-100 dark:border-white/10 shadow-inner" style={{ backgroundImage: `url("${ad.img}")` }}></div>
                    <div className="flex flex-col justify-between py-1 flex-grow">
                      <div>
                        <div className="flex justify-between items-start">
                          <p className={`${ad.pos === 'Topo' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-300 border-transparent'} text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border`}>{ad.pos}</p>
                          <button className="text-slate-400 hover:text-white transition-colors">
                            <MaterialIcon name="more_vert" />
                          </button>
                        </div>
                        <p className="text-lg font-black leading-tight mt-2 italic tracking-tight">{ad.title}</p>
                        <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Expira em {ad.expires}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center rounded-xl h-9 px-3 bg-slate-100 dark:bg-[#234833] text-[9px] font-black uppercase tracking-widest gap-1 border border-black/5 dark:border-white/5 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-[#2d5c41]">
                      <MaterialIcon name="edit" className="text-xs" /> Editar
                    </button>
                    <button className="flex-1 flex items-center justify-center rounded-xl h-9 px-3 bg-slate-100 dark:bg-[#234833] text-[9px] font-black uppercase tracking-widest gap-1 border border-black/5 dark:border-white/5 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-[#2d5c41]">
                      <MaterialIcon name="pause" className="text-xs text-red-500" /> Pausar
                    </button>
                  </div>

                  {/* Performance Indicator */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-500 dark:text-[#92c9a9]">Performance</span>
                      <span className="text-primary">{ad.ctr} CTR</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-[#326748] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,109,0.3)] transition-all duration-1000" style={{ width: `${ad.perf}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

const UserWallet = () => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen pb-24 transition-colors duration-200">
      {/* Top App Bar */}
      <header className="flex items-center px-4 py-3 justify-between sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90">
          <MaterialIcon name="arrow_back_ios" className="text-xl ml-1" />
        </button>
        <h1 className="text-lg font-black tracking-tighter italic">Minha Carteira</h1>
        <button className="relative flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
          <MaterialIcon name="notifications" className="text-xl" />
          <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-red-500 border border-white dark:border-background-dark"></span>
        </button>
      </header>

      <main className="max-w-md mx-auto">
        {/* Main Wallet Card */}
        <div className="p-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-[#164e8a] rounded-[32px] p-8 shadow-2xl shadow-primary/20 group">
            <div className="absolute top-0 right-0 size-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="flex flex-col gap-1">
                  <span className="text-white/70 text-[10px] font-black uppercase tracking-widest leading-none">Saldo Disponível</span>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-white text-4xl font-black italic tracking-tighter">R$ 150,00</h2>
                    <MaterialIcon name="visibility" className="text-white/50 text-xl cursor-pointer hover:text-white/80 transition-colors" />
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                  <MaterialIcon name="account_balance_wallet" className="text-white text-2xl" />
                </div>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 bg-white text-primary rounded-2xl py-4 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                  <MaterialIcon name="add_circle" className="text-lg" />
                  Adicionar
                </button>
                <button className="flex-1 bg-primary/20 border border-white/20 text-white rounded-2xl py-4 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all backdrop-blur-md hover:bg-primary/30">
                  <MaterialIcon name="payments" className="text-lg" />
                  Transferir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <section className="mt-4">
          <div className="px-6 flex justify-between items-center mb-5">
            <h3 className="text-lg font-black tracking-tighter italic">Formas de Pagamento</h3>
            <button className="text-primary text-[10px] font-black uppercase tracking-widest italic hover:opacity-70 transition-opacity">Ver todos</button>
          </div>
          <div className="px-4 flex flex-col gap-4">
            {/* Add New Card Item */}
            <div className="flex items-center gap-4 bg-white dark:bg-[#161f28] border border-dashed border-primary/40 rounded-2xl p-5 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5 transition-all group active:scale-[0.98]">
              <div className="flex items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 size-14 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                <MaterialIcon name="add" className="text-2xl" />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm italic">Novo Cartão</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Compre com mais agilidade</p>
              </div>
              <MaterialIcon name="chevron_right" className="text-slate-300 dark:text-white/20" />
            </div>

            {/* Existing Card */}
            <div className="flex items-center gap-4 bg-white dark:bg-[#161f28] rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-center rounded-2xl bg-slate-900 border border-white/5 shrink-0 size-14 shadow-lg">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3L1O82gV2oEIUgERNLvpB2HkObqEetW2l2iqOIRbUJY44kspDxDasCo7NjVOSQmstJHw7ct04dP5FpIL9hh0pYHkreF5sHv460oVu7TZXoP4X_zyoZtkqblKTB_cfqqOW_xiSJp_DizPdmJb9fKeLbOja7yeNbRTvOxkhBLJEsxy-jjbcIjrey2uEShuCaXlvnQ0JKNs2eJg7ALhTi_u2jQvXMt6tLL8DZhDTszVxkEW7c-y1xYDa3IYbc8CmF_t8VGF0w_JVKA" alt="Visa" className="w-10 opacity-90" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm italic">Visa Final 4432</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Expira em 10/27</p>
              </div>
              <span className="text-[8px] font-black px-3 py-1 bg-primary/20 text-primary rounded-full uppercase tracking-widest border border-primary/20">Padrão</span>
            </div>
          </div>
        </section>

        {/* Coupons Section */}
        <section className="mt-10">
          <div className="px-6 flex justify-between items-center mb-5">
            <h3 className="text-lg font-black tracking-tighter italic">Meus Cupons</h3>
            <div className="flex items-center gap-1.5 text-primary">
              <MaterialIcon name="confirmation_number" className="text-xl" />
              <span className="text-[10px] font-black uppercase tracking-widest italic">2 Disponíveis</span>
            </div>
          </div>
          <div className="px-4 flex flex-col gap-4">
            {/* Coupon 1 */}
            <div className="relative overflow-hidden bg-white dark:bg-[#161f28] border-l-4 border-primary rounded-xl p-5 flex items-center gap-4 shadow-lg shadow-primary/5 group">
              {/* Ticket Cutouts Effect */}
              <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-background-light dark:bg-background-dark rounded-full shadow-inner"></div>
              <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-background-light dark:bg-background-dark rounded-full shadow-inner"></div>

              <div className="bg-primary/20 text-primary p-4 rounded-xl flex flex-col items-center justify-center min-w-[80px] border border-primary/10">
                <span className="text-2xl font-black italic leading-none">10%</span>
                <span className="text-[10px] font-black uppercase tracking-widest mt-1">OFF</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm italic truncate">Desconto em Vitaminas</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">Min. R$ 80,00</p>
                <div className="flex items-center gap-1 mt-2">
                  <MaterialIcon name="schedule" className="text-xs text-orange-400" />
                  <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest">Expira em 2 dias</span>
                </div>
              </div>
              <button className="bg-primary text-white text-[10px] font-black px-5 py-2.5 rounded-full active:scale-95 transition-all shadow-lg shadow-primary/20 uppercase tracking-tighter">USAR</button>
            </div>

            {/* Coupon 2 */}
            <div className="relative overflow-hidden bg-white dark:bg-[#161f28] border-l-4 border-green-500 rounded-xl p-5 flex items-center gap-4 shadow-lg shadow-green-500/5 group">
              <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-background-light dark:bg-background-dark rounded-full shadow-inner"></div>
              <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-background-light dark:bg-background-dark rounded-full shadow-inner"></div>

              <div className="bg-green-500/20 text-green-500 p-4 rounded-xl flex flex-col items-center justify-center min-w-[80px] border border-green-500/10">
                <MaterialIcon name="local_shipping" className="text-xl" />
                <span className="text-[10px] font-black uppercase tracking-widest mt-1">GRÁTIS</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-sm italic truncate">Entrega Gratis</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">Toda linha de higiene</p>
                <div className="flex items-center gap-1 mt-2">
                  <MaterialIcon name="event" className="text-xs text-slate-500" />
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Até 30 Outubro</span>
                </div>
              </div>
              <button className="bg-green-500 text-white text-[10px] font-black px-5 py-2.5 rounded-full active:scale-95 transition-all shadow-lg shadow-green-500/10 uppercase tracking-tighter">USAR</button>
            </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="mt-10 mb-8">
          <h3 className="text-lg font-black tracking-tighter italic px-6 mb-5">Atividade Recente</h3>
          <div className="mx-4 bg-white dark:bg-[#161f28] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden divide-y divide-black/5 dark:divide-white/5">
            {[
              { title: "Farmácia Central", date: "Hoje, 14:20", amount: "- R$ 45,90", icon: "shopping_bag", color: "red-500" },
              { title: "Recarga de Saldo", date: "Ontem, 09:15", amount: "+ R$ 50,00", icon: "add_card", color: "primary" },
              { title: "Drogaria Saúde", date: "22 de Out, 18:45", amount: "- R$ 12,30", icon: "medical_services", color: "red-500" }
            ].map((tx, i) => (
              <div key={i} className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <div className={`size-11 rounded-full ${tx.color === 'primary' ? 'bg-primary/20 text-primary' : 'bg-slate-800 dark:bg-slate-800 text-red-400'} flex items-center justify-center shadow-inner`}>
                  <MaterialIcon name={tx.icon} className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black italic truncate">{tx.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">{tx.date}</p>
                </div>
                <p className={`text-sm font-black italic ${tx.amount.startsWith('+') ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>{tx.amount}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic hover:opacity-70 transition-opacity">Ver histórico completo</button>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent backdrop-blur-sm">
        <div className="flex justify-around items-center h-16 max-w-sm mx-auto bg-slate-900 dark:bg-zinc-800 rounded-full px-6 shadow-2xl ring-1 ring-white/10">
          <Link to="/" className="text-gray-500 p-2 opacity-50">
            <MaterialIcon name="home" />
          </Link>
          <Link to="/pharmacies" className="text-gray-500 p-2 opacity-50">
            <MaterialIcon name="search" />
          </Link>
          <button className="text-primary p-2 flex flex-col items-center">
            <MaterialIcon name="account_balance_wallet" fill />
            <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"></div>
          </button>
          <Link to="/order-tracking" className="text-gray-500 p-2 opacity-50">
            <MaterialIcon name="receipt_long" />
          </Link>
          <Link to="/profile" className="text-gray-500 p-2 opacity-50">
            <MaterialIcon name="person" />
          </Link>
        </div>
      </nav>

      {/* Home Indicator */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-[60]"></div>
    </div>
  );
};
const UserManagement = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  return (
    <AdminLayout activeTab="users" profile={profile}>
      {/* TopAppBar - Fixed for Desktop too */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 md:hidden">
        <div className="flex items-center p-4 justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start transition-transform active:scale-90">
              <MaterialIcon name="arrow_back_ios" />
            </button>
            <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter italic">Gestão de Usuários</h2>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-white p-0 overflow-hidden">
              <MaterialIcon name="more_vert" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-5 items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Usuários</h1>
        <div className="flex gap-3">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
            <MaterialIcon name="download" className="text-primary" />
            <span className="truncate">Exportar</span>
          </button>
          <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
            <MaterialIcon name="person_add" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </header>

      <main className="pb-32 md:pb-10">
        <div className="flex flex-col gap-6">
          {/* Tabs & Search */}
          <div className="bg-white dark:bg-[#1a2e23] md:rounded-b-3xl shadow-sm border-b border-slate-200 dark:border-white/5 md:mx-5 md:mt-5 md:rounded-3xl md:border">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-[#326748] px-4 justify-between md:justify-start md:gap-8">
              <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-slate-900 dark:text-white pb-[13px] pt-4 md:px-4">
                <p className="text-sm font-black uppercase tracking-widest leading-none">Clientes</p>
              </button>
              <button className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-400 dark:text-[#92c9a9] pb-[13px] pt-4 md:px-4 opacity-50 hover:opacity-100 transition-opacity">
                <p className="text-sm font-black uppercase tracking-widest leading-none">Lojistas</p>
              </button>
            </div>

            {/* SearchBar */}
            <div className="px-4 py-4 md:p-4">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-2xl h-full shadow-sm overflow-hidden bg-slate-100 dark:bg-[#234833]">
                  <div className="text-slate-400 dark:text-[#92c9a9] flex border-none items-center justify-center pl-4">
                    <MaterialIcon name="search" />
                  </div>
                  <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent focus:border-none h-full placeholder:text-slate-400 dark:placeholder:text-[#92c9a9] px-4 pl-2 text-base font-bold italic focus:ring-0" placeholder="Buscar por nome ou e-mail..." />
                </div>
              </label>
            </div>
          </div>

          {/* Mobile Export Button */}
          <div className="flex px-4 md:hidden">
            <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-12 px-4 flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
              <MaterialIcon name="download" className="text-primary" />
              <span className="truncate">Exportar Dados</span>
            </button>
          </div>

          {/* List Section */}
          <div className="px-4 md:px-5">
            <div className="flex items-center justify-between pb-4 pt-2">
              <h3 className="text-slate-900 dark:text-white text-lg font-black tracking-tighter italic">Lista de Usuários</h3>
              <span className="text-[10px] font-black text-slate-400 dark:text-[#92c9a9] uppercase tracking-widest">Total: 482</span>
            </div>

            {/* User Grid/Table - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { name: "Ricardo Almeida", email: "ricardo.a@email.com", status: "Ativo", date: "12/10/2023", color: "primary" },
                { name: "Ana Clara Mendonça", email: "anaclara@gmail.com", status: "Bloqueado", date: "08/10/2023", color: "red-500" },
                { name: "Bruno Ferreira", email: "bruno.dev@outlook.com", status: "Ativo", date: "05/09/2023", color: "primary" },
                { name: "Mariana Souza", email: "mariana.s@web.com", status: "Ativo", date: "28/08/2023", color: "primary" },
                { name: "Carlos Eduardo", email: "carlos.e@email.com", status: "Pendente", date: "01/11/2023", color: "orange-500" },
                { name: "Fernanda Lima", email: "fernanda.l@web.com", status: "Ativo", date: "15/09/2023", color: "primary" }
              ].map((u, i) => (
                <div key={i} className="flex flex-col p-5 bg-white dark:bg-[#1a2e22] rounded-[24px] border border-slate-200 dark:border-[#234833] shadow-md group hover:scale-[1.02] transition-transform h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white font-black italic">
                        {u.name.charAt(0)}
                      </div>
                      <div className={`px-3 py-1 bg-${u.color}/10 border border-${u.color}/30 rounded-full`}>
                        <span className={`text-${u.color} text-[9px] font-black uppercase tracking-widest`}>{u.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col mb-4">
                      <span className="text-slate-900 dark:text-white font-black text-base italic line-clamp-1">{u.name}</span>
                      <span className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#92c9a9]">
                      <MaterialIcon name="calendar_today" className="text-sm" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{u.date}</span>
                    </div>
                    <button className="text-primary hover:rotate-12 transition-transform bg-primary/10 p-2 rounded-lg">
                      <MaterialIcon name="edit" className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Floating Action Button */}
        <div className="fixed bottom-28 right-6 z-50 md:hidden">
          <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-14 w-14 items-center justify-center rounded-[20px] shadow-2xl shadow-primary/30 transition-all active:scale-90 hover:-rotate-12">
            <MaterialIcon name="person_add" className="scale-125" />
          </button>
        </div>
      </main>
    </AdminLayout>
  );
};

const PromotionManagement = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  return (
    <AdminLayout activeTab="promos" profile={profile}>
      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-5 items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Promoções</h1>
        <div className="flex gap-3">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 flex-1 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
            <MaterialIcon name="history" className="text-primary" />
            <span className="truncate">Histórico</span>
          </button>
          <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
            <MaterialIcon name="rocket_launch" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-[#326748]/30 md:hidden">
        <div className="flex items-center p-4 justify-between w-full">
          <button onClick={() => navigate(-1)} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer active:scale-90">
            <MaterialIcon name="arrow_back_ios_new" />
          </button>
          <h2 className="text-white text-lg font-black leading-tight tracking-tighter flex-1 text-center italic">Gestão de Promoções</h2>
          <div className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer">
            <MaterialIcon name="more_horiz" />
          </div>
        </div>
      </header>

      <main className="pb-32 md:pb-10 p-4 md:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Create Campaign Column */}
          <div className="lg:w-1/3">
            <div className="sticky top-24">
              <div className="px-1 md:hidden">
                <h2 className="text-white text-[22px] font-black leading-tight tracking-tighter pt-5 pb-2 italic">Nova Campanha</h2>
                <p className="text-[#92c9a9] text-sm font-medium mb-4 italic opacity-70">Preencha os detalhes para lançar uma nova oferta na rede.</p>
              </div>

              {/* Campaign Form Container */}
              <div className="bg-[#193324]/30 border border-[#326748]/50 rounded-[32px] overflow-hidden shadow-xl md:bg-white md:dark:bg-[#193324] md:border-slate-200 md:dark:border-white/5">
                <div className="hidden md:block p-6 border-b border-black/5 dark:border-white/5">
                  <h2 className="text-slate-900 dark:text-white text-xl font-black italic">Nova Campanha</h2>
                  <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold mt-1">Configure o lançamento</p>
                </div>

                <div className="flex flex-col gap-4 p-5 md:p-6">
                  {/* Name Field */}
                  <label className="flex flex-col w-full">
                    <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Nome da Campanha</p>
                    <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 focus:border-primary h-14 placeholder:text-[#92c9a9]/30 md:placeholder:text-slate-400 p-4 text-base font-bold italic transition-all shadow-sm" placeholder="Ex: Black Friday Farmácias" />
                  </label>

                  {/* Dates Row */}
                  <div className="flex gap-4">
                    <label className="flex flex-col flex-1">
                      <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Início</p>
                      <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm" type="date" />
                    </label>
                    <label className="flex flex-col flex-1">
                      <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Fim</p>
                      <input className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm" type="date" />
                    </label>
                  </div>

                  {/* Banner Upload */}
                  <div className="flex flex-col w-full">
                    <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Banner da Campanha</p>
                    <div className="relative group cursor-pointer border-2 border-dashed border-[#326748] md:border-slate-300 md:dark:border-white/10 rounded-3xl bg-[#193324]/30 md:bg-slate-50 md:dark:bg-black/20 flex flex-col items-center justify-center p-8 transition-all hover:bg-[#193324]/50 md:hover:bg-slate-100 md:dark:hover:bg-black/30 hover:border-primary/50 shadow-inner">
                      <MaterialIcon name="cloud_upload" className="text-primary text-4xl mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-[#92c9a9] md:text-slate-400 uppercase tracking-widest text-center">Selecionar Imagem</p>
                    </div>
                  </div>

                  {/* Participating Pharmacies */}
                  <div className="flex flex-col w-full">
                    <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Farmácias Participantes</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm">
                        Todas as Farmácias
                        <MaterialIcon name="close" className="text-[14px] cursor-pointer hover:rotate-90 transition-transform" />
                      </span>
                      <button className="flex items-center gap-1 px-4 py-2 border border-[#326748] md:border-slate-300 md:dark:border-white/10 rounded-full text-[#92c9a9] md:text-slate-500 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-colors italic">
                        <MaterialIcon name="add" className="text-[14px]" />
                        Adicionar Grupo
                      </button>
                    </div>
                  </div>

                  {/* Create Button */}
                  <button className="w-full bg-primary text-background-dark font-black py-4 rounded-3xl shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 uppercase tracking-tighter text-sm">
                    <MaterialIcon name="rocket_launch" className="hover:rotate-12 transition-transform" />
                    Criar Promoção
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active List Column */}
          <div className="flex-1">
            <div className="h-4 bg-black/20 my-4 shadow-inner md:hidden"></div>

            <div className="px-1 pb-4">
              <div className="flex justify-between items-center mb-6 pt-4 md:pt-0">
                <h2 className="text-white md:text-slate-900 md:dark:text-white text-xl font-black tracking-tighter italic">Promoções Ativas</h2>
                <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest italic border border-primary/20">04 Ativas</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[
                  { title: "Festival de Verão", date: "30 Dez, 2023", reach: "12 Lojas", icon: "sunny" },
                  { title: "Semana Bio-Natural", date: "15 Out, 2023", reach: "Todas as Lojas", icon: "eco" },
                  { title: "Check-up Preventivo", date: "22 Out, 2023", reach: "5 Lojas SP", icon: "health_and_safety" },
                  { title: "Desconto Progressivo", date: "01 Nov, 2023", reach: "Rede Sul", icon: "percent" }
                ].map((promo, i) => (
                  <div key={i} className="bg-[#193324]/30 md:bg-white md:dark:bg-[#193324] border border-[#326748]/50 md:border-slate-200 md:dark:border-white/5 rounded-[24px] p-5 flex gap-4 items-center shadow-md group hover:bg-[#193324]/50 md:hover:shadow-lg transition-all">
                    <div className="size-20 rounded-2xl overflow-hidden shrink-0 border border-[#326748] md:border-slate-100 md:dark:border-white/10 flex items-center justify-center bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800">
                      <MaterialIcon name={promo.icon} className="text-3xl text-primary/40 md:text-primary md:opacity-80 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white md:text-slate-900 md:dark:text-white font-black text-base truncate italic">{promo.title}</h4>
                      <p className="text-[#92c9a9] md:text-slate-500 md:dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Válido até {promo.date}</p>
                      <div className="flex gap-2 mt-3">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-black/30 md:bg-slate-100 md:dark:bg-black/30 text-[#92c9a9] px-3 py-1 rounded-full border border-[#326748] md:border-transparent italic">{promo.reach}</span>
                      </div>
                    </div>
                    <button className="bg-red-500/10 text-red-500 size-12 rounded-2xl hover:bg-red-500/20 transition-colors active:scale-90 border border-red-500/10 flex items-center justify-center">
                      <MaterialIcon name="block" className="text-xl" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};


const MotoboyManagement = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <AdminLayout activeTab="motoboys" profile={profile}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-5 flex items-center justify-between">
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
            { label: 'Total Motoboys', value: '24', icon: 'moped', color: 'primary' },
            { label: 'Em Entrega', value: '14', icon: 'local_shipping', color: 'blue-500' },
            { label: 'Disponíveis', value: '8', icon: 'check_circle', color: 'green-500' },
            { label: 'Bloqueados', value: '2', icon: 'block', color: 'red-500' }
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

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <label className="relative flex items-center group flex-1">
            <div className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-colors">
              <MaterialIcon name="search" />
            </div>
            <input
              className="w-full h-14 pl-12 pr-4 bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-2xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-bold italic"
              placeholder="Buscar motoboy por nome ou telefone..."
              type="text"
            />
          </label>
          <div className="flex gap-2">
            {['Disponíveis', 'Ocupados', 'Inativos'].map(filter => (
              <button key={filter} className="h-14 px-6 bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* List Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[
            { name: "João Silva", phone: "(11) 98765-4321", pharmacy: "Farmácia Central", status: "Em Rota", color: "blue-500", img: "JS" },
            { name: "Marcos Oliveira", phone: "(11) 91234-5678", pharmacy: "BioSaúde Farma", status: "Disponível", color: "green-500", img: "MO" },
            { name: "André Santos", phone: "(11) 97766-5544", pharmacy: "Droga Popular", status: "Bloqueado", color: "red-500", img: "AS" },
            { name: "Carlos Souza", phone: "(11) 95544-3322", pharmacy: "Drogasil Matriz", status: "Offline", color: "slate-400", img: "CS" },
            { name: "Pedro Rocha", phone: "(11) 94433-2211", pharmacy: "Pague Menos", status: "Disponível", color: "green-500", img: "PR" },
            { name: "Roberto Lima", phone: "(11) 93322-1100", pharmacy: "São Paulo Farma", status: "Em Rota", color: "blue-500", img: "RL" }
          ].map((moto, i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e23] rounded-[32px] border border-slate-200 dark:border-white/5 p-6 shadow-md flex flex-col gap-6 group hover:scale-[1.02] transition-all hover:shadow-xl">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic shadow-inner shrink-0 border border-primary/20">
                  {moto.img}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-lg italic truncate leading-tight">{moto.name}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-bold uppercase tracking-widest mt-1 opacity-70">{moto.phone}</p>
                    </div>
                    <div className={`px-3 py-1 bg-${moto.color}/10 border border-${moto.color}/20 rounded-full`}>
                      <span className={`text-${moto.color} text-[8px] font-black uppercase tracking-widest`}>{moto.status}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-slate-600 dark:text-gray-300">
                    <MaterialIcon name="store" className="text-sm opacity-50" />
                    <span className="text-xs font-bold italic truncate">{moto.pharmacy}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-white/5">
                <button className="flex-1 flex items-center justify-center gap-2 h-11 bg-slate-100 dark:bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <MaterialIcon name="edit" className="text-base" />
                  Editar
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 h-11 bg-slate-100 dark:bg-white/5 hover:bg-orange-500/20 hover:text-orange-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <MaterialIcon name="block" className="text-base" />
                  Bloquear
                </button>
                <button className="h-11 w-11 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all">
                  <MaterialIcon name="delete" className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Registration Modal (Mockup) */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
            onClick={() => setShowAddForm(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1a2e23] rounded-[40px] shadow-2xl overflow-hidden border border-white/10">
            <div className="p-8">
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
                  <input className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="Ex: Roberto Carlos" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Telefone (Login)</span>
                  <input className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" placeholder="(00) 00000-0000" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Vincular a Farmácia</span>
                  <select className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic appearance-none">
                    <option>Selecione uma farmácia...</option>
                    <option>Farmácia Central</option>
                    <option>BioSaúde Farma</option>
                    <option>Droga Popular</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Senha Provisória</span>
                  <input className="h-14 px-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold italic" type="password" placeholder="••••••••" />
                </label>
              </div>

              <button className="w-full mt-8 bg-primary text-background-dark font-black py-5 rounded-3xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter">
                Finalizar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};


const SystemSettings = ({ profile }: { profile: any }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Carregar chave atual
    const loadSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'google_maps_api_key')
        .single();

      if (data?.value) {
        const input = document.getElementById('google_maps_key') as HTMLInputElement;
        if (input) input.value = data.value;
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);

    const mapsKey = (document.getElementById('google_maps_key') as HTMLInputElement)?.value;

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'google_maps_api_key',
        value: mapsKey,
        description: 'Chave da API do Google Maps para Geocodificação Reversa'
      });

    if (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar: Verifique se você tem permissão de administrador.");
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  return (
    <AdminLayout activeTab="settings" profile={profile}>
      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-5 items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Configurações do Sistema</h1>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest ${isSaving ? 'opacity-50' : ''}`}
          >
            <MaterialIcon name={success ? "check_circle" : (isSaving ? "sync" : "save")} className={isSaving ? "animate-spin" : ""} />
            <span>{success ? "Salvo!" : (isSaving ? "Salvando..." : "Salvar Alterações")}</span>
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex justify-between items-center p-4 md:hidden">
        <div className="flex items-center gap-3">
          <MaterialIcon name="settings" className="text-primary" />
          <h1 className="text-lg font-black tracking-tighter italic">Configurações</h1>
        </div>
      </header>

      <main className="pb-32 md:pb-10 p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Identity & Visuals */}
          <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm p-6">
            {/* Section: Platform Identity */}
            <section>
              <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter pb-4 italic border-b border-slate-100 dark:border-white/5 mb-4">Identidade da Plataforma</h3>
              <div className="py-2">
                <label className="flex flex-col w-full">
                  <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Nome da Plataforma</p>
                  <input className="form-input flex w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-[#326748] bg-slate-50 dark:bg-[#193324]/50 h-14 placeholder:text-slate-400 dark:placeholder:text-[#92c9a9]/30 p-4 text-base font-bold italic shadow-sm" placeholder="Ex: SaaS Pro" type="text" defaultValue="Minha Plataforma Admin" />
                </label>
              </div>

              {/* Logo Item */}
              <div className="flex items-center gap-4 bg-transparent min-h-[80px] py-4 justify-between mt-2">
                <div className="flex items-center gap-4">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl size-20 border border-slate-200 dark:border-[#326748] shadow-lg bg-slate-100 dark:bg-black/20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAGXWxz6VEEzakK7wJ9t1c-PIWCcZ8ainqqPjbqdVCSwcOwY1LXw9GM1rOFZS5SrQ3d-jsY5l5WAAcZT2OmLHSOEJ6b7JcffJkrj_GNjWO0zbDhvjEs8-inbIDdo1ZKK3GpIPVqmDUSA2jncMs0XOAmrDb5CR2n_ddCJbB5yWHKECORI0sQQi8ZIh-zeYOml0Oa8IM6T-LZkIvGyRODPloAR_5dq7beJtu0sMLhG8nsiveEbtjoT_uifNzZBZULd6m8g8v8HcBS0Q")' }}>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest">Logo Principal</p>
                    <p className="text-slate-500 dark:text-[#92c9a9] text-[8px] font-black uppercase tracking-widest opacity-60">SVG, PNG (máx. 2MB)</p>
                  </div>
                </div>
                <div className="shrink-0">
                  <button className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-xl h-10 px-4 bg-slate-100 dark:bg-[#234833] text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-primary/20 transition-all shadow-sm border border-slate-200 dark:border-primary/10">
                    <span>Alterar</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Section: Visual Identity */}
            <section className="mt-8">
              <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter pb-4 italic border-b border-slate-100 dark:border-white/5 mb-4">Identidade Visual</h3>
              <div className="flex gap-4 py-2">
                <div className="flex-1">
                  <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Primária</p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#193324] border border-slate-200 dark:border-[#326748] rounded-2xl p-3 shadow-inner">
                    <div className="size-8 rounded-lg bg-primary shadow-sm border border-black/5 dark:border-white/10"></div>
                    <input className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 text-slate-900 dark:text-white font-black italic tracking-tighter" type="text" defaultValue="#13EC6D" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest pb-2 px-1">Secundária</p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#193324] border border-slate-200 dark:border-[#326748] rounded-2xl p-3 shadow-inner">
                    <div className="size-8 rounded-lg bg-[#234833] shadow-sm border border-black/5 dark:border-white/10"></div>
                    <input className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 text-slate-900 dark:text-white font-black italic tracking-tighter" type="text" defaultValue="#234833" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Column 3: External Services */}
          <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm p-6 lg:col-span-2">
            <section>
              <h3 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter pb-4 italic border-b border-slate-100 dark:border-white/5 mb-4">Serviços Externos</h3>
              <div className="py-2">
                <label className="flex flex-col w-full">
                  <div className="flex justify-between items-end pb-2 px-1">
                    <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-black uppercase tracking-widest">Google Maps API Key</p>
                    <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer" className="text-primary text-[8px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                      Obter Chave <MaterialIcon name="open_in_new" className="text-[10px]" />
                    </a>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors">
                      <MaterialIcon name="api" />
                    </div>
                    <input
                      id="google_maps_key"
                      className="form-input flex w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-[#326748] bg-slate-50 dark:bg-[#193324]/50 h-14 pl-12 pr-4 text-sm font-bold shadow-sm transition-all"
                      placeholder="Insira sua chave aqui..."
                      type="password"
                    />
                  </div>
                  <p className="text-slate-400 text-[8px] font-bold mt-2 px-1 italic">
                    * Necessária para converter coordenadas em endereços reais e habilitar mapas avançados.
                  </p>
                </label>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating Action Bar (iOS Style) - Mobile Only */}
      <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-background-dark/80 via-background-dark/40 to-transparent z-50 md:hidden">
        <div className="max-w-md mx-auto">
          <button className="w-full bg-primary text-background-dark font-black text-sm h-14 rounded-2xl shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all uppercase tracking-tighter">
            Salvar Todas as Alterações
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};


const AdminDashboard = ({ profile }: { profile: any }) => {
  return (
    <AdminLayout activeTab="dash" profile={profile}>
      {/* Header - Fixed for Consistency */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center md:hidden">
        <div>
          <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-[10px] text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest">Visão Geral</p>
        </div>
        <div className="flex gap-2">
          <button className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-white">
            <MaterialIcon name="notifications" />
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-5 border-b border-slate-200 dark:border-white/10 justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter italic text-slate-900 dark:text-white">Bem-vindo, {profile?.full_name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-xs text-slate-500 dark:text-[#92c9a9] font-black uppercase tracking-widest mt-1">Aqui está o resumo de hoje.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2 shadow-sm">
            <MaterialIcon name="calendar_today" className="text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white">25 Out 2026</span>
          </div>
          <button className="size-10 rounded-2xl bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm">
            <MaterialIcon name="notifications" />
          </button>
        </div>
      </header>

      <main className="pb-32 md:pb-10 p-5 space-y-6">
        {/* KPI Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Vendas', val: 'R$ 142k', trend: '+12%', color: 'primary', icon: 'payments' },
            { label: 'Novos Usuários', val: '1.2k', trend: '+8%', color: 'blue-500', icon: 'group_add' },
            { label: 'Pedidos Ativos', val: '48', trend: '-2%', color: 'orange-500', icon: 'shopping_cart' },
            { label: 'Farmácias', val: '156', trend: '+5', color: 'purple-500', icon: 'store' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-[#1a2e23] p-5 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-${kpi.color}/10 text-${kpi.color}`}>
                  <MaterialIcon name={kpi.icon} className="text-xl" />
                </div>
                {kpi.trend.includes('+') ? (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full">{kpi.trend}</span>
                ) : (
                  <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full">{kpi.trend}</span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{kpi.label}</p>
              <p className="text-2xl font-black italic text-slate-900 dark:text-white mt-1">{kpi.val}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Chart Area */}
          <div className="flex-1 bg-white dark:bg-[#1a2e23] rounded-[32px] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Crescimento Mensal</h3>
              <button className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">Ver Relatório</button>
            </div>
            {/* Mock Chart Visual */}
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <div key={i} className="w-full bg-slate-100 dark:bg-[#234833] rounded-t-xl group relative overflow-hidden transition-all hover:bg-primary/20" style={{ height: `${h}%` }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/80 h-0 group-hover:h-full transition-all duration-500 ease-out"></div>
                  <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/40 rounded-t-xl transition-all duration-500`} style={{ height: `${h * 0.4}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span>
              <span>Jul</span><span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="w-full lg:w-96 bg-white dark:bg-[#1a2e23] rounded-[32px] p-6 border border-slate-200 dark:border-white/5 shadow-sm flex flex-col">
            <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6">Atividade Recente</h3>
            <div className="flex-1 space-y-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {[
                { user: 'Ricardo A.', action: 'Realizou um pedido', time: '2 min atrás', icon: 'shopping_bag', color: 'primary' },
                { user: 'Farma Bem', action: 'Cadastrou novo produto', time: '15 min atrás', icon: 'inventory_2', color: 'orange-500' },
                { user: 'Sistema', action: 'Backup automático', time: '1h atrás', icon: 'cloud_sync', color: 'blue-500' },
                { user: 'Ana Clara', action: 'Avaliou um pedido', time: '3h atrás', icon: 'star', color: 'yellow-500' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`size-10 rounded-full bg-${item.color}/10 text-${item.color} flex items-center justify-center shrink-0`}>
                    <MaterialIcon name={item.icon} className="text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      <span className="font-black italic">{item.user}</span> {item.action.replace(item.user, '')}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              Ver Todo Histórico
            </button>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

function App() {
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error) setProfile(data);
    setLoading(false);
  };

  // Detect Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.warn("Erro ao obter localização ou permissão negada:", error)
      );
    }
  }, []);

  // Fetch all pharmacies
  useEffect(() => {
    const fetchPharmacies = async () => {
      const { data, error } = await supabase.from('pharmacies').select('*');
      if (error) console.error("Error fetching pharmacies:", error);
      else setAllPharmacies(data || []);
    };
    fetchPharmacies();
  }, []);

  // Process and sort nearby pharmacies (with fallback)
  const sortedPharmacies = useMemo(() => {
    const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };

    return allPharmacies.map(p => {
      let distance = Infinity;
      if (p.latitude && p.longitude) {
        distance = calculateDistance(
          referenceLoc.lat,
          referenceLoc.lng,
          Number(p.latitude),
          Number(p.longitude)
        );
      }
      return { ...p, distance };
    }).sort((a, b) => a.distance - b.distance);
  }, [allPharmacies, userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="font-display">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ClientHome userLocation={userLocation} sortedPharmacies={sortedPharmacies} session={session} />} />
          <Route path="/pharmacies" element={<PharmacyList pharmacies={sortedPharmacies} session={session} />} />
          <Route path="/pharmacy/:id" element={<PharmacyPage />} />
          <Route path="/product/:id" element={<ProductPage session={session} />} />
          <Route path="/privacy" element={<PrivacyData />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/login" element={<Auth view="login" />} />
          <Route path="/signup" element={<Auth view="signup" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Client Routes */}
          <Route path="/cart" element={<ProtectedRoute session={session}><Cart /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute session={session}><UserWallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute session={session}><UserProfile /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute session={session}><Favorites /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute session={session}><Notifications /></ProtectedRoute>} />
          <Route path="/order-tracking" element={<ProtectedRoute session={session}><OrderTracking /></ProtectedRoute>} />
          <Route path="/prescription-upload" element={<ProtectedRoute session={session}><PrescriptionUpload /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute session={session}><PharmacyChat /></ProtectedRoute>} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminRoute session={session} profile={profile}><AdminDashboard profile={profile} /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute session={session} profile={profile}><UserManagement profile={profile} /></AdminRoute>} />
          <Route path="/admin/pharmacies" element={<AdminRoute session={session} profile={profile}><PharmacyManagement profile={profile} /></AdminRoute>} />
          <Route path="/admin/motoboys" element={<AdminRoute session={session} profile={profile}><MotoboyManagement profile={profile} /></AdminRoute>} />
          <Route path="/admin/ads" element={<AdminRoute session={session} profile={profile}><AdManagement profile={profile} /></AdminRoute>} />
          <Route path="/admin/promotions" element={<AdminRoute session={session} profile={profile}><PromotionManagement profile={profile} /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute session={session} profile={profile}><SystemSettings profile={profile} /></AdminRoute>} />

          {/* Protected Merchant Routes (Future Implementation) */}
          <Route path="/merchant" element={<MerchantDashboard />} />
          <Route path="/merchant-orders" element={<MerchantOrderManagement />} />
          <Route path="/merchant/financial" element={<MerchantFinancial />} />
          <Route path="/merchant/add-product" element={<AddProduct />} />
          <Route path="/merchant/inventory" element={<InventoryControl />} />
          <Route path="/merchant/settings" element={<StoreCustomization />} />

          {/* Motoboy Routes */}
          <Route path="/motoboy-login" element={<MotoboyLogin />} />
          <Route path="/motoboy-orders" element={<MotoboyOrders />} />
          <Route path="/motoboy-delivery/:id" element={<MotoboyDeliveryDetail />} />
          <Route path="/motoboy-route-status" element={<MotoboyRouteStatus />} />
          <Route path="/motoboy-delivery-confirm" element={<MotoboyDeliveryConfirm />} />
          <Route path="/motoboy-history" element={<MotoboyHistory />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
