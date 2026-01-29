// Service Worker para Firebase Cloud Messaging
// Este arquivo deve estar na pasta public/

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// IMPORTANTE: Substitua com suas credenciais do Firebase
firebase.initializeApp({
    apiKey: "AIzaSyCwEixtnqQSl_rWDn8Zocy1bvBY9_Wpu6s",
    authDomain: "ifarma-89896.firebaseapp.com",
    projectId: "ifarma-89896",
    storageBucket: "ifarma-89896.firebasestorage.app",
    messagingSenderId: "377871429826",
    appId: "1:377871429826:web:32e2d2724c9bc29781cb5b"
});

const messaging = firebase.messaging();

// Lidar com mensagens em background
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);

    const notificationTitle = payload.notification?.title || 'Nova Notificação';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon.png',
        badge: '/badge.png',
        tag: payload.data?.orderId || 'notification',
        data: payload.data,
        requireInteraction: false
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lidar com clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notificação clicada:', event);

    event.notification.close();

    // Abrir URL se fornecida
    if (event.notification.data?.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
