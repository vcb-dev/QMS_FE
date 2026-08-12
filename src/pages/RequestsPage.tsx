import React, { useState } from 'react';
import type { Material, ProductCategory, QuoteRequest, Role, User } from '../types';
import { FilterBar } from '../components/FilterBar';
import { QuoteTable } from '../components/QuoteTable';
import { Pagination } from '../components/Pagination';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RequestsPageProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  currentRole: Role;
  currentUser: User;
  statusSubFilter: string;
  setStatusSubFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  materialFilter: string;
  setMaterialFilter: (v: string) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  timeRangeFilter: string;
  setTimeRangeFilter: (v: string) => void;
  startDateFilter: string;
  setStartDateFilter: (v: string) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  totalRecords: number;
  totalPages: number;
  scopeFilter: string;
  setScopeFilter: (v: string) => void;
  onSelectReq: (id: string) => void;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn: (id: string) => void;
  onOpenCreate: () => void;
  onResetFilters: () => void;
  selectedId?: string | null;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({
  requests,
  categories,
  materials,
  currentRole,
  currentUser,
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
  onOpenCreate,
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
        {(currentRole === 'SALE' || currentRole === 'ADMIN') && (
          <button
            className="primary-action"
            onClick={onOpenCreate}
            style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={18} /> Tạo Yêu Cầu Báo Giá
          </button>
        )}
      </div>

      <FilterBar
        currentTab={currentFilter}
        tabLabel="Danh Sách Yêu Cầu Báo Giá"
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
        categories={categories}
        materials={materials}
        onResetFilters={onResetFilters}
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
