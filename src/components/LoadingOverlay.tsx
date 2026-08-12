import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  show,
  message = 'Đang tải dữ liệu từ hệ thống VCB...',
}) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="modal-backdrop show" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '36px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: 'white',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Animated Spinner Ring */}
          <div className="spinner-ring" style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '3px solid rgba(37, 99, 235, 0.2)',
            borderTopColor: '#2563eb',
            borderRightColor: '#d97706',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ position: 'absolute', color: '#d97706' }}>
            <Sparkles size={24} />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
            VCB QMS System
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
