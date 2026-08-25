import React from 'react';
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
        <div
          style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#ffffff',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Top Brand Gold Accent */}
            <div
              style={{
                background: 'linear-gradient(90deg, #fde68a, #f0b429, #b45309)',
                height: '5px',
              }}
            />

            <div style={{ padding: '36px 32px 32px' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                

                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    marginBottom: '16px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.12)',
                  }}
                >
                  <ShieldAlert size={32} />
                </div>

                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>
                  Đã xảy ra sự cố không mong muốn
                </h1>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.5', maxWidth: '420px' }}>
                  Hệ thống gặp lỗi trong quá trình xử lý giao diện. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={this.handleReload}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCcw size={16} /> Tải lại trang
                </button>

                <button
                  type="button"
                  onClick={this.handleGoHome}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Home size={16} /> Về trang chủ
                </button>
              </div>

              {/* Technical Details Accordion */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bug size={15} color="#64748b" /> Thông tin kỹ thuật (dành cho IT / Hỗ trợ)
                  </span>
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showDetails && (
                  <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        margin: '12px 0 8px 0',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626' }}>
                        {error?.name || 'Lỗi'}: {error?.message || 'Không xác định'}
                      </span>
                      <button
                        type="button"
                        onClick={this.handleCopyError}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: copied ? '#f0fdf4' : '#ffffff',
                          color: copied ? '#16a34a' : '#334155',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Đã sao chép' : 'Sao chép lỗi'}
                      </button>
                    </div>

                    <div
                      style={{
                        background: '#0f172a',
                        color: '#f87171',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '11px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: '1.5',
                      }}
                    >
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

