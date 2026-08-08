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
import { Inspector } from './components/Inspector';
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
    handleSelectOption,
    handleRejectSubmit,
    handleReturnSubmit,
    handleResubmitDirect,
  } = useQuoteRequests(currentUser);

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
      default:
        return 'Tất Cả Yêu Cầu';
    }
  };

  return (
    <div className={`mac-window ${currentRole === 'PRICING' ? 'pricing-mode-active' : ''}`}>
      <Header
        user={currentUser}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="workspace">
        <Sidebar
          currentFilter={currentFilter}
          onFilterChange={handleTabChange}
          counts={counts}
          user={currentUser}
          currentRole={currentRole}
          onOpenCreate={handleOpenCreate}
          isOpen={isSidebarOpen}
        />

        <main className="content page-transition" key={`${currentFilter}-${searchTerm}-${categoryFilter}`}>
          {currentFilter === 'CALCULATOR' ? (
            <PricingCalculatorView
              currentRole={currentRole}
              onApplyToNewRequest={handleOpenCreate}
            />
          ) : currentFilter === 'LIBRARY' ? (
            <ProductLibraryView
              requests={requests}
              categories={categories}
              materials={materials}
              onSelectReq={(id) => setSelectedId(id)}
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
              onSelectReq={(id) => setSelectedId(id)}
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
                  onSelect={(id) => setSelectedId(id)}
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

        {currentFilter !== 'CALCULATOR' && (
          <Inspector
            selectedReq={selectedReq}
            currentRole={currentRole}
            currentUser={currentUser}
            onAccept={handleAccept}
            onPricing={(id) => setPricingReqId(id)}
            onReject={(id) => setRejectReqId(id)}
            onReturn={(id) => setReturnReqId(id)}
            onResubmit={handleResubmitDirect}
            onSelectOption={handleSelectOption}
            onEdit={handleOpenEdit}
          />
        )}
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
