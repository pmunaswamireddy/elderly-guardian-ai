import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                        <h1 className="text-2xl font-black text-red-600 mb-4">Something went wrong</h1>
                        <p className="text-slate-600 mb-4">The application crashed with the following error:</p>
                        <pre className="bg-slate-900 text-red-400 p-4 rounded-xl overflow-auto text-xs font-mono mb-6">
                            {this.state.error?.message}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
