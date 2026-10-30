import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { Supplier } from '../types';
import { matchSupplier, supplierLabel } from '../utils/supplier';

const ALL_VALUE = 'ALL';
const ALL_LABEL = 'Tất cả NCC';
// Chiều cao cần có (ô tìm + ~6 dòng) để danh sách mở xuống mà không tràn màn hình.
const DROPDOWN_MIN_SPACE = 320;

interface SupplierSelectProps {
  suppliers: Supplier[];
  // '' = chưa chọn (khi không allowAll); 'ALL' = "Tất cả NCC" (khi allowAll).
  value: string;
  onChange: (id: string) => void;
  // Thêm lựa chọn đầu "Tất cả NCC" mang giá trị 'ALL' — dùng cho bộ lọc danh sách.
  allowAll?: boolean;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

// Dropdown chọn nhà cung cấp có ô tìm kiếm (theo tên, không phân biệt hoa thường và dấu tiếng Việt).
// Lọc phía client trên danh sách đã nạp — số NCC ít nên không cần gọi API theo từng phím gõ.
export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  suppliers,
  value,
  onChange,
  allowAll = false,
  placeholder = 'Chọn nhà cung cấp',
  invalid = false,
  disabled = false,
  ariaLabel = 'Nhà cung cấp',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // Mở lên phía trên khi phía dưới không đủ chỗ (vd ô nằm cuối panel bộ lọc) — không thì danh sách tràn khỏi màn hình.
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const items = useMemo(() => {
    const matched = suppliers
      .filter((s) => matchSupplier(s, query))
      .map((s) => ({ id: s.id, label: supplierLabel(s) }));
    return allowAll && !query.trim() ? [{ id: ALL_VALUE, label: ALL_LABEL }, ...matched] : matched;
  }, [suppliers, query, allowAll]);

  const selected = suppliers.find((s) => s.id === value);
  const buttonLabel = allowAll && value === ALL_VALUE ? ALL_LABEL : selected ? supplierLabel(selected) : '';

  const openList = () => {
    if (disabled) return;
    const startIndex = Math.max(
      0,
      (allowAll
        ? [{ id: ALL_VALUE }, ...suppliers]
        : suppliers
      ).findIndex((s) => s.id === value),
    );
    const rect = buttonRef.current?.getBoundingClientRect();
    const spaceBelow = rect ? window.innerHeight - rect.bottom : Infinity;
    setDropUp(!!rect && spaceBelow < DROPDOWN_MIN_SPACE && rect.top > spaceBelow);
    setQuery('');
    setActive(startIndex);
    setOpen(true);
  };

  const closeList = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const choose = (id: string) => {
    onChange(id);
    closeList(true);
  };

  // Mở ra là đưa con trỏ vào ô tìm kiếm ngay.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Bấm ra ngoài thì đóng.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Giữ dòng đang tô sáng trong tầm nhìn khi di chuyển bằng phím.
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      // Modal báo giá nghe Esc ở cấp document để tự đóng — chặn lại để Esc chỉ đóng dropdown.
      e.preventDefault();
      e.stopPropagation();
      closeList(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) choose(items[active].id);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        className={clsx(
          'w-full flex items-center justify-between gap-[8px] py-[8px] px-[12px] rounded-[8px] border bg-surface text-left text-[16px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
          invalid ? 'border-[#dc2626]' : 'border-[#cbd5e1]',
        )}
      >
        <span className={clsx('truncate', buttonLabel ? 'text-[#0f172a]' : 'text-faint font-semibold')}>
          {buttonLabel || placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div
          className={clsx(
            'absolute z-50 left-0 right-0 bg-surface border border-[#cbd5e1] rounded-[10px] shadow-[0_8px_24px_rgba(15,23,42,0.12)] overflow-hidden',
            dropUp ? 'bottom-full mb-[4px]' : 'mt-[4px]',
          )}
        >
          <div className="relative border-b border-[#e5e7eb]">
            <Search size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Tìm theo tên..."
              aria-label="Tìm nhà cung cấp"
              aria-controls={listId}
              className="w-full py-[9px] pr-[12px] pl-[34px] text-[15px] font-semibold text-[#0f172a] outline-none bg-transparent"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="m-0 p-0 list-none max-h-[240px] overflow-y-auto">
            {items.length === 0 ? (
              <li className="py-[12px] px-[14px] text-[15px] text-muted">Không tìm thấy nhà cung cấp</li>
            ) : (
              items.map((it, idx) => (
                <li
                  key={it.id}
                  role="option"
                  aria-selected={it.id === value}
                  // mousedown (không phải click) để chọn trước khi ô tìm kiếm mất focus.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(it.id);
                  }}
                  onMouseEnter={() => setActive(idx)}
                  className={clsx(
                    'flex items-center justify-between gap-[8px] py-[9px] px-[14px] text-[15.5px] cursor-pointer',
                    idx === active ? 'bg-[#f1f5f9]' : 'bg-transparent',
                    it.id === value ? 'font-extrabold text-[#0f172a]' : 'font-semibold text-[#334155]',
                  )}
                >
                  <span className="truncate">{it.label}</span>
                  {it.id === value && <Check size={14} className="shrink-0 text-[#16a34a]" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
