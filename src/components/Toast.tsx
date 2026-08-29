import React from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

// Thông báo nổi ở góc dưới-phải màn hình. Tông xám/trắng đơn sắc, không màu nhấn — chỉ để xác nhận
// thao tác vừa xong. Việc tự ẩn sau vài giây do phía gọi (useQuoteRequests) đảm nhiệm.
export const Toast: React.FC<ToastProps> = ({ message, onClose }) => (
  <div
    role="status"
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxWidth: '340px',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      fontSize: '13px',
      fontWeight: 600,
      color: '#0f172a',
    }}
  >
    <Check size={16} color="#475569" style={{ flexShrink: 0 }} />
    <span style={{ flex: 1 }}>{message}</span>
    <button
      type="button"
      onClick={onClose}
      title="Đóng"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
    >
      <X size={14} />
    </button>
  </div>
);
