import { useState } from 'react';
import rollbar from '../lib/rollbar';
import { rollbarConfig } from '../lib/rollbar';

/**
 * Componente de teste para verificar a integração do Rollbar
 * REMOVER EM PRODUÇÃO - apenas para testes em desenvolvimento
 */
export const RollbarTestPanel = () => {
    const [lastTest, setLastTest] = useState('');

    const testInfo = () => {
        rollbar.info('Teste de INFO do Rollbar', {
            timestamp: new Date().toISOString(),
            userAction: 'test_button_click'
        });
        setLastTest('INFO enviado');
    };

    const testWarning = () => {
        rollbar.warning('Teste de WARNING do Rollbar', {
            timestamp: new Date().toISOString(),
            severity: 'medium'
        });
        setLastTest('WARNING enviado');
    };

    const testError = () => {
        rollbar.error(new Error('Teste de ERRO do Rollbar'), {
            timestamp: new Date().toISOString(),
            severity: 'high'
        });
        setLastTest('ERROR enviado');
    };

    const testComponentError = () => {
        // Força um erro de componente React
        throw new Error('Erro de teste do ErrorBoundary!');
    };

    return (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-purple-500 max-w-sm z-50">
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-purple-600">bug_report</span>
                <h3 className="font-bold text-sm">Rollbar Test Panel</h3>
            </div>

            <div className="text-xs text-gray-600 mb-3">
                <p>Ambiente: <strong>{import.meta.env.MODE}</strong></p>
                <p>Rollbar ativo: <strong>{rollbarConfig.enabled ? 'SIM ✅' : 'NÃO (apenas logs)'}</strong></p>
                {lastTest && <p className="text-green-600 mt-1">✓ {lastTest}</p>}
            </div>

            <div className="space-y-2">
                <button
                    onClick={testInfo}
                    className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                >
                    Testar INFO
                </button>
                <button
                    onClick={testWarning}
                    className="w-full py-1.5 px-3 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded transition-colors"
                >
                    Testar WARNING
                </button>
                <button
                    onClick={testError}
                    className="w-full py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors"
                >
                    Testar ERROR
                </button>
                <button
                    onClick={testComponentError}
                    className="w-full py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                >
                    Testar Component Error
                </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 italic">
                * Remover este componente em produção
            </p>
        </div>
    );
};
