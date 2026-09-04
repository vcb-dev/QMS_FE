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
    className="fixed inset-0 z-[3000] bg-[rgba(15,23,42,0.45)] backdrop-blur-[2px] flex items-center justify-center"
  >
    <div
      className="flex items-center gap-[14px] bg-white border border-[#e2e8f0] rounded-[12px] py-[18px] px-[22px] shadow-[0_8px_28px_rgba(0,0,0,0.18)] max-w-[320px]"
    >
      <span
        className="w-[22px] h-[22px] rounded-full border-[3px] border-solid border-[#e2e8f0] border-t-[#475569] animate-[spin_0.8s_linear_infinite] shrink-0"
      />
      <span className="text-[13.5px] font-bold text-[#0f172a]">{message}</span>
    </div>
  </div>
);
