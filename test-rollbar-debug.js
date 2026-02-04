/**
 * Script de teste VERBOSE para debugar Rollbar
 * Execute com: node test-rollbar-debug.js
 */

import Rollbar from 'rollbar';

const TOKEN = 'd6ff4f7e4fa84bec931a46dbf571c010';

console.log('=== TESTE ROLLBAR COM DEBUG ===\n');
console.log('Token:', TOKEN);
console.log('Environment: test\n');

const rollbar = new Rollbar({
    accessToken: TOKEN,
    environment: 'test',
    captureUncaught: false,
    captureUnhandledRejections: false,
    verbose: true, // Ativar logs detalhados
});

console.log('✅ Rollbar inicializado\n');

// Teste com callback para verificar resposta
console.log('📤 Enviando teste...\n');

rollbar.info('🧪 Teste Rollbar - ' + new Date().toISOString(),
    {
        testId: Math.random().toString(36),
        platform: 'Node.js',
        timestamp: Date.now()
    },
    (err, response) => {
        if (err) {
            console.error('❌ ERRO ao enviar:', err);
            console.error('Detalhes:', JSON.stringify(err, null, 2));
        } else {
            console.log('✅ Resposta do Rollbar:', response);
            console.log('\n🎉 Evento enviado com sucesso!');
            console.log('UUID:', response?.result?.uuid);
        }

        setTimeout(() => {
            console.log('\n🔍 Verifique o dashboard: https://rollbar.com/');
            process.exit(err ? 1 : 0);
        }, 1000);
    }
);
