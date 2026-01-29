import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DiagnosticPage() {
    const [diagnostics, setDiagnostics] = useState<any>({});

    useEffect(() => {
        const runDiagnostics = async () => {
            const results: any = {
                env: {
                    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
                    supabaseKeyExists: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
                    supabaseKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0,
                    firebaseApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
                    googleMapsKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                },
                supabase: {
                    clientExists: !!supabase,
                    clientUrl: (supabase as any)?.supabaseUrl || 'N/A',
                },
                connection: {
                    status: 'testing...',
                    error: null
                }
            };

            // Testar conexão
            try {
                const { data, error } = await supabase.from('profiles').select('count').limit(1);
                results.connection.status = error ? 'failed' : 'success';
                results.connection.error = error?.message || null;
                results.connection.data = data;
            } catch (err: any) {
                results.connection.status = 'failed';
                results.connection.error = err.message;
            }

            setDiagnostics(results);
        };

        runDiagnostics();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">🔍 Diagnóstico do Sistema</h1>

            <div className="space-y-6">
                {/* Environment Variables */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">📋 Variáveis de Ambiente</h2>
                    <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(diagnostics.env, null, 2)}
                    </pre>
                </div>

                {/* Supabase Client */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">🔌 Supabase Client</h2>
                    <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(diagnostics.supabase, null, 2)}
                    </pre>
                </div>

                {/* Connection Test */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">🌐 Teste de Conexão</h2>
                    <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(diagnostics.connection, null, 2)}
                    </pre>
                    {diagnostics.connection?.status === 'success' && (
                        <div className="mt-4 p-4 bg-green-900/50 border border-green-500 rounded">
                            ✅ Conexão com Supabase funcionando!
                        </div>
                    )}
                    {diagnostics.connection?.status === 'failed' && (
                        <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded">
                            ❌ Erro na conexão: {diagnostics.connection?.error}
                        </div>
                    )}
                </div>

                {/* All Environment Variables */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">🔑 Todas as Variáveis VITE_*</h2>
                    <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(import.meta.env, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}
