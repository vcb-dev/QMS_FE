import React, { useEffect, useRef, useState } from 'react';
import type { Material, ProductCategory, StatusCounts } from '../types';
import { Calendar, ChevronDown, HelpCircle, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { STATUS_CHART_META, STATUS_COUNT_KEYS } from '../constants';

const selectArrowStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  pointerEvents: 'none',
};

const selectAppearanceStyle: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const selectStyle: React.CSSProperties = {
  ...selectAppearanceStyle,
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '8px 30px 8px 12px',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const dateInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 10px 7px 32px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  boxSizing: 'border-box',
};

const popoverLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '5px',
  display: 'block',
};

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
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Status Squares — bấm để lọc theo trạng thái, thay cho dropdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onStatusSubFilterChange('ALL')}
          className={statusSubFilter === 'ALL' ? 'fb-square active' : 'fb-square'}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
            Tất cả
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
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
              className={isActive ? 'fb-square active' : 'fb-square'}
            >
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {counts[s.countKey]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search (trái) + nút Bộ lọc gom hết dropdown/date, Xóa lọc ở góc phải */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm mã, tên khách, sản phẩm..."
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px 8px 34px',
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Nút Bộ Lọc — gom scope/danh mục/chất liệu/ngày */}
          <div style={{ position: 'relative' }} ref={panelRef}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className="fb-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '12.5px',
              }}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc
              {panelFilterCount > 0 && (
                <span style={{
                  background: '#cbd5e1',
                  color: '#0f172a',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 900,
                  padding: '1px 6px',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {panelFilterCount}
                </span>
              )}
            </button>

            {panelOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 20,
                width: '340px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {/* Scope */}
                <div>
                  <label style={popoverLabelStyle}>Phạm vi</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={scopeFilter}
                      onChange={(e) => onScopeFilterChange?.(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="ALL">Tất cả yêu cầu báo giá</option>
                      <option value="MY_REQ">Chỉ yêu cầu của tôi</option>
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Yêu cầu bị khóa — chỉ ADMIN mới truyền onIncludeLockedChange nên chỉ ADMIN mới thấy */}
                {onIncludeLockedChange && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeLocked}
                        onChange={(e) => onIncludeLockedChange(e.target.checked)}
                      />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                        Hiện yêu cầu bị khóa
                      </span>
                      <span
                        title="Yêu cầu đang chờ/xử lý bị ẩn vì người tạo hoặc người xử lý đã bị khóa tài khoản"
                        style={{ display: 'inline-flex', cursor: 'help' }}
                      >
                        <HelpCircle size={13} style={{ color: '#94a3b8' }} />
                      </span>
                    </label>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label style={popoverLabelStyle}>Danh mục</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={categoryFilter}
                      onChange={(e) => onCategoryFilterChange(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="ALL">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Material */}
                <div>
                  <label style={popoverLabelStyle}>Chất liệu</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={materialFilter}
                      onChange={(e) => onMaterialFilterChange(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="ALL">Tất cả chất liệu</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Quick Range */}
                <div>
                  <label style={popoverLabelStyle}>Lọc nhanh theo thời gian</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: timeRangeFilter === opt.value ? '#ffffff' : '#f1f5f9',
                          color: timeRangeFilter === opt.value ? '#0f172a' : '#64748b',
                          border: timeRangeFilter === opt.value ? '1px solid #0f172a' : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range — xếp cột, mỗi ô full width panel (nằm ngang bị bóp chật khiến
                    input date co lại lệch, icon đè lên chữ) */}
                <div>
                  <label style={popoverLabelStyle}>Khoảng ngày tùy chọn</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                      <input
                        type="date"
                        value={startDateFilter}
                        max={endDateFilter || undefined}
                        onChange={(e) => onStartDateChange?.(e.target.value)}
                        style={dateInputStyle}
                      />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                      <input
                        type="date"
                        value={endDateFilter}
                        min={startDateFilter || undefined}
                        onChange={(e) => onEndDateChange?.(e.target.value)}
                        style={dateInputStyle}
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
            className="fb-btn"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
            title={isFiltered ? 'Xóa tất cả bộ lọc' : 'Chưa có bộ lọc nào đang áp dụng'}
          >
            <RotateCcw size={13} /> Xóa bộ lọc
          </button>
        </div>

        {/* Tạo yêu cầu / Xuất Excel — góc phải, chỗ cũ của nút Xóa bộ lọc */}
        {actions && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
