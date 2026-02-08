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
                return null;
            }

            console.log('Obtendo token FCM para Web com VAPID Key...');
            const token = await getToken(messaging, { vapidKey });

            if (token) {
                console.log('✅ Token FCM obtido com sucesso:', token);
            } else {
                console.warn('⚠️ Token FCM retornado vazio');
            }
            return token;
        } else {
            console.warn('Permissão de notificação negada pelo usuário');
            return null;
        }
    } catch (error: any) {
        console.error('❌ ERRO FCM:', error);

        if (error?.code === 'messaging/token-subscribe-failed') {
            console.error('DICA: Isso geralmente indica que a VAPID Key está incorreta ou o projeto Firebase não está configurado para Web Push.');
        } else if (error?.code === 'messaging/permission-blocked') {
            console.error('DICA: O usuário bloqueou as notificações.');
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
