import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { COMPANY_LOGO_URL } from '../constants';

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  showHome?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = 'Không tìm thấy trang yêu cầu',
  description = 'Đường dẫn bạn đang truy cập không tồn tại, đã bị thay đổi hoặc yêu cầu báo giá này không còn trên hệ thống.',
  backTo,
  backLabel = 'Quay lại',
  showHome = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand Logo */}
        <img
          src={COMPANY_LOGO_URL}
          alt="Viễn Chí Bảo"
          style={{ height: '36px', objectFit: 'contain', marginBottom: '24px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* 404 Badge with Icon */}
        <div
          style={{
            position: 'relative',
            marginBottom: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              letterSpacing: '-3px',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
            }}
          >
            404
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-8px',
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)',
            }}
          >
            <FileQuestion size={20} />
          </div>
        </div>

        {/* Text Details */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '13.5px',
            color: '#64748b',
            margin: '0 0 28px 0',
            lineHeight: '1.5',
            maxWidth: '380px',
          }}
        >
          {description}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '360px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            style={{
              flex: 1,
              minWidth: '140px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 18px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={16} /> {backLabel}
          </button>

          {showHome && (
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                flex: 1,
                minWidth: '140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Home size={16} /> Về trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
