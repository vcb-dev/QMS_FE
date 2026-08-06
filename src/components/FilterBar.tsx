import React from 'react';
import type { Material, ProductCategory } from '../types';
import { Search, RotateCcw, Filter } from 'lucide-react';

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
  categories: ProductCategory[];
  materials: Material[];
  onResetFilters: () => void;
  totalFiltered: number;
  totalTabItems: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentTab,
  tabLabel,
  searchTerm,
  onSearchChange,
  statusSubFilter,
  onStatusSubFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  materialFilter,
  onMaterialFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  categories,
  materials,
  onResetFilters,
  totalFiltered,
  totalTabItems,
}) => {
  const hasActiveSecondaryFilters =
    searchTerm !== '' ||
    statusSubFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    materialFilter !== 'ALL' ||
    ownerFilter !== 'ALL';

  const isStatusTabLocked =
    currentTab === 'YC_MOI' ||
    currentTab === 'DANG_XLY' ||
    currentTab === 'XONG' ||
    currentTab === 'TU_CHOI' ||
    currentTab === 'LIBRARY';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
          <Filter size={15} color="#2563eb" /> LỌC TRONG: <span style={{ color: '#2563eb', textTransform: 'uppercase' }}>{tabLabel}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Hiển thị <strong style={{ color: '#2563eb' }}>{totalFiltered}</strong> / {totalTabItems} trong tab này
        </div>
      </div>

      {/* Row of Filter Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
        {/* 1. Search Box */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '32px', fontSize: '12px', height: '36px' }}
            placeholder={`Tìm trong ${tabLabel}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* 2. Status Sub-Filter (Disabled/Locked if tab is already status-specific) */}
        <select
          className="form-control"
          style={{ fontSize: '12px', height: '36px', opacity: isStatusTabLocked ? 0.7 : 1 }}
          value={isStatusTabLocked ? 'ALL' : statusSubFilter}
          onChange={(e) => onStatusSubFilterChange(e.target.value)}
          disabled={isStatusTabLocked}
        >
          <option value="ALL">{isStatusTabLocked ? 'Theo Trạng Thái Tab' : 'Tất Cả Trạng Thái'}</option>
          <option value="YC_MOI">Yêu cầu mới</option>
          <option value="DANG_XLY">Đang xử lý</option>
          <option value="XONG">Đã báo giá</option>
          <option value="TU_CHOI">Bị từ chối</option>
        </select>

        {/* 3. Category Filter */}
        <select
          className="form-control"
          style={{ fontSize: '12px', height: '36px' }}
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
        >
          <option value="ALL">Tất cả Danh Mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* 4. Material Filter */}
        <select
          className="form-control"
          style={{ fontSize: '12px', height: '36px' }}
          value={materialFilter}
          onChange={(e) => onMaterialFilterChange(e.target.value)}
        >
          <option value="ALL">Tất cả Chất Liệu</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* 5. Owner Filter (Disabled if currentTab is MY_REQ) */}
        <select
          className="form-control"
          style={{ fontSize: '12px', height: '36px', opacity: currentTab === 'MY_REQ' ? 0.7 : 1 }}
          value={currentTab === 'MY_REQ' ? 'MY_REQ' : ownerFilter}
          onChange={(e) => onOwnerFilterChange(e.target.value)}
          disabled={currentTab === 'MY_REQ'}
        >
          <option value="ALL">Tất cả Người Tạo</option>
          <option value="MY_REQ">Chỉ Đơn Của Tôi</option>
        </select>

        {/* 6. Reset Filters Button */}
        <button
          type="button"
          onClick={onResetFilters}
          disabled={!hasActiveSecondaryFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            height: '36px',
            padding: '0 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: hasActiveSecondaryFilters ? '#dc2626' : '#94a3b8',
            background: hasActiveSecondaryFilters ? '#fef2f2' : '#f8fafc',
            border: hasActiveSecondaryFilters ? '1px solid #fecdd3' : '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: hasActiveSecondaryFilters ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={13} /> Đặt Lại
        </button>
      </div>
    </div>
  );
};
