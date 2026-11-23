import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Zyro Mall ErrorBoundary caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E8E8E8] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#1A1A1A] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
              {this.state.message}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#E55A26] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="px-4 py-2.5 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold text-[#1A1A1A] cursor-pointer"
              >
                Try Again
              </button>
              <a
                href="/"
                className="px-4 py-2.5 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#F8F8F8] text-sm font-semibold text-[#1A1A1A]"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
