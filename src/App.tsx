import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider as RollbarProvider, ErrorBoundary as RollbarErrorBoundary } from '@rollbar/react';
import { supabase } from './lib/supabase';
import { useNotifications } from './hooks/useNotifications';
import { initAppContext } from './lib/appContext';
import { calculateDistance } from './lib/geoUtils';
import { AppRoutes } from './routes/AppRoutes';
import { rollbarConfig } from './lib/rollbar';
import { RollbarTestPanel } from './components/RollbarTestPanel';

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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Failsafe: Create profile if trigger didn't catch it
        console.warn("Perfil não encontrado, tentando criar...");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: 'customer'
            })
            .select()
            .single();

          if (!insertError) setProfile(newProfile);
          else console.error("Erro ao criar perfil fallback:", insertError);
        }
      }
    } catch (err) {
      console.error("Erro fatal no fetchProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Detect Geolocation
  useEffect(() => {
    const initLocation = async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 5000
        });

        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        console.log("📍 Localização inicial obtida:", pos.coords.latitude, pos.coords.longitude);
      } catch (error: any) {
        // Silently fail for initial location to avoid annoying alerts
        console.warn("⚠️ Não foi possível obter localização inicial:", error.message);
      }
    };
    initLocation();
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
    if (!session?.user?.id || profile?.role !== 'customer') return;

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

  // Global Chat/Notifications Listener
  useEffect(() => {
    if (!session?.user?.id) return;

    const globalChannel = supabase
      .channel(`global_messages_${session.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages'
      }, (payload) => {
        const newMsg = payload.new;
        // Ignore my own messages
        if (newMsg.sender_id === session.user.id) return;

        // Play Sound
        console.log("💬 Nova mensagem de chat global!");
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3');
        audio.volume = 0.8;
        audio.play().catch(e => console.warn("Audio play blocked:", e));

        // System Notification
        if (window.Notification?.permission === 'granted' && document.hidden) {
          new Notification('Nova mensagem', {
            body: newMsg.content || 'Novo anexo recebido.',
            icon: '/pwa-192x192.png'
          });
        }
      })
      .subscribe();

    return () => {
      globalChannel.unsubscribe();
    }
  }, [session?.user?.id]);

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
    <RollbarProvider config={rollbarConfig}>
      <RollbarErrorBoundary>
        <Router>
          <div className="font-display">
            <AppRoutes
              session={session}
              profile={profile}
              userLocation={userLocation}
              sortedPharmacies={sortedPharmacies}
              refreshProfile={() => session && fetchProfile(session.user.id)}
            />
          </div>

          {/* Painel de teste Rollbar - apenas em desenvolvimento */}
          {/* {import.meta.env.DEV && <RollbarTestPanel />} */}
        </Router>
      </RollbarErrorBoundary>
    </RollbarProvider>
  );
}

export default App;
