import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Something went wrong</h1>
          <p className="text-gray-500 mb-8 max-w-md font-medium">The application encountered an unexpected error. This might be due to a connection issue or a configuration error.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-12 p-6 bg-gray-50 rounded-3xl text-left border border-gray-100 max-w-2xl w-full overflow-auto">
              <p className="text-xs font-mono text-gray-400 uppercase mb-2 tracking-widest">Error Details</p>
              <p className="text-sm font-mono text-red-600 font-bold">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.children;
  }
}
