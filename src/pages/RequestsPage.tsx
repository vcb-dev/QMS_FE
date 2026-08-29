import React, { useState } from 'react';
import type { RequestsPageProps } from '../types';
import { FilterBar } from '../components/FilterBar';
import { QuoteTable } from '../components/QuoteTable';
import { Pagination } from '../components/Pagination';
import { Download, PlusCircle } from 'lucide-react';
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
  onQuoteNow,
  onPricing,
  onReject,
  onReturn,
  onResubmit,
  onMarkClosed,
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
      <div className="view-heading">
        <h1>Danh Sách Yêu Cầu Báo Giá</h1>
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
        totalFiltered={totalRecords}
        totalTabItems={totalRecords}
        includeLocked={includeLocked}
        onIncludeLockedChange={currentRole === 'ADMIN' && setIncludeLocked
          ? (v) => { setIncludeLocked(v); setCurrentPage(1); }
          : undefined}
        actions={
          <>
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
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Xuất danh sách đang lọc ra Excel"
              >
                <Download size={13} /> Xuất Excel
              </button>
            )}
          </>
        }
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
          onQuoteNow={onQuoteNow}
          onPricing={onPricing}
          onReject={onReject}
          onReturn={onReturn}
          onResubmit={onResubmit}
          onMarkClosed={onMarkClosed}
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
