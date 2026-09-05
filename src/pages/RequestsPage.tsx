import React, { useState } from 'react';
import type { RequestsPageProps } from '../types';
import { FilterBar } from '../components/FilterBar';
import { QuoteTable } from '../components/QuoteTable';
import { Pagination } from '../components/Pagination';
import { Download, PlusCircle, FileText } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-extrabold text-[#0f172a] mt-[2px] flex items-center gap-[10px]">
          <FileText size={20} /> Danh Sách Yêu Cầu Báo Giá
        </h1>
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
                className="bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] py-[8px] px-[18px] rounded-[10px] font-extrabold text-[13px] cursor-pointer inline-flex items-center gap-[6px] transition-[background_0.15s,border-color_0.15s] hover:bg-[#e2e8f0] hover:border-[#94a3b8]"
                // Gọi trực tiếp onClick={onOpenCreate} sẽ vô tình truyền thẳng SyntheticEvent của
                // click vào làm calcData (object luôn truthy) — khiến CreateModal tưởng đang tạo đơn
                // từ máy tính giá, khóa nhầm phần chọn đá dù đây là luồng tạo đơn thường.
                onClick={() => onOpenCreate()}
              >
                <PlusCircle size={18} /> Tạo Yêu Cầu Báo Giá
              </button>
            )}
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="inline-flex items-center gap-[6px] bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] rounded-[8px] py-[8px] px-[14px] text-[13px] font-bold cursor-pointer"
                title="Xuất danh sách đang lọc ra Excel"
              >
                <Download size={13} /> Xuất Excel
              </button>
            )}
          </>
        }
      />

      <div className="bg-white border border-border rounded-[14px] p-[12px] shadow-sm">
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
