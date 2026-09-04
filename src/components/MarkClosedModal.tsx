import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X, Award, Check } from 'lucide-react';
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
  onSubmit: (optionId: string) => Promise<void>;
}

export const MarkClosedModal: React.FC<MarkClosedModalProps> = ({ isOpen, reqCode, options, onClose, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset lựa chọn mỗi lần mở lại popup (kể cả khi mở cho 1 yêu cầu khác)
  useEffect(() => {
    if (isOpen) setSelectedId(null);
  }, [isOpen, reqCode]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId) {
      alert('Chọn 1 phương án khách đã đồng ý mua trước khi xác nhận.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(selectedId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalBackdropCls}>
      <div className={clsx(modalCardCls, '!max-w-[480px]')}>
        <div className={modalHeaderCls}>
          <h2>Chọn Phương Án Khách Đã Chốt{reqCode ? ` — ${reqCode}` : ''}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-[#64748b] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className={modalBodyCls}>
          <p className="text-[12.5px] text-[#64748b] m-0 mb-[12px]">
            Yêu cầu này có {options.length} phương án đã báo giá — chọn đúng phương án khách đồng ý mua trước khi đánh dấu Đã Chốt.
          </p>
          <div className="flex flex-col gap-[8px]">
            {options.map((opt, idx) => {
              const label = getOptionLabel(opt, idx);
              const summary = getOptionSummary(opt);
              const isChosen = opt.id === selectedId;

              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => opt.id && setSelectedId(opt.id)}
                  className={clsx(
                    "flex items-center justify-between gap-[12px] px-[14px] py-[12px] rounded-[10px] text-left cursor-pointer",
                    isChosen ? "bg-[#f5f3ff] border-[1.5px] border-solid border-[#6d28d9]" : "bg-white border border-[#e2e8f0]"
                  )}
                >
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[13.5px] font-bold text-[#0f172a]">{label}</span>
                    {summary && (
                      <span className="text-[11.5px] text-[#64748b] font-semibold">
                        {summary}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-[8px] shrink-0">
                    <div className="flex flex-col items-end">
                      <strong className="text-[14px] font-black text-[#16a34a]">
                        {formatCurrency(Number(opt.quotedPrice))}
                      </strong>
                      {renderPriceBreakdownLines(getPriceBreakdown(opt))}
                    </div>
                    {isChosen && <Check size={16} color="#6d28d9" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={modalFooterCls}>
          <button type="button" className={toolBtnCls} onClick={onClose}>Hủy</button>
          <button
            type="button"
            className={clsx(btnInspPrimaryCls, '!bg-[#07063f]')}
            onClick={handleConfirm}
            disabled={submitting || !selectedId}
          >
            <Award size={16} /> Xác Nhận Đã Chốt
          </button>
        </div>
      </div>
    </div>
  );
};
