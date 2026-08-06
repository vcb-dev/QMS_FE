import { useState, useEffect } from 'react';
import type { Customer, Material, ProductCategory, QuoteOption, QuoteRequest, Role, User } from './types';
import {
  fetchQuoteRequests,
  fetchMasterData,
  createQuoteRequest,
  updateQuoteRequest,
  acceptQuoteRequest,
  completeQuoteRequest,
  selectQuoteOption,
  rejectQuoteRequest,
  returnQuoteRequest,
  resubmitQuoteRequest,
  getStoredUser,
  clearSession,
} from './services/api';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import { DashboardView } from './components/DashboardView';
import { QuoteTable } from './components/QuoteTable';
import { Inspector } from './components/Inspector';
import { CreateModal } from './components/CreateModal';
import { PricingModal } from './components/PricingModal';
import { PricingCalculatorModal } from './components/PricingCalculatorModal';
import { PricingCalculatorView } from './components/PricingCalculatorView';
import { RejectModal } from './components/RejectModal';
import { ReturnModal } from './components/ReturnModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Pagination } from './components/Pagination';
import './index.css';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [currentRole, setCurrentRole] = useState<Role>(getStoredUser()?.role || 'SALE');

  // Multi-Filter State
  const [currentFilter, setCurrentFilter] = useState<string>('ALL'); // Active Tab
  const [statusSubFilter, setStatusSubFilter] = useState<string>('ALL'); // Sub-filter by status
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Sidebar Toggle State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<QuoteRequest | null>(null);
  const [pricingReqId, setPricingReqId] = useState<string | null>(null);
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [returnReqId, setReturnReqId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu...');

  // Load quote requests & master data for filtering
  const loadData = async (showLoading = true) => {
    if (!currentUser) return;
    try {
      if (showLoading) setLoading(true);
      const [quoteRes, masterRes] = await Promise.all([
        fetchQuoteRequests({ search: searchTerm }),
        fetchMasterData(),
      ]);

      const items: QuoteRequest[] = quoteRes.data || [];
      setRequests(items);
      setCategories(masterRes.categories || []);
      setMaterials(masterRes.materials || []);
      setCustomers(masterRes.customers || []);

      if (items.length > 0) {
        setSelectedId((prevId) => {
          if (prevId && items.some((item) => item.id === prevId || item.code === prevId)) {
            return prevId;
          }
          return items[0].id;
        });
      }
    } catch (err) {
      console.error('Error loading data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCustomers = async () => {
    const { customers: custs } = await fetchMasterData();
    setCustomers(custs);
  };

  useEffect(() => {
    if (currentUser) {
      loadData(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setCurrentPage(1);
    const timer = setTimeout(() => {
      loadData(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setRequests([]);
  };

  // Automatically sync selectedId when page, tab, or active filters change
  useEffect(() => {
    if (!currentUser) return;
    if (paginatedRequests.length > 0) {
      const isSelectedInPage = paginatedRequests.some(
        (r) => r.id === selectedId || r.code === selectedId
      );
      if (!isSelectedInPage) {
        setSelectedId(paginatedRequests[0].id);
      }
    } else if (filteredRequests.length > 0) {
      const isSelectedInFiltered = filteredRequests.some(
        (r) => r.id === selectedId || r.code === selectedId
      );
      if (!isSelectedInFiltered) {
        setSelectedId(filteredRequests[0].id);
      }
    }
  }, [
    currentUser,
    currentPage,
    pageSize,
    currentFilter,
    statusSubFilter,
    categoryFilter,
    materialFilter,
    ownerFilter,
  ]);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isMyRecord = (r: QuoteRequest) => {
    if (currentRole === 'PRICING') {
      return r.pricer?.id === currentUser.id || r.pricer?.email === currentUser.email;
    }
    return (
      r.createdBy?.id === currentUser.id ||
      r.requester?.id === currentUser.id ||
      r.requester?.email === currentUser.email
    );
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

  // 1. Base List for the active Tab
  const tabBaseRequests = requests.filter((r) => {
    if (currentFilter === 'MY_REQ') return isMyRecord(r);
    if (currentFilter === 'YC_MOI') return r.status === 'YC_MOI';
    if (currentFilter === 'DANG_XLY') return r.status === 'DANG_XLY';
    if (currentFilter === 'NEED_MORE_INFO') return r.status === 'NEED_MORE_INFO';
    if (currentFilter === 'XONG' || currentFilter === 'LIBRARY') return r.status === 'XONG';
    if (currentFilter === 'TU_CHOI') return r.status === 'TU_CHOI';
    return true; // 'ALL'
  });

  // 2. Comprehensive Secondary Sub-Filters WITHIN the active Tab
  const filteredRequests = tabBaseRequests.filter((r) => {
    // Secondary Status Sub-Filter
    if (statusSubFilter !== 'ALL' && r.status !== statusSubFilter) return false;

    // Owner Sub-Filter
    if (ownerFilter === 'MY_REQ' && !isMyRecord(r)) return false;

    // Category Sub-Filter
    if (categoryFilter !== 'ALL' && r.category?.id !== categoryFilter) return false;

    // Material Sub-Filter
    if (materialFilter !== 'ALL') {
      const hasMat = r.materials
        ? r.materials.some((m) => m.id === materialFilter)
        : r.material?.id === materialFilter;
      if (!hasMat) return false;
    }

    return true;
  });

  // Calculate Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleTabChange = (filter: string) => {
    setCurrentFilter(filter);
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setCurrentPage(1);
  };



  const selectedReq =
    paginatedRequests.find((r) => r.id === selectedId || r.code === selectedId) ||
    filteredRequests.find((r) => r.id === selectedId || r.code === selectedId) ||
    paginatedRequests[0] ||
    filteredRequests[0] ||
    requests[0] ||
    null;

  const counts = {
    total: requests.length,
    myReq: requests.filter(isMyRecord).length,
    ycMoi: requests.filter((r) => r.status === 'YC_MOI').length,
    dangXly: requests.filter((r) => r.status === 'DANG_XLY').length,
    needMoreInfo: requests.filter((r) => r.status === 'NEED_MORE_INFO').length,
    xong: requests.filter((r) => r.status === 'XONG').length,
    tuChoi: requests.filter((r) => r.status === 'TU_CHOI').length,
  };

  const handleOpenCreate = () => {
    setEditingReq(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (req: QuoteRequest) => {
    setEditingReq(req);
    setIsCreateOpen(true);
  };

  const handleCreateOrUpdateSubmit = async (payload: any) => {
    setLoadingMessage('Đang lưu yêu cầu...');
    setLoading(true);
    try {
      if (editingReq) {
        let updated = await updateQuoteRequest(editingReq.id, payload);
        if (editingReq.status === 'NEED_MORE_INFO') {
          updated = await resubmitQuoteRequest(editingReq.id);
        }
        setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedId(updated.id);
      } else {
        const created = await createQuoteRequest(payload);
        setRequests((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo hoặc cập nhật yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  // Safe Optimistic Accept with Automatic Rollback
  const handleAccept = async (id: string, version: number) => {
    const snapshot = [...requests];

    setRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'DANG_XLY', pricer: currentUser } : item
      )
    );

    try {
      const updated = await acceptQuoteRequest(id, version);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Tiếp Nhận: ${err.message || 'Không thể tiếp nhận yêu cầu này'}`);
    }
  };

  // Safe Optimistic Pricing with Multi-Options support
  const handlePricingSubmit = async (price: number, vat: number, options?: QuoteOption[]) => {
    if (!pricingReqId) return;
    const reqId = pricingReqId;
    const snapshot = [...requests];
    setPricingReqId(null);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === reqId
          ? { ...item, status: 'XONG', quotedPrice: price, vat, options, quotedDate: new Date().toISOString() }
          : item
      )
    );

    try {
      const updated = await completeQuoteRequest(reqId, price, vat, options);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedId(updated.id);
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Nhập Báo Giá: ${err.message || 'Không thể lưu báo giá'}`);
    }
  };

  // Sale selects a specific pricing option
  const handleSelectOption = async (reqId: string, optionId: string) => {
    const snapshot = [...requests];
    try {
      const updated = await selectQuoteOption(reqId, optionId);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedId(updated.id);
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Chốt Phương Án: ${err.message || 'Không thể chốt phương án này'}`);
    }
  };

  // Safe Optimistic Reject with Automatic Rollback
  const handleRejectSubmit = async (reason: string) => {
    if (!rejectReqId) return;
    const reqId = rejectReqId;
    const snapshot = [...requests];
    setRejectReqId(null);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === reqId ? { ...item, status: 'TU_CHOI', rejectReason: reason } : item
      )
    );

    try {
      const updated = await rejectQuoteRequest(reqId, reason);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Từ Chối Yêu Cầu: ${err.message || 'Không thể từ chối yêu cầu này'}`);
    }
  };

  // Safe Optimistic Return to Sale for More Info
  const handleReturnSubmit = async (reason: string) => {
    if (!returnReqId) return;
    const reqId = returnReqId;
    const snapshot = [...requests];
    setReturnReqId(null);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === reqId ? { ...item, status: 'NEED_MORE_INFO', returnReason: reason } : item
      )
    );

    try {
      const updated = await returnQuoteRequest(reqId, reason);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Trả Lại Yêu Cầu: ${err.message || 'Không thể trả lại yêu cầu này'}`);
    }
  };

  // Sale Resubmit Request Back to Pricing
  const handleResubmit = async (id: string) => {
    const snapshot = [...requests];

    setRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'YC_MOI' } : item
      )
    );

    try {
      const updated = await resubmitQuoteRequest(id);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Gửi Lại Yêu Cầu: ${err.message || 'Không thể gửi lại yêu cầu'}`);
    }
  };

  return (
    <div className={`mac-window ${currentRole === 'PRICING' ? 'pricing-mode-active' : ''}`}>
      <Header
        user={currentUser}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenCreateModal={handleOpenCreate}
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
              onApplyToNewRequest={() => {
                handleOpenCreate();
              }}
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
            />
          ) : (
            <>
              <div className="view-heading">
                <div>
                  <span className="eyebrow">Quản Lý Hỏi Giá & Báo Giá</span>
                  <h1>Danh Sách Yêu Cầu Báo Giá</h1>
                </div>
              </div>

              {/* Multi-Filter Controls Bar Above Table */}
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
                totalFiltered={filteredRequests.length}
                totalTabItems={tabBaseRequests.length}
              />

              <div className="surface">
                <QuoteTable
                  requests={paginatedRequests}
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
                  totalItems={filteredRequests.length}
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
            onEdit={handleOpenEdit}
            onAccept={handleAccept}
            onPricing={(id) => setPricingReqId(id)}
            onReject={(id) => setRejectReqId(id)}
            onReturn={(id) => setReturnReqId(id)}
            onResubmit={handleResubmit}
            onSelectOption={handleSelectOption}
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
        onRefreshCustomers={handleRefreshCustomers}
        editingReq={editingReq}
        saleName={currentUser.name}
      />

      <PricingModal
        isOpen={!!pricingReqId}
        onClose={() => setPricingReqId(null)}
        onSubmit={handlePricingSubmit}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        selectedReq={requests.find((r) => r.id === pricingReqId) || selectedReq}
      />

      <PricingCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        currentRole={currentRole}
      />

      <RejectModal
        isOpen={!!rejectReqId}
        onClose={() => setRejectReqId(null)}
        onSubmit={handleRejectSubmit}
      />

      <ReturnModal
        isOpen={!!returnReqId}
        onClose={() => setReturnReqId(null)}
        onSubmit={handleReturnSubmit}
      />

      <LoadingOverlay isLoading={loading} message={loadingMessage} />
    </div>
  );
}

export default App;
