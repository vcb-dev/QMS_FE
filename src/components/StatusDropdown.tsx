import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { STATUS_DROPDOWN_META, type StatusOption } from '../constants/statusDropdown';

// Dropdown trạng thái dùng chung cho bảng danh sách (QuoteTable) và trang chi tiết (DetailPage).
// Danh sách option theo role/trạng thái do utils/statusActions.tsx dựng — component này chỉ vẽ.
// size 'sm' (mặc định) gọn cho dòng bảng; 'lg' lớn hơn một chút cho tiêu đề trang chi tiết (chữ to hơn,
// mũi tên rõ hơn) — vẫn cùng kiểu viền/màu, không đổ bóng đậm.
export const StatusDropdown: React.FC<{
  current: string;
  options: StatusOption[];
  onChange: (val: string) => void;
  size?: 'sm' | 'lg';
}> = ({ current, options, onChange, size = 'sm' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const meta = STATUS_DROPDOWN_META[current] || { label: current, icon: null, color: '#334155', bg: '#f8fafc', border: '#e2e8f0' };
  const isLg = size === 'lg';

  const updateMenuPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + (isLg ? 8 : 4), left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', updateMenuPosition);
    document.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', updateMenuPosition);
      document.removeEventListener('scroll', updateMenuPosition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen(!open);
        }}
        className={clsx(
          'inline-flex items-center cursor-pointer whitespace-nowrap',
          isLg
            ? 'justify-center gap-[6px] min-w-[140px] py-[6px] pl-[14px] pr-[12px] rounded-[22px] text-[16px] font-bold border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-[box-shadow] duration-150 hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)]'
            : 'justify-center gap-[4px] min-w-[118px] py-[4px] px-[10px] rounded-[20px] text-[14.5px] font-bold border shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[all_0.12s]',
        )}
        // động — giữ inline
        style={{
          borderColor: meta.border,
          background: meta.bg,
          color: meta.color,
        }}
      >
        <span
          className={clsx('flex items-center', isLg && 'gap-[6px] [&_svg]:w-[16px] [&_svg]:h-[16px]')}
          // động — giữ inline
          style={{ color: meta.color }}
        >
          {meta.icon}
          {isLg && meta.label}
        </span>
        {!isLg && meta.label}
        <ChevronDown
          size={isLg ? 14 : 11}
          className={clsx('ml-[1px] transition-[transform_0.15s]', isLg ? 'opacity-90' : 'opacity-70', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown Panel */}
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className={clsx(
            'fixed z-[9999] bg-surface border border-border shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]',
            isLg ? 'rounded-[12px] p-[4px] min-w-[220px]' : 'rounded-[10px] p-[4px] min-w-[180px]',
          )}
          // động — giữ inline
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {options.map((opt, idx) => (
            <React.Fragment key={opt.value}>
              {/* Thao tác nguy hiểm (Hủy yêu cầu) tách khỏi các lựa chọn còn lại bằng một đường kẻ */}
              {isLg && opt.value === 'CANCEL' && idx > 0 && <div className="my-[4px] h-px bg-border" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={clsx(
                  'flex items-center w-full border-0 cursor-pointer text-left',
                  isLg
                    ? 'gap-[8px] py-[9px] px-[12px] rounded-[8px] text-[16px] hover:bg-[#f1f5f9]'
                    : 'gap-[8px] py-[7px] px-[10px] rounded-[7px] text-[15.5px]',
                  opt.value === current ? 'font-bold' : 'font-medium',
                )}
                // động — giữ inline
                style={{
                  background: opt.value === current ? opt.bg : isLg ? undefined : 'transparent',
                  color: opt.color,
                }}
              >
                <span
                  className={clsx(isLg && '[&_svg]:w-[16px] [&_svg]:h-[16px]')}
                  // động — giữ inline
                  style={{ color: opt.color }}
                >
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};
