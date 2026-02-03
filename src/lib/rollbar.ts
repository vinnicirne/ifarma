import Rollbar, { type Configuration } from 'rollbar';

// Configuração do Rollbar para React
export const rollbarConfig: Configuration = {
    accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN || '84893746147940e8bb3ee1bbcce4eb14',
    environment: import.meta.env.VITE_ROLLBAR_ENVIRONMENT || import.meta.env.MODE || 'production',
    enabled: import.meta.env.PROD, // Apenas ativo em produção
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
        client: {
            javascript: {
                code_version: '1.0.0',
                source_map_enabled: true,
            }
        }
    },
    // Filtrar dados sensíveis
    scrubFields: ['password', 'access_token', 'secret', 'api_key', 'token'],
    // Ignorar certos erros comuns
    checkIgnore: (isUncaught, args) => {
        const firstArg = args[0];
        const message = (firstArg && typeof firstArg === 'object' && 'message' in firstArg)
            ? (firstArg as Error).message
            : String(firstArg || '');
        const ignoredMessages = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Request aborted'
        ];
        return ignoredMessages.some(ignored => message.includes(ignored));
    }
};

// Helper para configurar usuário no Rollbar
export const configureRollbarUser = (userId: string, email?: string, username?: string) => {
    // Será configurado via Provider no App.tsx
    return {
        id: userId,
        email,
        username
    };
};

// Criar e exportar instância do Rollbar
const rollbar = new Rollbar(rollbarConfig);

export default rollbar;
