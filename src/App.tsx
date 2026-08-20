import { lazy, Suspense, useEffect, useState } from 'react';
import { connectRealtimeSocket } from './services/realtimeSocket';
import { REALTIME_EVENTS } from './constants/realtimeEvents';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthGate';
import { useQuoteRequests } from './hooks/useQuoteRequests';
import type { Role, User } from './types';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CreateModal } from './components/CreateModal';
import { PricingModal } from './components/PricingModal';
import { RejectModal } from './components/RejectModal';
import { ReturnModal } from './components/ReturnModal';
import { ExportModal } from './components/ExportModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { NavProgressBar } from './components/NavProgressBar';

import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const PricingConfigPage = lazy(() => import('./pages/PricingConfigPage').then((m) => ({ default: m.PricingConfigPage })));

import './index.css';

// ─── Layout Shell (chỉ render khi đã đăng nhập) ─────────────────────────────
interface AppShellProps {
  currentUser: User;
  currentRole: Role;
  handleLogout: () => Promise<void>;
  setCurrentRole: (role: Role) => void;
}

function AppShell({ currentUser, currentRole, handleLogout, setCurrentRole }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  // SALE mặc định chỉ xem yêu cầu của mình, role khác xem tất cả
  const [scopeFilter, setScopeFilter] = useState(currentRole === 'SALE' ? 'MY_REQ' : 'ALL');

  const navigate = useNavigate();
  const location = useLocation();

  const {
    requests, categories, materials, customers, selectedId, setSelectedId,
    selectedReq, statusSubFilter, setStatusSubFilter, searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter, materialFilter, setMaterialFilter,
    ownerFilter, setOwnerFilter, timeRangeFilter, setTimeRangeFilter,
    startDateFilter, setStartDateFilter, endDateFilter, setEndDateFilter, currentPage, setCurrentPage,
    pageSize, setPageSize, totalRecords, totalPages, counts,
    loading, loadingMessage, listLoading, isCreateOpen, setIsCreateOpen, editingReq,
    calculatorData, pricingReqId, setPricingReqId, rejectReqId, setRejectReqId,
    returnReqId, setReturnReqId, handleTabChange, handleResetFilters,
    handleOpenCreate, handleOpenEdit, handleCreateOrUpdateSubmit, handleDeleteRequest, handleAccept,
    handlePricingSubmit, handleConfirmDirectQuote,
    handleRejectSubmit, handleReturnSubmit, handleResubmitDirect, handleMarkClosed,
    handleDeleteOption,
    refreshQuietly,
  } = useQuoteRequests(currentUser, currentRole);

  // Socket /realtime — connect 1 lần suốt phiên (khác chat, connect theo từng DetailPage) để
  // trang danh sách cũng nhận trạng thái mới ngay, không cần F5.
  useEffect(() => {
    const socket = connectRealtimeSocket();
    const handleStatusChanged = () => refreshQuietly();
    socket.on(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);
    return () => {
      socket.off(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSidebarKey = () => {
    const p = location.pathname;
    if (p === '/') return 'OVERVIEW';
    if (p.startsWith('/requests')) return 'ALL';
    if (p.startsWith('/library')) return 'LIBRARY';
    if (p.startsWith('/calculator')) return 'CALCULATOR';
    if (p.startsWith('/staff')) return 'STAFF';
    if (p.startsWith('/customers')) return 'CUSTOMERS';
    if (p.startsWith('/pricing-config')) return 'PRICING_CONFIG';
    return 'OVERVIEW';
  };

  const handleSidebarChange = (filter: string) => {
    const map: Record<string, string> = {
      OVERVIEW: '/', ALL: '/requests', LIBRARY: '/library', CALCULATOR: '/calculator', STAFF: '/staff', CUSTOMERS: '/customers', PRICING_CONFIG: '/pricing-config',
    };
    navigate(map[filter] ?? '/requests');
    handleTabChange(filter);
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

  return (
    <div
      className={`mac-window ${currentRole === 'ORDER' ? 'order-mode-active' : ''}`}
      style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden' }}
    >
      <Sidebar
        currentFilter={getSidebarKey()}
        onFilterChange={handleSidebarChange}
        counts={counts}
        user={currentUser!}
        currentRole={currentRole}
        onOpenCreate={handleOpenCreate}
        isOpen={isSidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', minWidth: 0 }}>
        <Header
          user={currentUser!}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenCreateModal={handleOpenCreate}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="content page-transition" key={location.pathname} style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<LoadingOverlay show message="Đang tải..." />}>
          <Routes>
            <Route path="/" element={
              <DashboardPage requests={requests} counts={counts} currentRole={currentRole}
                onSelectReq={handleOpenDetail} onOpenCreateModal={handleOpenCreate} />
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
                onPricing={(id) => setPricingReqId(id)}
                onReject={(id) => setRejectReqId(id)}
                onReturn={(id) => setReturnReqId(id)}
                onDelete={handleDeleteRequest}
                onOpenCreate={handleOpenCreate}
                onOpenExport={() => setIsExportOpen(true)}
                onResetFilters={() => { handleResetFilters(); setScopeFilter('ALL'); }}
                selectedId={selectedReq?.id || selectedId || null}
              />
            } />

            <Route path="/requests/:id" element={
              <DetailPage
                selectedReq={selectedReq} currentRole={currentRole} currentUser={currentUser!}
                onEdit={handleOpenEdit} onAccept={handleAccept}
                onPricing={(id) => setPricingReqId(id)}
                onReject={(id) => setRejectReqId(id)}
                onReturn={(id) => setReturnReqId(id)}
                onResubmit={handleResubmitDirect}
                onConfirmDirectPrice={handleConfirmDirectQuote}
                onMarkClosed={handleMarkClosed}
                onDelete={handleDeleteRequest}
                onDeleteOption={handleDeleteOption}
              />
            } />

            <Route path="/library" element={
              <LibraryPage requests={requests} categories={categories} materials={materials}
                onSelectReq={handleOpenDetail} selectedId={selectedReq?.id || selectedId}
                totalCount={counts.closed} />
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

            <Route path="*" element={
              <DashboardPage requests={requests} counts={counts} currentRole={currentRole}
                onSelectReq={handleOpenDetail} onOpenCreateModal={handleOpenCreate} />
            } />
          </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Modals */}
      <CreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateOrUpdateSubmit} categories={categories} materials={materials}
        customers={customers} onRefreshCustomers={async () => {}} editingReq={editingReq}
        saleName={currentUser!.name} calculatorData={calculatorData} />

      <PricingModal isOpen={pricingReqId !== null} onClose={() => setPricingReqId(null)}
        onSubmit={handlePricingSubmit} selectedReq={selectedReq} currentRole={currentRole} materials={materials} />

      <RejectModal isOpen={rejectReqId !== null} onClose={() => setRejectReqId(null)}
        onSubmit={handleRejectSubmit} />

      <ReturnModal isOpen={returnReqId !== null} onClose={() => setReturnReqId(null)}
        onSubmit={handleReturnSubmit} />

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)}
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

      <LoadingOverlay show={loading} message={loadingMessage} />
      <NavProgressBar show={listLoading} />
    </div>
  );
}

// ─── App Root: Điều hướng chính với Route /login độc lập ─────────────────
export function App() {
  const { currentUser, currentRole, handleLoginSuccess, handleLogout, setCurrentRole } = useAuth();

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
              setCurrentRole={setCurrentRole}
            />
          ) : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;
