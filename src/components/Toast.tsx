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
    className="fixed bottom-[24px] right-[24px] z-[4000] flex items-center gap-[10px] max-w-[340px] bg-white border border-[#cbd5e1] rounded-[10px] py-[12px] px-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] text-[13px] font-semibold text-[#0f172a]"
  >
    <Check size={16} color="#475569" className="shrink-0" />
    <span className="flex-1">{message}</span>
    <button
      type="button"
      onClick={onClose}
      title="Đóng"
      className="bg-transparent border-none cursor-pointer text-[#94a3b8] flex p-0"
    >
      <X size={14} />
    </button>
  </div>
);
