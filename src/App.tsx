import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { connectRealtimeSocket } from './services/realtimeSocket';
import { REALTIME_EVENTS } from './constants/realtimeEvents';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthGate';
import { useQuoteRequests } from './hooks/useQuoteRequests';
import type { Role, User } from './types';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NavProgressBar } from './components/NavProgressBar';
import { Toast } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';

import { LoginPage } from './pages/LoginPage';

// Global modals: lazy-loaded và chỉ mount khi mở, tránh chạy hook/effect của cả 7 modal
// trên mỗi lần AppShell render khi người dùng chỉ đang duyệt bảng danh sách.
const CreateModal = lazy(() => import('./components/CreateModal').then((m) => ({ default: m.CreateModal })));
const PricingModal = lazy(() => import('./components/PricingModal').then((m) => ({ default: m.PricingModal })));
const RejectModal = lazy(() => import('./components/RejectModal').then((m) => ({ default: m.RejectModal })));
const ReturnModal = lazy(() => import('./components/ReturnModal').then((m) => ({ default: m.ReturnModal })));
const MarkClosedModal = lazy(() => import('./components/MarkClosedModal').then((m) => ({ default: m.MarkClosedModal })));
const ManageOptionsModal = lazy(() => import('./components/ManageOptionsModal').then((m) => ({ default: m.ManageOptionsModal })));
const ExportModal = lazy(() => import('./components/ExportModal').then((m) => ({ default: m.ExportModal })));

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const PricingConfigPage = lazy(() => import('./pages/PricingConfigPage').then((m) => ({ default: m.PricingConfigPage })));
const NotificationConfigPage = lazy(() => import('./pages/NotificationConfigPage').then((m) => ({ default: m.NotificationConfigPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

import './index.css';

// ─── Layout Shell (chỉ render khi đã đăng nhập) ─────────────────────────────
interface AppShellProps {
  currentUser: User;
  currentRole: Role;
  handleLogout: () => Promise<void>;
}

function AppShell({ currentUser, currentRole, handleLogout }: AppShellProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  // SALE mặc định chỉ xem yêu cầu của mình, role khác xem tất cả
  const [scopeFilter, setScopeFilter] = useState(currentRole === 'SALE' ? 'MY_REQ' : 'ALL');

  const navigate = useNavigate();
  const location = useLocation();

  // Chỉ Tổng Quan (/) và Danh Sách Yêu Cầu (/requests, /requests/:id) mới thực sự đọc `requests[]`.
  // Trang khác chỉ cần `counts` cho Sidebar -> useQuoteRequests kéo bản nhẹ, không hydrate cả trang.
  const listDataEnabled = location.pathname === '/' || location.pathname.startsWith('/requests');

  const {
    requests, categories, materials, selectedId, setSelectedId,
    selectedReq, pricingReq, statusSubFilter, setStatusSubFilter, searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter, materialFilter, setMaterialFilter,
    ownerFilter, setOwnerFilter, timeRangeFilter, setTimeRangeFilter,
    startDateFilter, setStartDateFilter, endDateFilter, setEndDateFilter, currentPage, setCurrentPage,
    includeLocked, setIncludeLocked,
    pageSize, setPageSize, totalRecords, totalPages, counts,
    loading, loadingMessage,
    listLoading, toastMessage, setToastMessage, isCreateOpen, setIsCreateOpen, editingReq,
    calculatorData, pricingReqId, setPricingReqId, rejectReqId, setRejectReqId,
    returnReqId, setReturnReqId, closeOptionReqId, setCloseOptionReqId,
    manageOptionsReqId, setManageOptionsReqId, handleTabChange, handleResetFilters,
    handleOpenCreate, handleOpenEdit, handleCreateOrUpdateSubmit, handleDeleteRequest, handleAccept,
    handleQuoteNow,
    handlePricingSubmit,
    handleRejectSubmit, handleReturnSubmit, handleResubmitDirect,
    handleMarkClosedClick, handleCloseOptionSubmit,
    handleDeleteOption,
    refreshQuietly,
  } = useQuoteRequests(currentUser, currentRole, listDataEnabled);

  // Chỉ tính lại khi requests hoặc id popup đang mở thay đổi — tránh find()+filter() mỗi lần
  // AppShell render (VD gõ tìm kiếm, đổi trang) dù 2 popup này thường đang đóng.
  const closeOptionTarget = useMemo(
    () => requests.find((r) => r.id === closeOptionReqId),
    [requests, closeOptionReqId],
  );
  const closeOptionPricedOptions = useMemo(
    () => (closeOptionTarget?.options || []).filter((o) => o.quotedPrice != null),
    [closeOptionTarget],
  );
  const manageOptionsTarget = useMemo(
    () => requests.find((r) => r.id === manageOptionsReqId),
    [requests, manageOptionsReqId],
  );
  const manageOptionsPricedOptions = useMemo(
    () => (manageOptionsTarget?.options || []).filter((o) => o.quotedPrice != null),
    [manageOptionsTarget],
  );

  // Socket /realtime — 1 kết nối duy nhất suốt phiên đăng nhập (dùng chung cho cả Realtime trạng thái & Chat)
  const [globalSocket, setGlobalSocket] = useState<any>(null);

  useEffect(() => {
    if (!currentUser) return;
    const socket = connectRealtimeSocket();
    setGlobalSocket(socket);

    const handleStatusChanged = () => refreshQuietly();
    socket.on(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);

    return () => {
      socket.off(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);
      socket.disconnect();
      setGlobalSocket(null);
    };
  }, [currentUser?.id]);

  const getSidebarKey = () => {
    const p = location.pathname;
    if (p === '/') return 'OVERVIEW';
    if (p.startsWith('/requests')) return 'ALL';
    if (p.startsWith('/library')) return 'LIBRARY';
    if (p.startsWith('/calculator')) return 'CALCULATOR';
    if (p.startsWith('/staff')) return 'STAFF';
    if (p.startsWith('/customers')) return 'CUSTOMERS';
    if (p.startsWith('/pricing-config')) return 'PRICING_CONFIG';
    if (p.startsWith('/notification-config')) return 'NOTIFICATION_CONFIG';
    return 'OVERVIEW';
  };

  const handleSidebarChange = (filter: string) => {
    const map: Record<string, string> = {
      OVERVIEW: '/', ALL: '/requests', LIBRARY: '/library', CALCULATOR: '/calculator', STAFF: '/staff', CUSTOMERS: '/customers', PRICING_CONFIG: '/pricing-config', NOTIFICATION_CONFIG: '/notification-config',
    };
    navigate(map[filter] ?? '/requests');
    // Chỉ Tổng Quan (OVERVIEW) và Danh Sách Yêu Cầu (ALL) thật sự dùng requests/counts từ
    // useQuoteRequests — Thư viện/Máy tính giá/Nhân viên/Khách hàng/Cấu hình giá đều tự fetch data
    // riêng (nhận 0 prop requests/counts, xem route trong Routes bên dưới), gọi handleTabChange cho
    // mấy trang này chỉ tốn 1 query DB ngầm vô ích, không trang nào đọc kết quả.
    if (filter === 'OVERVIEW' || filter === 'ALL') {
      handleTabChange(filter);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedId(id);
    // Nếu item đã có sẵn trong danh sách đang tải (trường hợp phổ biến nhất khi bấm
    // từ 1 dòng trong bảng), chỉ cần điều hướng — không cần load lại toàn bộ danh sách.
    const alreadyLoaded = requests.some((r) => r.id === id || r.code === id);
    if (!alreadyLoaded) {
      handleTabChange('DETAIL');
    }
    navigate(`/requests/${id}`);
  };

  // "Xem thêm" từ search tổng ở Header (mục Yêu Cầu) — nhảy qua trang Danh Sách với đúng từ khóa,
  // bỏ giới hạn "chỉ đơn của tôi" (ownerFilter) để search tổng không bị bó hẹp phạm vi.
  const handleSearchRequestsFromHeader = (query: string) => {
    setSearchTerm(query);
    setOwnerFilter('ALL');
    setCurrentPage(1);
    navigate('/requests');
  };

  return (
    <div
      className={`w-screen h-screen flex flex-row overflow-hidden bg-white ${currentRole === 'ORDER' ? 'order-mode-active' : ''}`}
    >
      <Sidebar
        currentFilter={getSidebarKey()}
        onFilterChange={handleSidebarChange}
        counts={counts}
        user={currentUser!}
        currentRole={currentRole}
        onOpenCreate={handleOpenCreate}
      />

      <div className="flex-1 flex flex-col h-screen overflow-visible min-w-0">
        <Header
          user={currentUser!}
          currentRole={currentRole}
          onOpenCreateModal={handleOpenCreate}
          onLogout={handleLogout}
          onSelectReq={handleOpenDetail}
          onSearchRequests={handleSearchRequestsFromHeader}
        />

        <main className="content page-transition flex-1 overflow-y-auto p-5 flex flex-col gap-5 box-border" key={location.pathname}>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={
              <DashboardPage requests={requests} counts={counts} currentRole={currentRole}
                onSelectReq={handleOpenDetail} onOpenCreateModal={handleOpenCreate}
                onFilterStatus={(status) => { setStatusSubFilter(status); setCurrentPage(1); navigate('/requests'); }} />
            } />

            <Route path="/requests" element={
              <RequestsPage
                requests={requests} categories={categories} materials={materials}
                currentRole={currentRole} currentUser={currentUser!} counts={counts}
                statusSubFilter={statusSubFilter} setStatusSubFilter={setStatusSubFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                materialFilter={materialFilter} setMaterialFilter={setMaterialFilter}
                ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter}
                timeRangeFilter={timeRangeFilter} setTimeRangeFilter={setTimeRangeFilter}
                startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
                endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
                includeLocked={includeLocked} setIncludeLocked={setIncludeLocked}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                pageSize={pageSize} setPageSize={setPageSize}
                totalRecords={totalRecords} totalPages={totalPages}
                scopeFilter={scopeFilter}
                setScopeFilter={(sc) => {
                  setScopeFilter(sc);
                  setOwnerFilter(sc === 'MY_REQ' ? 'MY_REQ' : 'ALL');
                  setCurrentPage(1);
                }}
                onSelectReq={handleOpenDetail} onEdit={handleOpenEdit}
                onAccept={handleAccept}
                onQuoteNow={handleQuoteNow}
                onPricing={(id) => setPricingReqId(id)}
                onReject={(id) => setRejectReqId(id)}
                onReturn={(id) => setReturnReqId(id)}
                onResubmit={handleResubmitDirect}
                onDelete={handleDeleteRequest}
                onMarkClosed={handleMarkClosedClick}
                onManageOptions={(id) => setManageOptionsReqId(id)}
                onOpenCreate={handleOpenCreate}
                onOpenExport={currentRole === 'SALE' ? undefined : () => setIsExportOpen(true)}
                onResetFilters={() => { handleResetFilters(); setScopeFilter('ALL'); }}
                selectedId={selectedReq?.id || selectedId || null}
              />
            } />

            <Route path="/requests/:id" element={
              <DetailPage
                selectedReq={selectedReq} currentRole={currentRole} currentUser={currentUser!}
                socket={globalSocket}
              />
            } />

            <Route path="/library" element={
              <LibraryPage categories={categories} materials={materials}
                currentRole={currentRole}
                initialTimeRange={
                  (['ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const).includes(
                    timeRangeFilter as never,
                  )
                    ? (timeRangeFilter as 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH')
                    : 'ALL'
                }
                onSelectReq={handleOpenDetail} />
            } />

            <Route path="/calculator" element={
              <CalculatorPage currentRole={currentRole} onApplyToNewRequest={handleOpenCreate} />
            } />

            <Route path="/staff" element={
              currentRole === 'ADMIN' ? <StaffPage /> : <Navigate to="/" replace />
            } />

            <Route path="/customers" element={
              currentRole === 'ADMIN' ? <CustomersPage /> : <Navigate to="/" replace />
            } />

            <Route path="/pricing-config" element={
              currentRole === 'ORDER' || currentRole === 'ADMIN' ? <PricingConfigPage /> : <Navigate to="/" replace />
            } />

            <Route path="/notification-config" element={
              currentRole === 'ADMIN' ? <NotificationConfigPage /> : <Navigate to="/" replace />
            } />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Modals — chỉ mount khi đang mở (state !== null / true) */}
      <Suspense fallback={null}>
        {isCreateOpen && (
          <CreateModal isOpen onClose={() => setIsCreateOpen(false)}
            onSubmit={handleCreateOrUpdateSubmit} categories={categories} materials={materials}
            editingReq={editingReq}
            saleName={currentUser!.name} calculatorData={calculatorData} />
        )}

        {pricingReqId !== null && (
          <PricingModal isOpen onClose={() => setPricingReqId(null)}
            onSubmit={handlePricingSubmit} selectedReq={pricingReq} currentRole={currentRole} materials={materials} />
        )}

        {rejectReqId !== null && (
          <RejectModal isOpen onClose={() => setRejectReqId(null)}
            onSubmit={handleRejectSubmit} />
        )}

        {returnReqId !== null && (
          <ReturnModal isOpen onClose={() => setReturnReqId(null)}
            onSubmit={handleReturnSubmit} />
        )}

        {closeOptionReqId !== null && (
          <MarkClosedModal
            isOpen
            reqCode={closeOptionTarget?.code}
            options={closeOptionPricedOptions}
            onClose={() => setCloseOptionReqId(null)}
            onSubmit={handleCloseOptionSubmit}
          />
        )}

        {manageOptionsReqId !== null && (
          <ManageOptionsModal
            isOpen
            reqCode={manageOptionsTarget?.code}
            options={manageOptionsPricedOptions}
            onClose={() => setManageOptionsReqId(null)}
            onDelete={(optionId) => manageOptionsReqId && handleDeleteOption(manageOptionsReqId, optionId)}
          />
        )}

        {isExportOpen && currentRole !== 'SALE' && (
          <ExportModal isOpen onClose={() => setIsExportOpen(false)}
            categories={categories} materials={materials}
            initialFilters={{
              status: statusSubFilter,
              categoryId: categoryFilter,
              materialId: materialFilter,
              ownerId: ownerFilter === 'MY_REQ' ? currentUser.id : undefined,
              timeRange: timeRangeFilter,
              startDate: startDateFilter,
              endDate: endDateFilter,
              search: searchTerm,
            }} />
        )}
      </Suspense>

      {loading && <LoadingOverlay message={loadingMessage} />}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <NavProgressBar show={listLoading} />
    </div>
  );
}

// ─── App Root: Điều hướng chính với Route /login độc lập ─────────────────
export function App() {
  const { currentUser, currentRole, authLoading, handleLoginSuccess, handleLogout } = useAuth();

  // Chờ khôi phục phiên từ cookie (getProfileApi) trước khi quyết định điều hướng —
  // nếu không, login Lark (chỉ set cookie rồi redirect) sẽ bị đá về /login ngay.
  if (authLoading) {
    return <LoadingOverlay />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage currentUser={currentUser} onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/*"
        element={
          currentUser ? (
            <AppShell
              currentUser={currentUser}
              currentRole={currentRole}
              handleLogout={handleLogout}
            />
          ) : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;
