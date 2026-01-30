import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
                    <div className="max-w-xl w-full bg-white p-6 rounded-2xl shadow-xl border border-red-100">
                        <h1 className="text-xl font-black text-red-600 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            Erro de Renderização
                        </h1>
                        <p className="text-sm text-slate-600 mb-4">
                            Ocorreu um erro ao carregar este componente ({this.props.name}).
                        </p>
                        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl overflow-x-auto text-xs font-mono">
                            {this.state.error?.toString()}
                            {this.state.error?.stack && (
                                <div className="mt-2 opacity-50 border-t border-white/10 pt-2">
                                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
