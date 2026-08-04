import { useState, useEffect } from 'react';
import type { Customer, Material, ProductCategory, QuoteRequest, Role, User } from './types';
import {
  fetchQuoteRequests,
  fetchMasterData,
  createQuoteRequest,
  updateQuoteRequest,
  acceptQuoteRequest,
  completeQuoteRequest,
  rejectQuoteRequest,
  getStoredUser,
  clearSession,
} from './services/api';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricCards } from './components/MetricCards';
import { QuoteTable } from './components/QuoteTable';
import { Inspector } from './components/Inspector';
import { CreateModal } from './components/CreateModal';
import { PricingModal } from './components/PricingModal';
import { RejectModal } from './components/RejectModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Pagination } from './components/Pagination';
import './index.css';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [currentRole, setCurrentRole] = useState<Role>(getStoredUser()?.role || 'SALE');
  const [currentFilter, setCurrentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<QuoteRequest | null>(null);
  const [pricingReqId, setPricingReqId] = useState<string | null>(null);
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu...');

  // Load ONLY quote requests for viewing/browsing
  const loadData = async (showLoading = true) => {
    if (!currentUser) return;
    try {
      if (showLoading) setLoading(true);
      const res = await fetchQuoteRequests({ search: searchTerm });
      const items: QuoteRequest[] = res.data || [];
      setRequests(items);

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

  // Load Master Data ONLY when creating/editing modal is opened!
  const loadMasterDataIfNeeded = async () => {
    if (categories.length === 0 || materials.length === 0 || customers.length === 0) {
      try {
        setLoadingMessage('Đang tải danh mục & chất liệu...');
        setLoading(true);
        const { categories: cats, materials: mats, customers: custs } = await fetchMasterData();
        setCategories(cats);
        setMaterials(mats);
        setCustomers(custs);
      } catch (err) {
        console.error('Error loading master data:', err);
      } finally {
        setLoading(false);
      }
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

  const filteredRequests = requests.filter((r) => {
    if (currentFilter === 'MY_REQ' && !isMyRecord(r)) return false;
    if (currentFilter === 'YC_MOI' && r.status !== 'YC_MOI') return false;
    if (currentFilter === 'DANG_XLY' && r.status !== 'DANG_XLY') return false;
    if (currentFilter === 'XONG' && r.status !== 'XONG') return false;
    if (currentFilter === 'TU_CHOI' && r.status !== 'TU_CHOI') return false;
    return true;
  });

  // Calculate Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    setCurrentPage(1);
    const newFiltered = requests.filter((r) => {
      if (filter === 'MY_REQ' && !isMyRecord(r)) return false;
      if (filter === 'YC_MOI' && r.status !== 'YC_MOI') return false;
      if (filter === 'DANG_XLY' && r.status !== 'DANG_XLY') return false;
      if (filter === 'XONG' && r.status !== 'XONG') return false;
      if (filter === 'TU_CHOI' && r.status !== 'TU_CHOI') return false;
      return true;
    });

    if (newFiltered.length > 0) {
      setSelectedId(newFiltered[0].id);
    }
  };

  const selectedReq =
    filteredRequests.find((r) => r.id === selectedId || r.code === selectedId) ||
    requests.find((r) => r.id === selectedId || r.code === selectedId) ||
    filteredRequests[0] ||
    requests[0] ||
    null;

  const counts = {
    total: requests.length,
    myReq: requests.filter(isMyRecord).length,
    ycMoi: requests.filter((r) => r.status === 'YC_MOI').length,
    dangXly: requests.filter((r) => r.status === 'DANG_XLY').length,
    xong: requests.filter((r) => r.status === 'XONG').length,
    tuChoi: requests.filter((r) => r.status === 'TU_CHOI').length,
  };

  const handleOpenCreate = async () => {
    await loadMasterDataIfNeeded();
    setEditingReq(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = async (req: QuoteRequest) => {
    await loadMasterDataIfNeeded();
    setEditingReq(req);
    setIsCreateOpen(true);
  };

  const handleCreateOrUpdateSubmit = async (payload: any) => {
    setLoadingMessage('Đang lưu yêu cầu...');
    setLoading(true);
    try {
      if (editingReq) {
        const updated = await updateQuoteRequest(editingReq.id, payload);
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

  // Safe Optimistic Pricing with Automatic Rollback
  const handlePricingSubmit = async (price: number, vat: number) => {
    if (!pricingReqId) return;
    const reqId = pricingReqId;
    const snapshot = [...requests];
    setPricingReqId(null);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === reqId
          ? { ...item, status: 'XONG', quotedPrice: price, vat, quotedDate: new Date().toISOString() }
          : item
      )
    );

    try {
      const updated = await completeQuoteRequest(reqId, price, vat);
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setRequests(snapshot);
      alert(`⚠️ Lỗi Nhập Báo Giá: ${err.message || 'Không thể lưu báo giá'}`);
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

  return (
    <div className={`mac-window ${currentRole === 'PRICING' ? 'pricing-mode-active' : ''}`}>
      <Header
        user={currentUser}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenCreateModal={handleOpenCreate}
        onLogout={handleLogout}
      />

      <div className="workspace">
        <Sidebar
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          counts={counts}
          user={currentUser}
          currentRole={currentRole}
        />

        <main className="content">
          <div className="view-heading">
            <div>
              <span className="eyebrow">Bảng Điều Khiển</span>
              <h1>Danh Sách Yêu Cầu Báo Giá Chế Tác</h1>
            </div>
          </div>

          <MetricCards counts={counts} currentFilter={currentFilter} onFilterChange={handleFilterChange} />

          <div className="surface">
            <div className="section-heading">
              <h2>Danh Sách Chi Tiết Yêu Cầu (Truy vấn Trực tiếp từ Supabase Database)</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {loading ? 'Đang tải dữ liệu từ API...' : `Hiển thị ${filteredRequests.length} trên tổng số ${requests.length} bản ghi`}
              </span>
            </div>

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
        </main>

        <Inspector
          selectedReq={selectedReq}
          currentRole={currentRole}
          currentUser={currentUser}
          onEdit={handleOpenEdit}
          onAccept={handleAccept}
          onPricing={(id) => setPricingReqId(id)}
          onReject={(id) => setRejectReqId(id)}
        />
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
      />

      <RejectModal
        isOpen={!!rejectReqId}
        onClose={() => setRejectReqId(null)}
        onSubmit={handleRejectSubmit}
      />

      <LoadingOverlay isLoading={loading} message={loadingMessage} />
    </div>
  );
}

export default App;
