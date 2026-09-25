import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, LogIn } from 'lucide-react';
import { windowsBridge } from '../../services/windowsBridge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
    try {
      windowsBridge.log('error', 'APP', `Unhandled UI Error: ${error.message}\n${error.stack || ''}`);
    } catch {
      // Safe fallback
    }
    this.setState({ errorInfo });
  }

  private handleResetToLogin = () => {
    try {
      // Clean auth session safely without wiping business data
      localStorage.removeItem('basha_pos_auth_session');
      localStorage.removeItem('basha_pos_current_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.setItem('basha_pos_logged_out', 'true');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error during emergency session reset:', e);
    }

    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleReloadApp = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="fixed inset-0 z-50 bg-[#231610] text-[#F5EFE6] flex items-center justify-center p-6 select-none font-sans"
          dir="rtl"
        >
          <div className="bg-[#2D1B13] border border-[#6F4E37] max-w-lg w-full rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertOctagon className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-amber-100">
                مشويات الباشا | نظام نقطة البيع
              </h2>
              <p className="text-sm text-amber-200/80">
                حدث استثناء غير متوقع في الواجهة. بياناتك وفواتيرك محفوظة بأمان.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-right max-h-32 overflow-y-auto text-[11px] font-mono text-amber-100/70 select-text" dir="ltr">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleResetToLogin}
                className="flex-1 py-3 px-4 rounded-xl bg-[#8B1E1E] hover:bg-[#A32222] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>العودة لشاشة الدخول</span>
              </button>
              <button
                type="button"
                onClick={this.handleReloadApp}
                className="py-3 px-4 rounded-xl bg-[#3E2723] hover:bg-[#4E342E] text-amber-100 border border-[#6F4E37] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة تحميل النظام</span>
              </button>
            </div>

            <div className="text-[11px] text-[#A68A78] pt-2 border-t border-[#4E342E]/60">
              إصدار الإنتاج التجاري المرخص • حماية متقدمة ضد توقف النظام
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
