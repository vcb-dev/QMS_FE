import React, { useEffect, useState } from 'react';
import type { RequestsPageProps } from '../types';
import { FilterBar } from '../components/FilterBar';
import { QuoteTable } from '../components/QuoteTable';
import { ChatPopup } from '../components/ChatPopup';
import { Pagination } from '../components/Pagination';
import { Download, PlusCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchChatUnreadCounts } from '../services/api';
import { CHAT_EVENTS } from '../constants/chatEvents';

export const RequestsPage: React.FC<RequestsPageProps> = ({
  requests,
  categories,
  materials,
  currentRole,
  currentUser,
  socket,
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

  // Badge tin nhắn chưa đọc cho từng dòng — snapshot ban đầu qua REST mỗi khi danh sách đổi (đổi
  // trang/lọc/refresh nền), CỘNG real-time qua socket cho tin đến SAU đó trong lúc đang đứng nhìn
  // trang này (2 effect join room + nghe newMessage bên dưới).
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!socket || requests.length === 0) return;
    let cancelled = false;
    fetchChatUnreadCounts(requests.map((r) => r.id))
      .then((counts) => { if (!cancelled) setUnreadCounts(counts); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [socket, requests]);

  // Chat 1 đơn tại chỗ (không rời trang danh sách) — chỉ 1 popup tại 1 thời điểm, giống DetailPage.
  const [activeChatReqId, setActiveChatReqId] = useState<string | null>(null);
  const handleOpenChat = (id: string) => {
    setActiveChatReqId(id);
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
    socket?.emit(CHAT_EVENTS.JOIN_REQUEST, { quoteRequestId: id });
  };

  // Join room CHO MỌI dòng đang hiển thị (không chỉ dòng bấm vào) — để nghe được newMessage real-
  // time ngay cả khi chưa bấm mở chat đơn nào. Chỉ join đơn mình thực sự tham gia (requester/
  // assignee) và đã có người xử lý — khớp đúng điều kiện hiện icon ở QuoteTable. Join lại mỗi khi
  // socket reconnect vì server không nhớ room cũ qua lần kết nối mới.
  useEffect(() => {
    if (!socket) return;
    const joinVisibleRooms = () => {
      for (const r of requests) {
        const isParticipant =
          (r.requester?.id ?? r.requesterId) === currentUser.id ||
          (r.assignee?.id ?? r.assigneeId) === currentUser.id;
        const hasAssignee = !!(r.assignee?.id ?? r.assigneeId);
        if (isParticipant && hasAssignee) {
          socket.emit(CHAT_EVENTS.JOIN_REQUEST, { quoteRequestId: r.id });
        }
      }
    };
    if (socket.connected) joinVisibleRooms();
    socket.on('connect', joinVisibleRooms);
    return () => { socket.off('connect', joinVisibleRooms); };
  }, [socket, requests, currentUser.id]);

  // Tin nhắn mới tới cho 1 trong các room đã join ở trên -> cộng dồn badge ngay, không cần tải lại
  // danh sách. Bỏ qua tin do chính mình gửi, và bỏ qua đơn đang mở popup (popup tự đánh dấu đã đọc).
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: { quoteRequestId: string; senderId: string }) => {
      if (msg.senderId === currentUser.id) return;
      if (msg.quoteRequestId === activeChatReqId) return;
      setUnreadCounts((prev) => ({
        ...prev,
        [msg.quoteRequestId]: (prev[msg.quoteRequestId] || 0) + 1,
      }));
    };
    socket.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    return () => { socket.off(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage); };
  }, [socket, activeChatReqId, currentUser.id]);

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
          unreadCounts={unreadCounts}
          onOpenChat={handleOpenChat}
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

      {activeChatReqId && socket && (
        <ChatPopup
          key={activeChatReqId}
          quoteRequestId={activeChatReqId}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          socket={socket}
          unreadCount={0}
          initialOpen
          onOpenChange={(open) => { if (!open) setActiveChatReqId(null); }}
        />
      )}
    </>
  );
};
