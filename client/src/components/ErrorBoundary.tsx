import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent full app crashes
 * Implements production-ready error handling with fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        console.error('React Error Boundary caught an error:', error, errorInfo);

        // TODO: Send to error tracking service (Sentry) in production
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-[#1E1E24] flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-[#27272A] border border-red-500/20 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
                                <p className="text-sm text-gray-400">The IDE encountered an unexpected error</p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div className="mb-4">
                                <p className="text-sm font-mono text-red-400 bg-red-500/5 p-3 rounded border border-red-500/10">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mt-4">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                    Stack Trace (Development Only)
                                </summary>
                                <pre className="mt-2 text-xs text-gray-400 bg-black/20 p-2 rounded overflow-auto max-h-48">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
