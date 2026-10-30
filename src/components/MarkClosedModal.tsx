import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X, Award, Check } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { QuoteOption } from '../types';
import { formatCurrency } from '../utils/currency';
import { getOptionLabel, getOptionSummary } from '../utils/quoteOption';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  toolBtnCls,
  btnInspPrimaryCls,
} from '../styles/classNames';

interface MarkClosedModalProps {
  isOpen: boolean;
  reqCode?: string;
  options: QuoteOption[];
  onClose: () => void;
  // Khách có thể chốt nhiều phương án — mỗi phương án chốt là 1 sản phẩm trên cùng yêu cầu.
  onSubmit: (optionIds: string[]) => Promise<void>;
}

export const MarkClosedModal: React.FC<MarkClosedModalProps> = ({ isOpen, reqCode, options, onClose, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useModalA11y(onClose, isOpen);

  // Reset lựa chọn mỗi lần mở lại popup (kể cả khi mở cho 1 yêu cầu khác)
  useEffect(() => {
    if (isOpen) setSelectedIds([]);
  }, [isOpen, reqCode]);

  if (!isOpen) return null;

  const toggle = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const selectableIds = options.map((o) => o.id).filter((id): id is string => !!id);
  const allChosen = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const chosenTotal = options
    .filter((o) => o.id && selectedIds.includes(o.id))
    .reduce((sum, o) => sum + (Number(o.quotedPrice) || 0), 0);

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      alert('Chọn ít nhất 1 phương án khách đã đồng ý mua trước khi xác nhận.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(selectedIds);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalBackdropCls}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn các phương án khách đã chốt"
        tabIndex={-1}
        className={clsx(modalCardCls, '!max-w-[480px]')}
      >
        <div className={modalHeaderCls}>
          <h2>Chọn Các Phương Án Khách Đã Chốt{reqCode ? ` — ${reqCode}` : ''}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-[#334155] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className={modalBodyCls}>
          <p className="text-[15.5px] text-[#334155] m-0 mb-[12px]">
            Yêu cầu này có {options.length} phương án đã báo giá — chọn các phương án khách đồng ý mua (chọn được nhiều;
            mỗi phương án chốt là 1 sản phẩm trên cùng yêu cầu) trước khi đánh dấu Đã Chốt.
          </p>
          <button
            type="button"
            onClick={() => setSelectedIds(allChosen ? [] : selectableIds)}
            className="bg-transparent border-0 p-0 mb-[10px] text-[14.5px] font-bold text-[#6d28d9] cursor-pointer"
          >
            {allChosen ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
          <div className="flex flex-col gap-[8px]">
            {options.map((opt, idx) => {
              const label = getOptionLabel(opt, idx);
              const summary = getOptionSummary(opt);
              const isChosen = !!opt.id && selectedIds.includes(opt.id);

              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => opt.id && toggle(opt.id)}
                  aria-pressed={isChosen}
                  className={clsx(
                    "flex items-center justify-between gap-[12px] px-[14px] py-[12px] rounded-[10px] text-left cursor-pointer",
                    isChosen ? "bg-[#f5f3ff] border-[1.5px] border-solid border-[#6d28d9]" : "bg-white border border-[#e2e8f0]"
                  )}
                >
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[16.5px] font-bold text-[#0f172a]">{label}</span>
                    {summary && (
                      <span className="text-[14.5px] text-[#334155] font-semibold">
                        {summary}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-[8px] shrink-0">
                    <div className="flex flex-col items-end">
                      <strong className="text-[17px] font-black text-[#16a34a]">
                        {formatCurrency(Number(opt.quotedPrice))}
                      </strong>
                      {renderPriceBreakdownLines(getPriceBreakdown(opt))}
                    </div>
                    <span
                      className={clsx(
                        'flex items-center justify-center w-[20px] h-[20px] rounded-[5px] border-[1.5px] border-solid',
                        isChosen ? 'bg-[#6d28d9] border-[#6d28d9]' : 'bg-white border-[#cbd5e1]',
                      )}
                    >
                      {isChosen && <Check size={14} color="#ffffff" />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={modalFooterCls}>
          {selectedIds.length > 0 && (
            <span className="mr-auto text-[15px] font-bold text-[#334155]">
              Đã chọn {selectedIds.length} · Tổng {formatCurrency(chosenTotal)}
            </span>
          )}
          <button type="button" className={toolBtnCls} onClick={onClose}>Hủy</button>
          <button
            type="button"
            className={clsx(btnInspPrimaryCls, '!bg-[#07063f]')}
            onClick={handleConfirm}
            disabled={submitting || selectedIds.length === 0}
          >
            <Award size={16} /> {selectedIds.length > 1 ? `Chốt ${selectedIds.length} phương án` : 'Xác Nhận Đã Chốt'}
          </button>
        </div>
      </div>
    </div>
  );
};
