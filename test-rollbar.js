/**
 * Script de teste para validar a configuração do Rollbar
 * Execute com: node test-rollbar.js
 */

import Rollbar from 'rollbar';

// Usar o mesmo token configurado no Android
const rollbar = new Rollbar({
    accessToken: 'd6ff4f7e4fa84bec931a46dbf571c010',
    environment: 'test',
    captureUncaught: false,
    captureUnhandledRejections: false,
});

console.log('🧪 Testando Rollbar...\n');

// Teste 1: INFO
console.log('1️⃣ Enviando evento INFO...');
rollbar.info('✅ Teste de INFO do Rollbar - Script Node.js', {
    timestamp: new Date().toISOString(),
    platform: 'Node.js',
    test: true,
});

// Teste 2: WARNING
setTimeout(() => {
    console.log('2️⃣ Enviando evento WARNING...');
    rollbar.warning('⚠️ Teste de WARNING do Rollbar', {
        timestamp: new Date().toISOString(),
        severity: 'medium',
    });
}, 1000);

// Teste 3: ERROR
setTimeout(() => {
    console.log('3️⃣ Enviando evento ERROR...');
    rollbar.error(new Error('❌ Teste de ERRO do Rollbar'), {
        timestamp: new Date().toISOString(),
        testError: true,
    });
}, 2000);

// Finalizar
setTimeout(() => {
    console.log('\n✅ Testes enviados!');
    console.log('🔍 Verifique o dashboard do Rollbar em alguns segundos.');
    console.log('🌐 https://rollbar.com/');
    process.exit(0);
}, 3500);
