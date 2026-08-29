import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

// Lớp phủ chặn thao tác khi đang ghi dữ liệu (tạo/sửa/xóa yêu cầu, tiếp nhận, báo giá...).
// Nằm trên cả modal (z-index cao hơn .modal-backdrop). Tông xám/trắng đơn sắc, chỉ 1 vòng xoay.
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Đang xử lý...' }) => (
  <div
    role="alert"
    aria-busy="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 22px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        maxWidth: '320px',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: '3px solid #e2e8f0',
          borderTopColor: '#475569',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{message}</span>
    </div>
  </div>
);
