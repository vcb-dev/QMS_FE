import { useState } from 'react';
import type { Role, User } from './types';
import { getStoredUser, logoutApi } from './services/api';
import { useQuoteRequests } from './hooks/useQuoteRequests';

import { PlusCircle } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import { DashboardView } from './components/DashboardView';
import { QuoteTable } from './components/QuoteTable';
import { QuoteDetailView } from './components/QuoteDetailView';
import { CreateModal } from './components/CreateModal';
import { PricingModal } from './components/PricingModal';
import { RejectModal } from './components/RejectModal';
import { ReturnModal } from './components/ReturnModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Pagination } from './components/Pagination';
import { PricingCalculatorView } from './components/PricingCalculatorView';
import { ProductLibraryView } from './components/ProductLibraryView';
import './index.css';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [currentRole, setCurrentRole] = useState<Role>(getStoredUser()?.role || 'SALE');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [previousFilter, setPreviousFilter] = useState<string>('ALL');

  const {
    requests,
    categories,
    materials,
    customers,
    selectedId,
    setSelectedId,
    selectedReq,
    currentFilter,
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
    counts,
    loading,
    loadingMessage,
    isCreateOpen,
    setIsCreateOpen,
    editingReq,
    calculatorData,
    pricingReqId,
    setPricingReqId,
    rejectReqId,
    setRejectReqId,
    returnReqId,
    setReturnReqId,
    handleTabChange,
    handleResetFilters,
    handleOpenCreate,
    handleOpenEdit,
    handleCreateOrUpdateSubmit,
    handleAccept,
    handlePricingSubmit,
    handleConfirmDirectQuote,
    handleSelectOption,
    handleRejectSubmit,
    handleReturnSubmit,
    handleResubmitDirect,
  } = useQuoteRequests(currentUser, currentRole);

  const handleOpenDetail = (id: string) => {
    if (currentFilter !== 'DETAIL') {
      setPreviousFilter(currentFilter);
    }
    setSelectedId(id);
    handleTabChange('DETAIL');
  };

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentRole(user.role);
        }}
      />
    );
  }

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
  };

  const getTabLabel = (filter: string) => {
    switch (filter) {
      case 'MY_REQ':
        return 'Yêu Cầu Của Tôi';
      case 'YC_MOI':
        return 'Yêu Cầu Mới';
      case 'DANG_XLY':
        return 'Đang Xử Lý';
      case 'NEED_MORE_INFO':
        return 'Cần Bổ Sung Thông Tin';
      case 'XONG':
        return 'Đã Báo Giá';
      case 'TU_CHOI':
        return 'Bị Từ Chối';
      case 'LIBRARY':
        return 'Thư Viện Sản Phẩm';
      case 'CALCULATOR':
        return 'Máy Tính Giá';
      case 'DETAIL':
        return 'Chi Tiết Báo Giá';
      default:
        return 'Tất Cả Yêu Cầu';
    }
  };

  return (
    <div className={`mac-window ${currentRole === 'PRICING' ? 'pricing-mode-active' : ''}`} style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        currentFilter={currentFilter}
        onFilterChange={handleTabChange}
        counts={counts}
        user={currentUser}
        currentRole={currentRole}
        onOpenCreate={handleOpenCreate}
        isOpen={isSidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
        <Header
          user={currentUser}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenCreateModal={handleOpenCreate}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="content page-transition" key={`${currentFilter}-${searchTerm}-${categoryFilter}`} style={{ flex: 1, overflowY: 'auto' }}>
          {currentFilter === 'DETAIL' ? (
            <QuoteDetailView
              selectedReq={selectedReq}
              currentRole={currentRole}
              currentUser={currentUser}
              onBack={() => handleTabChange(previousFilter || 'ALL')}
              onEdit={handleOpenEdit}
              onAccept={handleAccept}
              onPricing={(id) => setPricingReqId(id)}
              onReject={(id) => setRejectReqId(id)}
              onReturn={(id) => setReturnReqId(id)}
              onResubmit={handleResubmitDirect}
              onSelectOption={handleSelectOption}
              onConfirmDirectPrice={handleConfirmDirectQuote}
            />
          ) : currentFilter === 'CALCULATOR' ? (
            <PricingCalculatorView
              currentRole={currentRole}
              onApplyToNewRequest={handleOpenCreate}
            />
          ) : currentFilter === 'LIBRARY' ? (
            <ProductLibraryView
              requests={requests}
              categories={categories}
              materials={materials}
              onSelectReq={handleOpenDetail}
              selectedId={selectedReq?.id || selectedId}
              totalCount={counts.xong}
            />
          ) : currentFilter === 'ALL' &&
            searchTerm === '' &&
            categoryFilter === 'ALL' &&
            materialFilter === 'ALL' &&
            ownerFilter === 'ALL' ? (
            <DashboardView
              requests={requests}
              counts={counts}
              currentRole={currentRole}
              onSelectReq={handleOpenDetail}
              onViewAll={() => handleTabChange('ALL_LIST')}
              onOpenLibrary={() => handleTabChange('LIBRARY')}
              onOpenCreateModal={handleOpenCreate}
              onFilterChange={handleTabChange}
            />
          ) : (
            <>
              <div className="view-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="eyebrow">Quản Lý Hỏi Giá & Báo Giá</span>
                  <h1>Danh Sách Yêu Cầu Báo Giá</h1>
                </div>
                {(currentRole === 'SALE' || currentRole === 'ADMIN') && (
                  <button className="primary-action" onClick={handleOpenCreate} style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <PlusCircle size={18} /> Tạo Yêu Cầu Báo Giá
                  </button>
                )}
              </div>

              <FilterBar
                currentTab={currentFilter}
                tabLabel={getTabLabel(currentFilter)}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusSubFilter={statusSubFilter}
                onStatusSubFilterChange={(st) => {
                  setStatusSubFilter(st);
                  setCurrentPage(1);
                }}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={(cat) => {
                  setCategoryFilter(cat);
                  setCurrentPage(1);
                }}
                materialFilter={materialFilter}
                onMaterialFilterChange={(mat) => {
                  setMaterialFilter(mat);
                  setCurrentPage(1);
                }}
                ownerFilter={ownerFilter}
                onOwnerFilterChange={(own) => {
                  setOwnerFilter(own);
                  setCurrentPage(1);
                }}
                timeRangeFilter={timeRangeFilter}
                onTimeRangeFilterChange={(tr) => {
                  setTimeRangeFilter(tr);
                  setCurrentPage(1);
                }}
                startDateFilter={startDateFilter}
                onStartDateChange={(sd) => {
                  setStartDateFilter(sd);
                  setCurrentPage(1);
                }}
                categories={categories}
                materials={materials}
                onResetFilters={handleResetFilters}
                totalFiltered={totalRecords}
                totalTabItems={totalRecords}
              />

              <div className="surface">
                <QuoteTable
                  requests={requests}
                  selectedId={selectedReq?.id || selectedId}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  onSelect={handleOpenDetail}
                  onEdit={handleOpenEdit}
                  onAccept={handleAccept}
                  onPricing={(id) => setPricingReqId(id)}
                  onReject={(id) => setRejectReqId(id)}
                  onReturn={(id) => setReturnReqId(id)}
                />

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalRecords}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <CreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateOrUpdateSubmit}
        categories={categories}
        materials={materials}
        customers={customers}
        onRefreshCustomers={async () => {}}
        editingReq={editingReq}
        saleName={currentUser.name}
        calculatorData={calculatorData}
      />

      <PricingModal
        isOpen={pricingReqId !== null}
        onClose={() => setPricingReqId(null)}
        onSubmit={handlePricingSubmit}
        selectedReq={selectedReq}
      />

      <RejectModal
        isOpen={rejectReqId !== null}
        onClose={() => setRejectReqId(null)}
        onSubmit={handleRejectSubmit}
      />

      <ReturnModal
        isOpen={returnReqId !== null}
        onClose={() => setReturnReqId(null)}
        onSubmit={handleReturnSubmit}
      />

      <LoadingOverlay show={loading} message={loadingMessage} />
    </div>
  );
}

export default App;
