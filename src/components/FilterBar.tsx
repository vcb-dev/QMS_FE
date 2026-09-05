import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Material, ProductCategory, StatusCounts } from '../types';
import { Calendar, ChevronDown, HelpCircle, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { STATUS_CHART_META, STATUS_COUNT_KEYS } from '../constants';
import {
  fbBtnCls,
  selectArrowCls,
  selectCls,
  dateInputIconCls,
  popoverLabelCls,
  fbSquareBaseCls,
  fbSquareActiveCls,
} from '../styles/classNames';

const STATUS_SQUARES: { value: string; label: string; color: string; countKey: keyof StatusCounts }[] =
  STATUS_CHART_META.map((s) => ({ ...s, countKey: STATUS_COUNT_KEYS[s.value] as keyof StatusCounts }));

interface FilterBarProps {
  currentTab: string;
  tabLabel: string;
  counts: StatusCounts;
  scopeFilter?: string;
  onScopeFilterChange?: (scope: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusSubFilter: string;
  onStatusSubFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (catId: string) => void;
  materialFilter: string;
  onMaterialFilterChange: (matId: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (owner: string) => void;
  timeRangeFilter?: string;
  onTimeRangeFilterChange?: (range: string) => void;
  startDateFilter?: string;
  onStartDateChange?: (dateStr: string) => void;
  endDateFilter?: string;
  onEndDateChange?: (dateStr: string) => void;
  categories: ProductCategory[];
  materials: Material[];
  onResetFilters: () => void;
  totalFiltered: number;
  totalTabItems: number;
  actions?: React.ReactNode;
  includeLocked?: boolean;
  onIncludeLockedChange?: (value: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentTab: _currentTab,
  counts,
  scopeFilter = 'ALL',
  onScopeFilterChange,
  searchTerm,
  onSearchChange,
  statusSubFilter,
  onStatusSubFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  materialFilter,
  onMaterialFilterChange,
  timeRangeFilter = 'ALL',
  onTimeRangeFilterChange,
  startDateFilter = '',
  onStartDateChange,
  endDateFilter = '',
  onEndDateChange,
  categories,
  materials,
  onResetFilters,
  actions,
  includeLocked = false,
  onIncludeLockedChange,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const panelFilterCount =
    (scopeFilter !== 'ALL' ? 1 : 0) +
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (materialFilter !== 'ALL' ? 1 : 0) +
    (timeRangeFilter !== 'ALL' ? 1 : 0) +
    (startDateFilter ? 1 : 0) +
    (endDateFilter ? 1 : 0) +
    (includeLocked ? 1 : 0);

  const isFiltered =
    statusSubFilter !== 'ALL' ||
    Boolean(searchTerm) ||
    panelFilterCount > 0;

  return (
    <div className="bg-surface border border-border rounded-[12px] py-[10px] px-[14px] mb-[10px] flex flex-col gap-[10px]">
      {/* Status Squares — bấm để lọc theo trạng thái, thay cho dropdown */}
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))] gap-[8px]">
        <button
          type="button"
          onClick={() => onStatusSubFilterChange('ALL')}
          className={clsx(fbSquareBaseCls, statusSubFilter === 'ALL' && fbSquareActiveCls)}
        >
          <div className="text-[10.5px] font-bold text-muted uppercase tracking-[0.3px] mb-[2px]">
            Tất cả
          </div>
          <div className="text-[15px] font-black text-[#0f172a]">
            {counts.total}
          </div>
        </button>

        {STATUS_SQUARES.map((s) => {
          const isActive = statusSubFilter === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatusSubFilterChange(s.value)}
              className={clsx(fbSquareBaseCls, isActive && fbSquareActiveCls)}
            >
              <div className="text-[10.5px] font-bold text-muted uppercase tracking-[0.3px] mb-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
                {s.label}
              </div>
              <div className="text-[15px] font-black text-[#0f172a]">
                {counts[s.countKey]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search (trái) + nút Bộ lọc gom hết dropdown/date, Xóa lọc ở góc phải */}
      <div className="flex items-center justify-between flex-wrap gap-[10px]">
        <div className="flex items-center gap-[10px] flex-wrap">
          {/* Search Input */}
          <div className="relative w-[260px]">
            <Search size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm mã, tên khách, sản phẩm..."
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-[8px] pt-[8px] pr-[12px] pb-[8px] pl-[34px] text-[12.5px] text-[#0f172a] outline-none box-border"
            />
          </div>

          {/* Nút Bộ Lọc — gom scope/danh mục/chất liệu/ngày */}
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className={clsx(fbBtnCls, 'inline-flex items-center gap-[6px] !py-[8px] !px-[14px] !text-[12.5px]')}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc
              {panelFilterCount > 0 && (
                <span className="bg-[#cbd5e1] text-[#0f172a] rounded-full text-[10.5px] font-black py-[1px] px-[6px] min-w-[16px] text-center">
                  {panelFilterCount}
                </span>
              )}
            </button>

            {panelOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 z-20 w-[340px] bg-surface border border-border rounded-[12px] shadow-[0_12px_32px_rgba(15,23,42,0.16)] p-[16px] flex flex-col gap-[14px]">
                {/* Scope */}
                <div>
                  <label className={popoverLabelCls}>Phạm vi</label>
                  <div className="relative">
                    <select
                      value={scopeFilter}
                      onChange={(e) => onScopeFilterChange?.(e.target.value)}
                      className={selectCls}
                    >
                      <option value="ALL">Tất cả yêu cầu báo giá</option>
                      <option value="MY_REQ">Chỉ yêu cầu của tôi</option>
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Yêu cầu bị khóa — chỉ ADMIN mới truyền onIncludeLockedChange nên chỉ ADMIN mới thấy */}
                {onIncludeLockedChange && (
                  <div>
                    <label className="flex items-center gap-[6px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeLocked}
                        onChange={(e) => onIncludeLockedChange(e.target.checked)}
                      />
                      <span className="text-[12.5px] font-semibold text-[#334155]">
                        Hiện yêu cầu bị khóa
                      </span>
                      <span
                        title="Yêu cầu đang chờ/xử lý bị ẩn vì người tạo hoặc người xử lý đã bị khóa tài khoản"
                        className="inline-flex cursor-help"
                      >
                        <HelpCircle size={13} className="text-faint" />
                      </span>
                    </label>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className={popoverLabelCls}>Danh mục</label>
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => onCategoryFilterChange(e.target.value)}
                      className={selectCls}
                    >
                      <option value="ALL">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Material */}
                <div>
                  <label className={popoverLabelCls}>Chất liệu</label>
                  <div className="relative">
                    <select
                      value={materialFilter}
                      onChange={(e) => onMaterialFilterChange(e.target.value)}
                      className={selectCls}
                    >
                      <option value="ALL">Tất cả chất liệu</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Quick Range */}
                <div>
                  <label className={popoverLabelCls}>Lọc nhanh theo thời gian</label>
                  <div className="flex gap-[6px] flex-wrap">
                    {([
                      { value: 'TODAY', label: 'Hôm nay' },
                      { value: 'THIS_WEEK', label: 'Tuần này' },
                      { value: 'THIS_MONTH', label: 'Tháng này' },
                      { value: 'ALL', label: 'Tất cả' },
                    ] as { value: string; label: string }[]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onTimeRangeFilterChange?.(opt.value)}
                        className={clsx(
                          'py-[6px] px-[12px] rounded-[6px] text-[11.5px] font-bold cursor-pointer border',
                          timeRangeFilter === opt.value ? 'bg-surface text-[#0f172a] border-[#0f172a]' : 'bg-[#f1f5f9] text-muted border-transparent',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range — xếp cột, mỗi ô full width panel (nằm ngang bị bóp chật khiến
                    input date co lại lệch, icon đè lên chữ) */}
                <div>
                  <label className={popoverLabelCls}>Khoảng ngày tùy chọn</label>
                  <div className="flex flex-col gap-[8px]">
                    <div className="relative">
                      <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="date"
                        value={startDateFilter}
                        max={endDateFilter || undefined}
                        onChange={(e) => onStartDateChange?.(e.target.value)}
                        className={dateInputIconCls}
                      />
                    </div>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="date"
                        value={endDateFilter}
                        min={startDateFilter || undefined}
                        onChange={(e) => onEndDateChange?.(e.target.value)}
                        className={dateInputIconCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Xóa lọc — cùng phía với nút Bộ lọc */}
          <button
            type="button"
            onClick={onResetFilters}
            disabled={!isFiltered}
            className={clsx(fbBtnCls, '!py-[8px] !px-[14px] !text-[12px] flex items-center gap-[4px] shrink-0')}
            title={isFiltered ? 'Xóa tất cả bộ lọc' : 'Chưa có bộ lọc nào đang áp dụng'}
          >
            <RotateCcw size={13} /> Xóa bộ lọc
          </button>
        </div>

        {/* Tạo yêu cầu / Xuất Excel — góc phải, chỗ cũ của nút Xóa bộ lọc */}
        {actions && (
          <div className="flex gap-[10px] items-center shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

