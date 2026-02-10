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

      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.requestPermissions();
      } catch (e) {
        console.warn("LocalNotifications init error:", e);
      }
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

  // 🔥 Session Watchdog: Verifica validade real do token
  useEffect(() => {
    const checkSession = async () => {
      if (!session) return;
      // Tenta validar o token batendo no Auth
      const { error } = await supabase.auth.getUser();
      if (error && (error.status === 401 || error.message?.includes('Invalid JWT') || error.message?.includes('token is expired'))) {
        console.warn("🚨 Watchdog: Sessão expirada ou inválida. Forçando logout...");
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        window.location.href = '/login';
      }
    };

    const interval = setInterval(checkSession, 60 * 1000); // Checa a cada 1 min
    const onFocus = () => checkSession(); // Checa ao focar na aba
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [session]);

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
        .eq('status', 'approved');

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
        console.log("💬 Nova mensagem recebida:", newMsg.message_type);

        // Specialized Horn Sound for "BI-BI"
        const hornSound = 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3';
        const defaultChatSound = 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3';

        const soundToPlay = newMsg.message_type === 'horn' ? hornSound : defaultChatSound;

        const audio = new Audio(soundToPlay);
        audio.volume = 0.8;
        audio.play().catch(e => {
          console.warn("Audio play blocked by browser. User must interact first.", e);
          // Fallback: try to play again on next click
          window.addEventListener('click', () => audio.play(), { once: true });
        });

        // Local Notification (Capacitor)
        const showLocalNotification = async () => {
          try {
            // Dynamic import to avoid SSR issues
            const { LocalNotifications } = await import('@capacitor/local-notifications');

            await LocalNotifications.schedule({
              notifications: [
                {
                  title: newMsg.message_type === 'horn' ? '📢 MOTOBOY CHEGOU!' : 'Ifarma: Nova mensagem',
                  body: newMsg.content || 'Novo anexo recebido.',
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: newMsg.message_type === 'horn' ? 'horn.wav' : undefined,
                  actionTypeId: '',
                  extra: null
                }
              ]
            });
          } catch (e) {
            console.error("Local Notification Error:", e);
            // Fallback to Web Notification
            if (window.Notification?.permission === 'granted' && document.hidden) {
              new Notification(newMsg.message_type === 'horn' ? '📢 MOTOBOY CHEGOU!' : 'Ifarma: Nova mensagem', {
                body: newMsg.content || 'Novo anexo recebido.',
                icon: '/pwa-192x192.png'
              });
            }
          }
        };
        showLocalNotification();

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
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

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

      // Calculate isOpen status for Sorting
      let isOpen = false;
      if (p.is_open) {
        isOpen = true; // Manual override (Always Open)
      } else if (p.auto_open_status && Array.isArray(p.opening_hours) && p.opening_hours.length > 0) {
        // Automatic Schedule Logic
        const todayRule = p.opening_hours.find((h: any) => h.day === currentDay);
        if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
          const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
          const [hClose, mClose] = todayRule.close.split(':').map(Number);
          const openTimeVal = hOpen * 60 + mOpen;
          const closeTimeVal = hClose * 60 + mClose;

          if (currentTime >= openTimeVal && currentTime < closeTimeVal) {
            isOpen = true;
          }
        }
      }

      // Feature Flag
      const is_featured = p.is_featured || p.plan === 'Premium' || p.plan === 'Pro' || p.plan === 'Destaque';

      // 🧠 ALGORITMO DE RANQUEAMENTO INTELIGENTE (iFood Style)
      // ======================================================

      // 1. Proximidade (Peso Alto - 35%)
      const distKm = distance / 1000;
      const scoreProx = Math.max(0, 100 - (distKm * 6)); // ~16km zera pontos

      // 2. Tempo de Entrega (Peso Médio - 25%)
      const minTime = Number(p.delivery_time_min) || 30;
      const maxTime = Number(p.delivery_time_max) || 60;
      const avgTime = (minTime + maxTime) / 2;
      const scoreTime = Math.max(0, 100 - (avgTime * 1.5));

      // 3. Performance Operacional / SLA (Peso 20%)
      const scoreSla = p.sla_score !== undefined ? Number(p.sla_score) : 100;

      // 4. Avaliação (Peso 15%)
      const scoreRating = (Number(p.rating) || 5) * 20;

      // 5. Promoção/Planos (Peso 5%)
      const scorePromo = is_featured ? 100 : 0;

      // CÁLCULO FINAL
      let finalScore =
        (scoreProx * 0.35) +
        (scoreTime * 0.25) +
        (scoreSla * 0.20) +
        (scoreRating * 0.15) +
        (scorePromo * 0.05);

      // BOOSTS (Fura-Fila)
      if (p.is_sponsored) finalScore += 500; // Ads Pagos
      if (isOpen) finalScore += 2000; // Abertos têm prioridade total
      else finalScore -= 2000; // Fechados vão para o fundo

      if (isNew) finalScore += 50; // Boost novidade

      return { ...p, distance, isNew, isOpen, is_featured, score: finalScore };
    }).sort((a, b) => b.score - a.score); // Ordena pelo Score decrescente
  }, [allPharmacies, userLocation]);

  if (loading || !contextLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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
          refreshProfile={() => session && fetchProfile(session.user.id)}
        />
      </div>
    </Router>
  );
}

export default App;
