import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useNotifications } from './hooks/useNotifications';
import { initAppContext } from './lib/appContext';
import { calculateDistance } from './lib/geoUtils';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  const [session, setSession] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contextLoaded, setContextLoaded] = useState(false);

  // Ativar notificações push
  useNotifications(session?.user?.id);

  // Initialize App Context (Multi-App Detection)
  useEffect(() => {
    const init = async () => {
      await initAppContext();
      setContextLoaded(true);
    };
    init();
  }, []);

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
        (error) => {
          // Ignore permission denied errors to reduce console noise
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn("Erro ao obter localização:", error.message);
          }
        }
      );
    }
  }, []);

  // Fetch all pharmacies
  useEffect(() => {
    const fetchPharmacies = async () => {
      // Filter for approved pharmacies only
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('status', 'Aprovado');

      if (error) console.error("Error fetching pharmacies:", error);
      else setAllPharmacies(data || []);
    };
    fetchPharmacies();
  }, []);

  // Realtime Order Listener for Client
  useEffect(() => {
    if (!session?.user?.id || profile?.role !== 'cliente') return;

    const playNotificationSound = (status: string) => {
      const sounds: any = {
        default: 'https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3',
        horn: 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3', // Bike horn for em_rota
        success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' // Cash sound for delivered
      };

      let src = sounds.default;
      if (status === 'em_rota') src = sounds.horn;
      if (status === 'entregue') src = sounds.success;

      const audio = new Audio(src);
      audio.play().catch(e => console.warn("Audio play blocked:", e));
    };

    const channel = supabase
      .channel(`client_orders_${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${session.user.id}`
      }, (payload) => {
        if (payload.new.status !== payload.old.status) {
          console.log('📦 Pedido atualizado:', payload.new.status);
          playNotificationSound(payload.new.status);

          // Opcional: Mostrar notificação visual se não estiver na página de tracking
          if (window.Notification?.permission === 'granted') {
            new Notification('Ifarma: Atualização do Pedido', {
              body: `Seu pedido está agora: ${payload.new.status.replace('_', ' ')}`,
              icon: '/pwa-192x192.png'
            });
          }
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.user?.id, profile?.role]);

  // Process and sort nearby pharmacies (with fallback)
  const sortedPharmacies = useMemo(() => {
    const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };
    const now = new Date();
    const isNewThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

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

      // Calculate if pharmacy is new
      const createdDate = new Date(p.created_at);
      const isNew = (now.getTime() - createdDate.getTime()) < isNewThreshold;

      return { ...p, distance, isNew };
    }).sort((a, b) => a.distance - b.distance);
  }, [allPharmacies, userLocation]);

  if (loading || !contextLoaded) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
            Configurando App...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="font-display">
        <AppRoutes
          session={session}
          profile={profile}
          userLocation={userLocation}
          sortedPharmacies={sortedPharmacies}
        />
      </div>
    </Router>
  );
}

export default App;
