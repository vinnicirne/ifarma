import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validar configuração
const isFirebaseConfigValid = Object.values(firebaseConfig).every(value => value !== undefined && value !== '');

let app: any = null;
let messaging: any = null;
let messagingInitialized = false;

// Inicializar Firebase App
if (isFirebaseConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        console.log('Firebase App inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar Firebase App:', error);
    }
} else {
    console.warn('Configuração do Firebase incompleta. Notificações push desabilitadas.');
    console.log('Variáveis disponíveis:', {
        apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
        vapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
}

/**
 * Inicializa Firebase Messaging de forma assíncrona
 */
const initializeMessaging = async () => {
    if (!app) {
        console.warn('Firebase App não está disponível');
        return null;
    }

    try {
        const supported = await isSupported();
        if (supported) {
            messaging = getMessaging(app);
            messagingInitialized = true;
            console.log('Firebase Messaging inicializado com sucesso');
            return messaging;
        } else {
            console.warn('Firebase Messaging não é suportado neste navegador');
            return null;
        }
    } catch (error) {
        console.error('Erro ao inicializar Firebase Messaging:', error);
        return null;
    }
};

/**
 * Solicita permissão de notificação e retorna o token FCM
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
    try {
        // Garantir que messaging está inicializado
        if (!messagingInitialized) {
            await initializeMessaging();
        }

        if (!messaging) {
            console.warn('Firebase Messaging não está disponível ou não é suportado');
            return null;
        }

        // Verificar se estamos no navegador e temos a API de Notificação
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('Este ambiente não suporta notificações');
            return null;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

            if (!vapidKey) {
                console.error('ERRO CRÍTICO: VAPID Key não encontrada no arquivo .env (VITE_FIREBASE_VAPID_KEY)');
                console.log('Variáveis de ambiente Firebase:', {
                    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                    appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
                    vapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY,
                });
                return null;
            }

            // Log parcial da VAPID para depuração (não exibe a chave inteira)
            console.log('VAPID key carregada (primeiros/últimos chars):', vapidKey.slice(0, 12) + '...' + vapidKey.slice(-12));

            let token: string | null = null;
            let lastError: any = null;

            // Retry up to 2 vezes com delay (para casos de rede/instabilidade)
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`Obtendo token FCM (tentativa ${attempt}/2)...`);
                    token = await getToken(messaging, { vapidKey });
                    if (token) {
                        console.log('✅ Token FCM obtido com sucesso:', token);
                        break;
                    } else {
                        console.warn('⚠️ Token FCM retornado vazio (tentativa ' + attempt + ')');
                    }
                } catch (err: any) {
                    lastError = err;
                    console.error(`❌ Erro ao obter token FCM (tentativa ${attempt}):`, err);

                    // Se for 401, não adianta retry (problema de config VAPID/Firebase)
                    if (err?.code === 'messaging/token-subscribe-failed' || (err?.message && err.message.includes('401'))) {
                        console.error('DICA: Erro 401 indica VAPID key inválida ou projeto Firebase não configurado para Web Push.');
                        console.error('Ação: Gere/regenere a VAPID key no Firebase Console > Cloud Messaging > Web Push certificates e atualize o .env');
                        break; // Não tenta de novo
                    }

                    // Se não for a última tentativa, espera antes de retry
                    if (attempt < 2) {
                        await new Promise(res => setTimeout(res, 1500));
                    }
                }
            }

            return token;
        } else {
            console.warn('Permissão de notificação negada pelo usuário:', permission);
            // Opcional: mostrar alerta amigável ou toast
            return null;
        }
    } catch (error: any) {
        console.error('❌ ERRO FCM (fora do fluxo normal):', error);

        if (error?.code === 'messaging/permission-blocked') {
            console.error('DICA: O usuário bloqueou as notificações no navegador.');
        } else if (error?.code === 'messaging/token-subscribe-failed') {
            console.error('DICA: Falha geral ao se inscrever. Verifique VAPID key e configuração do projeto Firebase.');
        }

        return null;
    }
};

/**
 * Escuta mensagens em foreground
 */
export const onMessageListener = async () => {
    // Garantir que messaging está inicializado
    if (!messagingInitialized) {
        await initializeMessaging();
    }

    if (!messaging) {
        throw new Error('Firebase Messaging não está disponível');
    }

    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Mensagem recebida em foreground:', payload);
            resolve(payload);
        });
    });
};

// Inicializar messaging automaticamente
if (typeof window !== 'undefined') {
    initializeMessaging();
}

export { messaging };
