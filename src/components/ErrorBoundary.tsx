import React from 'react';
import { clsx } from 'clsx';
import { RotateCcw, Home, ShieldAlert, Copy, Check, ChevronDown, ChevronUp, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    const errorDetails = `[VCB QMS Error Report]
Time: ${new Date().toISOString()}
URL: ${window.location.href}
Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied, showDetails } = this.state;

      return (
        <div className="min-h-screen w-screen flex items-center justify-center p-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f172a_100%)] font-sans box-border">
          <div className="w-full max-w-[560px] bg-surface rounded-[24px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)]">
            {/* Top Brand Gold Accent */}
            <div className="bg-[linear-gradient(90deg,#fde68a,#f0b429,#b45309)] h-[5px]" />

            <div className="pt-[36px] px-[32px] pb-[32px]">
              {/* Header Info */}
              <div className="flex flex-col items-center text-center mb-[24px]">
                <div className="w-[64px] h-[64px] rounded-[20px] bg-[#fef2f2] border border-[#fee2e2] flex items-center justify-center text-[#dc2626] mb-[16px] shadow-[0_4px_12px_rgba(220,38,38,0.12)]">
                  <ShieldAlert size={32} />
                </div>

                <h1 className="text-[20px] font-extrabold text-[#0f172a] m-0 mb-[8px] tracking-[-0.3px]">
                  Đã xảy ra sự cố không mong muốn
                </h1>
                <p className="text-[13.5px] text-muted m-0 leading-[1.5] max-w-[420px]">
                  Hệ thống gặp lỗi trong quá trình xử lý giao diện. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-[12px] justify-center mb-[20px] flex-wrap">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-[8px] bg-[#0f172a] text-white border-0 rounded-[12px] py-[12px] px-[20px] text-[13.5px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(15,23,42,0.25)] transition-[all_0.15s_ease]"
                >
                  <RotateCcw size={16} /> Tải lại trang
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-[8px] bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] rounded-[12px] py-[12px] px-[20px] text-[13.5px] font-bold cursor-pointer transition-[all_0.15s_ease]"
                >
                  <Home size={16} /> Về trang chủ
                </button>
              </div>

              {/* Technical Details Accordion */}
              <div className="border border-border rounded-[14px] bg-[#f8fafc] overflow-hidden transition-[all_0.2s_ease]">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="w-full py-[12px] px-[16px] flex items-center justify-between bg-transparent border-0 cursor-pointer text-[#475569] text-[12.5px] font-bold"
                >
                  <span className="flex items-center gap-[8px]">
                    <Bug size={15} className="text-muted" /> Thông tin kỹ thuật (dành cho IT / Hỗ trợ)
                  </span>
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showDetails && (
                  <div className="pt-0 px-[16px] pb-[16px] border-t border-border">
                    <div className="flex justify-between items-center my-[12px] mb-[8px] gap-[8px] flex-wrap">
                      <span className="text-[11.5px] font-extrabold text-[#dc2626]">
                        {error?.name || 'Lỗi'}: {error?.message || 'Không xác định'}
                      </span>
                      <button
                        type="button"
                        onClick={this.handleCopyError}
                        className={clsx(
                          'inline-flex items-center gap-[6px] py-[4px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[11px] font-bold cursor-pointer',
                          copied ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-surface text-[#334155]',
                        )}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Đã sao chép' : 'Sao chép lỗi'}
                      </button>
                    </div>

                    <div className="bg-[#0f172a] text-[#f87171] rounded-[8px] p-[12px] text-[11px] font-mono max-h-[160px] overflow-y-auto whitespace-pre-wrap [word-break:break-all] leading-[1.5]">
                      {error?.stack || errorInfo?.componentStack || error?.message || 'Không có chi tiết stack trace.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

