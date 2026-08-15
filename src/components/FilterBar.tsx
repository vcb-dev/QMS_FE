import React from 'react';
import type { Material, ProductCategory } from '../types';
import { Calendar, ChevronDown, RotateCcw } from 'lucide-react';
import { QUOTE_STATUS_OPTIONS } from '../constants';

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

interface FilterBarProps {
  currentTab: string;
  tabLabel: string;
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
  categories: ProductCategory[];
  materials: Material[];
  onResetFilters: () => void;
  totalFiltered: number;
  totalTabItems: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentTab: _currentTab,
  scopeFilter = 'ALL',
  onScopeFilterChange,
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
  categories,
  materials,
  onResetFilters,
}) => {
  const isFiltered =
    scopeFilter !== 'ALL' ||
    statusSubFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    materialFilter !== 'ALL' ||
    timeRangeFilter !== 'ALL' ||
    Boolean(startDateFilter);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Dropdowns Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Scope Select (Tất cả yêu cầu vs Chỉ yêu cầu của tôi) */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              value={scopeFilter}
              onChange={(e) => onScopeFilterChange?.(e.target.value)}
              style={{
                ...selectAppearanceStyle,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Tất cả yêu cầu báo giá</option>
              <option value="MY_REQ">Chỉ yêu cầu của tôi</option>
            </select>
            <ChevronDown size={14} style={selectArrowStyle} />
          </div>
          {/* Status Select */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              value={statusSubFilter}
              onChange={(e) => onStatusSubFilterChange(e.target.value)}
              style={{
                ...selectAppearanceStyle,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {QUOTE_STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={selectArrowStyle} />
          </div>

          {/* Category Select */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              style={{
                ...selectAppearanceStyle,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={selectArrowStyle} />
          </div>

          {/* Material Select */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              value={materialFilter}
              onChange={(e) => onMaterialFilterChange(e.target.value)}
              style={{
                ...selectAppearanceStyle,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 30px 7px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Tất cả chất liệu</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={selectArrowStyle} />
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={!isFiltered}
            style={{
              background: isFiltered ? '#fee2e2' : '#f8fafc',
              color: isFiltered ? '#b91c1c' : '#cbd5e1',
              border: isFiltered ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isFiltered ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: isFiltered ? 1 : 0.6,
            }}
            title={isFiltered ? 'Xóa tất cả bộ lọc' : 'Chưa có bộ lọc nào đang áp dụng'}
          >
            <RotateCcw size={13} /> Xóa bộ lọc
          </button>
        </div>

        {/* Date Picker & Quick Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Date Picker Input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px 6px 34px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
              }}
            />
            <Calendar size={14} style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Quick Range Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              LỌC NHANH:
            </span>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <select
                value={timeRangeFilter}
                onChange={(e) => onTimeRangeFilterChange?.(e.target.value)}
                style={{
                  ...selectAppearanceStyle,
                  background: timeRangeFilter !== 'ALL' ? '#0f172a' : '#f1f5f9',
                  color: timeRangeFilter !== 'ALL' ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 26px 5px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <option value="TODAY">Hôm nay</option>
                <option value="THIS_WEEK">Tuần này</option>
                <option value="THIS_MONTH">Tháng này</option>
                <option value="ALL">Tất cả</option>
              </select>
              <ChevronDown size={13} style={{ ...selectArrowStyle, right: '8px', color: timeRangeFilter !== 'ALL' ? '#ffffff' : '#64748b' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
