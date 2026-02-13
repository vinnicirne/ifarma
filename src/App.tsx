import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useNotifications } from './hooks/useNotifications';
import { initAppContext } from './lib/appContext';
import { calculateDistance } from './lib/geoUtils';
import { Capacitor } from '@capacitor/core';
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
      const { error } = await supabase.auth.getUser();
      if (error && (error.status === 401 || error.message?.includes('Invalid JWT') || error.message?.includes('token is expired'))) {
        console.warn("🚨 Watchdog: Sessão expirada ou inválida. Forçando logout...");
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        window.location.href = '/login';
      }
    };

    const interval = setInterval(checkSession, 5 * 60 * 1000); // Optimized: Check every 5 min instead of 1 min
    const onFocus = () => checkSession();
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

  // Detect Geolocation (DEFERRED - Priority 3)
  useEffect(() => {
    // Defer geolocation to avoid blocking initial render
    const timer = setTimeout(async () => {
      console.log("🎯 App: Iniciando Geolocation...");
      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        // Request permissions explicitly first if native
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          console.log("📌 App: Permissão de Localização:", perm.location);
          if (perm.location !== 'granted') {
            console.warn("🚫 App: Permissão de localização negada pelo usuário.");
            return;
          }
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        console.log("📍 App: Localização obtida com sucesso:", pos.coords.latitude, pos.coords.longitude);
      } catch (error: any) {
        console.error("❌ App: Falha crítica ao obter localização:", error.message, error);
      }
    }, 500); // Defer 500ms to prioritize auth/profile

    return () => clearTimeout(timer);
  }, []);

  // Fetch all pharmacies (DEFERRED - Priority 3)
  useEffect(() => {
    // Defer pharmacy fetch to avoid blocking initial render
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('status', 'Aprovado');

      if (error) console.error("Error fetching pharmacies:", error);
      else setAllPharmacies(data || []);
    }, 500); // Defer 500ms to prioritize auth/profile

    return () => clearTimeout(timer);
  }, []);

  // Realtime Order Listener for Client (DEFERRED - Priority 4)
  useEffect(() => {
    if (!session?.user?.id || profile?.role !== 'customer') return;

    // Defer subscription to avoid blocking initial render
    const timer = setTimeout(() => {
      const playNotificationSound = (status: string) => {
        const sounds: any = {
          default: 'https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3',
          horn: 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3',
          success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'
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
    }, 1000); // Defer 1s to prioritize critical operations

    return () => clearTimeout(timer);
  }, [session?.user?.id, profile?.role]);

  // Global Chat/Notifications Listener (DEFERRED - Priority 4)
  useEffect(() => {
    if (!session?.user?.id) return;

    // Defer subscription to avoid blocking initial render
    const timer = setTimeout(() => {
      const globalChannel = supabase
        .channel(`global_messages_${session.user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages'
        }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === session.user.id) return;

          console.log("💬 Nova mensagem recebida:", newMsg.message_type);

          const hornSound = 'https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3';
          const defaultChatSound = 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3';
          const soundToPlay = newMsg.message_type === 'horn' ? hornSound : defaultChatSound;

          const audio = new Audio(soundToPlay);
          audio.volume = 0.8;
          audio.play().catch(e => {
            console.warn("Audio play blocked by browser. User must interact first.", e);
            window.addEventListener('click', () => audio.play(), { once: true });
          });

          const showLocalNotification = async () => {
            try {
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
      };
    }, 1000); // Defer 1s to prioritize critical operations

    return () => clearTimeout(timer);
  }, [session?.user?.id]);

  // Process and sort nearby pharmacies (with fallback)
  // Using useDeferredValue to avoid blocking UI updates
  const deferredPharmacies = useDeferredValue(allPharmacies);
  const deferredUserLocation = useDeferredValue(userLocation);

  const sortedPharmacies = useMemo(() => {
    const referenceLoc = deferredUserLocation || { lat: -22.8269, lng: -43.0539 };
    const now = new Date();
    const isNewThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return deferredPharmacies.map(p => {
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

      // Feature Flag - is_featured do banco OU planos pagos aparecem como Destaque
      const plan = p.plan?.toLowerCase();
      const is_featured = p.is_featured === true || ['premium', 'pro', 'destaque'].includes(plan);

      // console.log(`App.tsx: ${p.name} - is_featured=${is_featured} (DB=${p.is_featured}, Plan=${plan})`);

      // 🧠 ALGORITMO DE RANQUEAMENTO INTELIGENTE (iFood Style)
      // ======================================================

      // 1. Proximidade (Peso Alto - 35%)
      const distKm = (distance || 0) / 1000;
      const scoreProx = Math.max(0, 100 - (distKm * 6));

      // 2. Tempo de Entrega (Peso Médio - 25%)
      const avgTime = (Number(p.delivery_time_min || 30) + Number(p.delivery_time_max || 60)) / 2;
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

      // BOOSTS E RANDOMIZAÇÃO (Fair Rotation)
      // =====================================
      if (is_featured) {
        // 1. Boost massivo para garantir que fiquem no topo (Tier 1)
        finalScore += 10000;

        // 2. Jitter Aleatório: Adiciona entre 0 e 2000 pontos extras
        // Isso garante que a ordem entre os anunciantes mude a cada refresh
        finalScore += Math.random() * 2000;
      }

      if (p.is_sponsored) finalScore += 5000; // Ads específicos (Banner de busca, etc)

      if (isOpen) {
        finalScore += 5000; // Lojas abertas sempre acima das fechadas no mesmo tier
      } else {
        finalScore -= 100;
      }

      if (isNew) finalScore += 50;

      return { ...p, distance, isNew, isOpen, is_featured, score: finalScore };
    }).sort((a, b) => b.score - a.score);
  }, [allPharmacies, userLocation]);

  useEffect(() => {
    if (allPharmacies.length > 0) {
      console.log(`✅ Lojas carregadas: ${allPharmacies.length} | Ordenadas: ${sortedPharmacies.length}`);
    }
  }, [allPharmacies, sortedPharmacies]);

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
