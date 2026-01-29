import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

let internalAppId: string = 'web';

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
        console.log('App Context Inicializado:', internalAppId);
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
    // Mapeia App ID para contexto
    switch (internalAppId) {
        case 'com.ifarma.cliente':
            return 'cliente';
        case 'com.ifarma.motoboy':
            return 'motoboy';
        case 'com.ifarma.farmacia':
            return 'farmacia';
        default:
            return 'web';
    }
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
            return '/merchant/login';
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
