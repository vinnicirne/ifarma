import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

let internalAppId: string = 'web';
let internalAppName: string = 'Ifarma';

/**
 * Inicializa o contexto do app buscando o ID nativo
 * Deve ser chamado na inicialização do App.tsx
 */
export const initAppContext = async () => {
    if (!Capacitor.isNativePlatform()) {
        internalAppId = 'web';
        return;
    }

    try {
        const info = await App.getInfo();
        internalAppId = info.id;
        internalAppName = info.name;
        console.log('App Context Inicializado:', { id: internalAppId, name: internalAppName });
    } catch (e) {
        console.error('Erro ao buscar App Info:', e);
        internalAppId = 'web';
    }
};

/**
 * Detecta qual variante do app está rodando
 * @returns 'cliente' | 'motoboy' | 'farmacia' | 'web'
 */
export const getAppContext = (): 'cliente' | 'motoboy' | 'farmacia' | 'web' => {
    // 1. Check by ID (Primary)
    if (internalAppId === 'com.ifarma.motoboy') return 'motoboy';
    if (internalAppId === 'com.ifarma.farmacia') return 'farmacia';
    if (internalAppId === 'com.ifarma.cliente') return 'cliente';

    // 2. Check by Name (Fallback)
    if (internalAppName === 'Entregador Ifarma') return 'motoboy';
    if (internalAppName === 'Gestor Ifarma') return 'farmacia';
    if (internalAppName === 'Ifarma' && internalAppId !== 'com.ifarma.app') return 'cliente'; // If strict ID match fails but name is generic

    // 3. Fallback based on web/default
    return 'web';
};

/**
 * Retorna a rota inicial baseada no contexto do app
 */
export const getInitialRoute = (): string => {
    const context = getAppContext();

    switch (context) {
        case 'cliente':
            return '/'; // Catálogo de produtos
        case 'motoboy':
            return '/motoboy-login';
        case 'farmacia':
            return '/gestor/login';
        default:
            return '/'; // Web padrão
    }
};

/**
 * Verifica se o usuário tem permissão para acessar a rota atual
 */
export const canAccessRoute = (route: string, userRole?: string): boolean => {
    const context = getAppContext();

    // No app cliente, bloqueia rotas de motoboy e farmácia
    if (context === 'cliente') {
        if (route.startsWith('/motoboy') || route.startsWith('/merchant') || route.startsWith('/dashboard')) {
            return false;
        }
    }

    // No app motoboy, só permite rotas de motoboy
    if (context === 'motoboy') {
        if (!route.startsWith('/motoboy')) {
            return false;
        }
    }

    // No app farmácia, só permite rotas de merchant
    if (context === 'farmacia') {
        if (!route.startsWith('/merchant')) {
            return false;
        }
    }

    return true;
};

/**
 * Retorna o nome do app baseado no contexto
 */
export const getAppName = (): string => {
    const context = getAppContext();

    switch (context) {
        case 'cliente': return 'Ifarma';
        case 'motoboy': return 'Entregador Ifarma';
        case 'farmacia': return 'Gestor Ifarma';
        default: return 'Ifarma';
    }
};
