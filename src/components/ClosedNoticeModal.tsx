import React from 'react';
import clsx from 'clsx';
import { X, Info } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  btnInspPrimaryCls,
} from '../styles/classNames';

interface ClosedNoticeModalProps {
  isOpen: boolean;
  // Mã yêu cầu (mã báo giá) vừa được đánh dấu Đã chốt — hiện ra để Sale thấy ngay mã cần điền.
  reqCode?: string;
  onClose: () => void;
}

// Nhắc người vừa chốt (Sale / Admin) sau khi bấm "Đã chốt": ghi mã báo giá vào ghi chú khi lên đơn trên OMS, để bên đặt hàng lấy
// mã đó quay lại QMS xem giá do xưởng nào báo mà đặt đúng xưởng (hoặc lấy giá).
export const ClosedNoticeModal: React.FC<ClosedNoticeModalProps> = ({ isOpen, reqCode, onClose }) => {
  const dialogRef = useModalA11y(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className={modalBackdropCls}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lưu ý khi lên đơn trên OMS"
        tabIndex={-1}
        className={clsx(modalCardCls, '!max-w-[460px]')}
      >
        <div className={modalHeaderCls}>
          <h2>Lưu Ý Khi Lên Đơn Trên OMS</h2>
          <button onClick={onClose} aria-label="Đóng" className="bg-transparent border-none text-[#334155] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className={clsx(modalBodyCls, '!flex-row items-start !gap-[12px]')}>
          <Info size={22} color="#6d28d9" className="shrink-0 mt-[2px]" />
          <div>
            <p className="m-0 text-[17px] font-bold text-[#0f172a]">
              Hãy điền mã báo giá vào ghi chú khi lên đơn trên OMS
            </p>
            {reqCode && (
              <p className="m-0 mt-[10px] text-[15px] text-[#334155]">
                Mã báo giá:{' '}
                <strong className="font-mono text-[16px] text-[#1e293b] select-all">{reqCode}</strong>
              </p>
            )}
          </div>
        </div>

        <div className={modalFooterCls}>
          <button type="button" className={clsx(btnInspPrimaryCls, '!bg-[#07063f]')} onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
