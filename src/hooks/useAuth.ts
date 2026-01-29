import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Buscar sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Escutar mudanças de autenticação
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        console.log('👤 Buscando perfil para userId:', userId);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar perfil:', error);
                console.error('Detalhes do erro:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
            } else {
                console.log('✅ Perfil encontrado:', data);
                setProfile(data);
            }
        } catch (err) {
            console.error('❌ Erro inesperado ao buscar perfil:', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return { session, profile, loading, signOut };
};
