import React from 'react';
import type { Material, ProductCategory } from '../types';
import { Calendar, RotateCcw } from 'lucide-react';
import { QUOTE_STATUS_OPTIONS } from '../constants';

interface FilterBarProps {
  currentTab: string;
  tabLabel: string;
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
          {/* Status Select */}
          <select
            value={statusSubFilter}
            onChange={(e) => onStatusSubFilterChange(e.target.value)}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
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

          {/* Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
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

          {/* Material Select */}
          <select
            value={materialFilter}
            onChange={(e) => onMaterialFilterChange(e.target.value)}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
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

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={13} /> Xóa bộ lọc
            </button>
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginRight: '4px' }}>
              LỌC NHANH:
            </span>
            <button
              type="button"
              onClick={() => onTimeRangeFilterChange?.('TODAY')}
              style={{
                background: timeRangeFilter === 'TODAY' ? '#0f172a' : '#f1f5f9',
                color: timeRangeFilter === 'TODAY' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeFilterChange?.('THIS_WEEK')}
              style={{
                background: timeRangeFilter === 'THIS_WEEK' ? '#0f172a' : '#f1f5f9',
                color: timeRangeFilter === 'THIS_WEEK' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeFilterChange?.('THIS_MONTH')}
              style={{
                background: timeRangeFilter === 'THIS_MONTH' ? '#0f172a' : '#f1f5f9',
                color: timeRangeFilter === 'THIS_MONTH' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => onTimeRangeFilterChange?.('ALL')}
              style={{
                background: timeRangeFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
                color: timeRangeFilter === 'ALL' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tất cả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
