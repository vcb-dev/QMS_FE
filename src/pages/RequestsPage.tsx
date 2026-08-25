import React, { useState } from 'react';
import type { RequestsPageProps } from '../types';
import { FilterBar } from '../components/FilterBar';
import { QuoteTable } from '../components/QuoteTable';
import { Pagination } from '../components/Pagination';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RequestsPage: React.FC<RequestsPageProps> = ({
  requests,
  categories,
  materials,
  currentRole,
  currentUser,
  counts,
  statusSubFilter,
  setStatusSubFilter,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  materialFilter,
  setMaterialFilter,
  ownerFilter,
  setOwnerFilter,
  timeRangeFilter,
  setTimeRangeFilter,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  includeLocked,
  setIncludeLocked,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalRecords,
  totalPages,
  scopeFilter,
  setScopeFilter,
  onSelectReq,
  onEdit,
  onAccept,
  onPricing,
  onReject,
  onReturn,
  onResubmit,
  onDelete,
  onMarkClosed,
  onManageOptions,
  onOpenCreate,
  onOpenExport,
  onResetFilters,
  selectedId,
}) => {
  const navigate = useNavigate();
  const [currentFilter] = useState('ALL');

  const handleScopeChange = (sc: string) => {
    setScopeFilter(sc);
    navigate('/requests');
  };

  return (
    <>
      <div className="view-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          
          <h1>Danh Sách Yêu Cầu Báo Giá</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {currentRole === 'ADMIN' && setIncludeLocked && (
            <button
              className="tool-btn"
              onClick={() => { setIncludeLocked(!includeLocked); setCurrentPage(1); }}
              title="Yêu cầu đang chờ/xử lý bị ẩn vì người tạo hoặc người xử lý đã bị khóa tài khoản"
              style={{ background: includeLocked ? '#fef3c7' : undefined, borderColor: includeLocked ? '#f59e0b' : undefined }}
            >
              {includeLocked ? 'Đang hiện yêu cầu bị khóa' : 'Hiện yêu cầu bị khóa'}
            </button>
          )}
          {(currentRole === 'SALE' || currentRole === 'ADMIN') && (
            <button
              className="primary-action"
              // Gọi trực tiếp onClick={onOpenCreate} sẽ vô tình truyền thẳng SyntheticEvent của
              // click vào làm calcData (object luôn truthy) — khiến CreateModal tưởng đang tạo đơn
              // từ máy tính giá, khóa nhầm phần chọn đá dù đây là luồng tạo đơn thường.
              onClick={() => onOpenCreate()}
              style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={18} /> Tạo Yêu Cầu Báo Giá
            </button>
          )}
        </div>
      </div>

      <FilterBar
        currentTab={currentFilter}
        tabLabel="Danh Sách Yêu Cầu Báo Giá"
        counts={counts}
        scopeFilter={scopeFilter}
        onScopeFilterChange={handleScopeChange}
        searchTerm={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        statusSubFilter={statusSubFilter}
        onStatusSubFilterChange={(v) => { setStatusSubFilter(v); setCurrentPage(1); }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
        materialFilter={materialFilter}
        onMaterialFilterChange={(v) => { setMaterialFilter(v); setCurrentPage(1); }}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={(v) => { setOwnerFilter(v); setCurrentPage(1); }}
        timeRangeFilter={timeRangeFilter}
        onTimeRangeFilterChange={(v) => { setTimeRangeFilter(v); setCurrentPage(1); }}
        startDateFilter={startDateFilter}
        onStartDateChange={(v) => { setStartDateFilter(v); setCurrentPage(1); }}
        endDateFilter={endDateFilter}
        onEndDateChange={(v) => { setEndDateFilter(v); setCurrentPage(1); }}
        categories={categories}
        materials={materials}
        onResetFilters={onResetFilters}
        onOpenExport={onOpenExport}
        totalFiltered={totalRecords}
        totalTabItems={totalRecords}
      />

      <div className="surface">
        <QuoteTable
          requests={requests}
          selectedId={selectedId ?? null}
          currentRole={currentRole}
          currentUser={currentUser}
          onSelect={onSelectReq}
          onEdit={onEdit}
          onAccept={onAccept}
          onPricing={onPricing}
          onReject={onReject}
          onReturn={onReturn}
          onResubmit={onResubmit}
          onDelete={onDelete}
          onMarkClosed={onMarkClosed}
          onManageOptions={onManageOptions}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>
    </>
  );
};
