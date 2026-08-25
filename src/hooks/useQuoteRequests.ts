import { useState, useEffect, useRef } from 'react';
import type { Material, ProductCategory, QuoteRequest, Role, User, StatusCounts } from '../types';
import {
  fetchQuoteRequests,
  fetchMasterData,
  createQuoteRequest,
  updateQuoteRequest,
  deleteQuoteRequest,
  acceptQuoteRequest,
  completeQuoteRequest,
  selectQuoteOption,
  rejectQuoteRequest,
  returnQuoteRequest,
  resubmitQuoteRequest,
  markQuoteClosed,
  deleteQuoteOption,
} from '../services/api';

export function useQuoteRequests(currentUser: User | null, currentRole: Role) {
  // Multi-Filter State
  const [currentFilter, setCurrentFilter] = useState<string>('OVERVIEW');
  const [statusSubFilter, setStatusSubFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  // SALE mặc định chỉ xem yêu cầu của mình, role khác xem tất cả
  const [ownerFilter, setOwnerFilter] = useState<string>(currentRole === 'SALE' ? 'MY_REQ' : 'ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  // Chỉ ADMIN dùng — hiện lại các yêu cầu PENDING/PROCESSING đang bị ẩn do người tạo/xử lý bị khóa
  const [includeLocked, setIncludeLocked] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [counts, setCounts] = useState<StatusCounts>({
    total: 0,
    myReq: 0,
    pending: 0,
    processing: 0,
    needMoreInfo: 0,
    quoted: 0,
    rejected: 0,
    closed: 0,
  });

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const getInitialSelectedId = () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/requests/')) {
      const match = window.location.pathname.match(/\/requests\/([^/]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    return null;
  };

  const [selectedId, setSelectedId] = useState<string | null>(getInitialSelectedId);

  // Modals & UI States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<QuoteRequest | null>(null);
  const [pricingReqId, setPricingReqId] = useState<string | null>(null);
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [returnReqId, setReturnReqId] = useState<string | null>(null);
  // Yêu cầu đang chờ Sale chọn 1 trong nhiều phương án giá để "Đánh Dấu Đã Chốt"
  // (chỉ mở popup khi có >1 phương án đã báo giá — 1 phương án thì chốt thẳng, không cần hỏi).
  const [closeOptionReqId, setCloseOptionReqId] = useState<string | null>(null);
  // Yêu cầu đang mở popup quản lý (xóa bớt) các phương án giá nháp — ORDER/ADMIN, lúc đang xử lý.
  const [manageOptionsReqId, setManageOptionsReqId] = useState<string | null>(null);

  // `loading`: chỉ dùng cho các thao tác ghi dữ liệu (blocking overlay che toàn màn hình)
  // `listLoading`: dùng cho việc load/refresh danh sách khi chuyển tab, đổi bộ lọc (thanh tiến trình mỏng, không chặn UI)
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu từ hệ thống VCB...');
  const [listLoading, setListLoading] = useState<boolean>(Boolean(currentUser));

  // Dùng useRef để giữ state mới nhất tránh stale closure trong useEffect
  const filterRef = useRef({ currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked });
  filterRef.current = { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked };
  const needCountsRef = useRef(true); // true = fetch counts, false = chỉ fetch data
  // Đếm request để bỏ qua response trả về trễ (race condition khi chuyển tab/lọc liên tục)
  const requestIdRef = useRef(0);

  // 1. Load Master Data ONCE on user login
  const loadMasterDataOnce = async () => {
    try {
      const masterRes = await fetchMasterData();
      setCategories(masterRes.categories || []);
      setMaterials(masterRes.materials || []);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  // 2. Load Quote Requests dùng ref để đọc state mới nhất
  const loadData = async (showLoading = true) => {
    const { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked } = filterRef.current;
    if (!currentUser) return;

    const myRequestId = ++requestIdRef.current;

    if (showLoading) {
      setListLoading(true);
    }
    try {
      let targetStatus: import('../types').QuoteStatus | undefined = undefined;
      if (currentFilter === 'PENDING' ) targetStatus = 'PENDING';
      else if (currentFilter === 'PROCESSING' ) targetStatus = 'PROCESSING';
      else if (currentFilter === 'NEED_MORE_INFO') targetStatus = 'NEED_MORE_INFO';
      else if (currentFilter === 'QUOTED') targetStatus = 'QUOTED';
      else if (currentFilter === 'REJECTED') targetStatus = 'REJECTED';
      else if (currentFilter === 'CLOSED') targetStatus = 'CLOSED';
      else if (statusSubFilter !== 'ALL') targetStatus = statusSubFilter as import('../types').QuoteStatus;

      const ownerId = (currentFilter === 'MY_REQ' || ownerFilter === 'MY_REQ') ? currentUser.id : undefined;

      const includeCounts = needCountsRef.current;
      needCountsRef.current = false; // Reset sau lần đầu
      const effectiveLimit = currentFilter === 'LIBRARY' ? 8 : pageSize;

      const quoteRes = await fetchQuoteRequests({
        page: currentFilter === 'LIBRARY' ? 1 : currentPage,
        limit: effectiveLimit,
        status: targetStatus,
        search: searchTerm,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        materialId: materialFilter !== 'ALL' ? materialFilter : undefined,
        ownerId: ownerId,
        timeRange: timeRangeFilter !== 'ALL' ? timeRangeFilter : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        includeCounts,
        includeLocked,
        withLivePrice: currentFilter === 'LIBRARY',
      });

      // Bỏ qua nếu đã có request mới hơn được gửi sau request này (kết quả trả về trễ/không theo thứ tự)
      if (myRequestId !== requestIdRef.current) return;

      const items: QuoteRequest[] = quoteRes.data || [];
      const meta = quoteRes.meta || {};

      setRequests(items);
      setTotalRecords(meta.total || items.length);
      setServerTotalPages(meta.totalPages || 1);
      if (meta.counts) {
        setCounts(meta.counts);
      } else if (items) {
        const pending = items.filter((r) => r.status === 'PENDING').length;
        const processing = items.filter((r) => r.status === 'PROCESSING').length;
        const needMoreInfo = items.filter((r) => r.status === 'NEED_MORE_INFO').length;
        const quoted = items.filter((r) => r.status === 'QUOTED').length;
        const rejected = items.filter((r) => r.status === 'REJECTED').length;
        const closed = items.filter((r) => r.status === 'CLOSED').length;
        setCounts({
          total: meta.total || items.length,
          myReq: items.filter((r) => r.requester?.id === currentUser.id || r.assignee?.id === currentUser.id).length,
          pending,
          processing,
          needMoreInfo,
          quoted,
          rejected,
          closed,
        });
      }

      if (items.length > 0) {
        setSelectedId((prevId) => {
          if (prevId && items.some((item) => item.id === prevId || item.code === prevId)) {
            return prevId;
          }
          const urlId = getInitialSelectedId();
          if (urlId) return urlId;
          return items[0].id;
        });
      }
    } catch (err) {
      if (myRequestId === requestIdRef.current) {
        console.error('Error loading data from API:', err);
      }
    } finally {
      if (myRequestId === requestIdRef.current) {
        setListLoading(false);
      }
    }
  };

  // Load Master Data 1 lần khi login
  useEffect(() => {
    if (currentUser) {
      loadMasterDataOnce();
    }
  }, [currentUser?.id]);

  // Load danh sách: 0ms delay với Tab/Filter, 300ms debounce với search text
  useEffect(() => {
    if (!currentUser) return;
    const delay = searchTerm ? 300 : 0;
    const timer = setTimeout(() => {
      loadData(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [
    currentUser?.id,
    currentPage,
    pageSize,
    currentFilter,
    statusSubFilter,
    searchTerm,
    categoryFilter,
    materialFilter,
    ownerFilter,
    timeRangeFilter,
    startDateFilter,
    endDateFilter,
    includeLocked,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    if (requests.length > 0) {
      const urlId = getInitialSelectedId();
      if (urlId && (selectedId === urlId || !selectedId)) {
        return;
      }
      const isSelectedInPage = requests.some(
        (r) => r.id === selectedId || r.code === selectedId
      );
      if (!isSelectedInPage && !urlId) {
        setSelectedId(requests[0].id);
      }
    }
  }, [
    currentUser?.id,
    currentPage,
    pageSize,
    currentFilter,
    statusSubFilter,
    categoryFilter,
    materialFilter,
    ownerFilter,
  ]);

  const handleTabChange = (filter: string) => {
    needCountsRef.current = true; // Đổi tab -> cần refresh counts
    setCurrentFilter(filter);
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setTimeRangeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    needCountsRef.current = true; // Reset filter -> cần refresh counts
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setTimeRangeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
  };

  const [calculatorData, setCalculatorData] = useState<any>(null);

  const handleOpenCreate = (calcData?: any) => {
    setEditingReq(null);
    setCalculatorData(calcData || null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (req: QuoteRequest) => {
    setEditingReq(req);
    setIsCreateOpen(true);
  };

  // Khuôn dùng chung cho các action ghi dữ liệu bên dưới — "gọi API, setSelectedId theo kết quả,
  // đánh dấu cần refresh counts, reload danh sách, báo lỗi nếu fail". bumpCounts=false cho action
  // không đổi số lượng/trạng thái đếm được (VD chọn phương án hiển thị, không đổi status).
  const runAction = async (
    loadingMsg: string,
    errorPrefix: string,
    action: () => Promise<QuoteRequest>,
    opts?: { bumpCounts?: boolean; onSuccess?: (updated: QuoteRequest) => void },
  ) => {
    setLoadingMessage(loadingMsg);
    setLoading(true);
    try {
      const updated = await action();
      setSelectedId(updated.id);
      if (opts?.bumpCounts !== false) needCountsRef.current = true;
      opts?.onSuccess?.(updated);
      await loadData(false);
    } catch (err: any) {
      alert(`${errorPrefix}: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateSubmit = async (payload: any) => {
    await runAction('Đang lưu yêu cầu...', 'Không thể lưu yêu cầu', async () => {
      if (editingReq) {
        let updated = await updateQuoteRequest(editingReq.id, payload);
        if (editingReq.status === 'NEED_MORE_INFO') {
          updated = await resubmitQuoteRequest(editingReq.id);
        }
        return updated;
      }
      return createQuoteRequest(payload);
    });
  };

  const handleDeleteRequest = async (id: string) => {
    setLoadingMessage('Đang xóa yêu cầu...');
    setLoading(true);
    try {
      await deleteQuoteRequest(id);
      if (selectedId === id) setSelectedId(null);
      needCountsRef.current = true;
      await loadData(false);
    } catch (err: any) {
      alert(`Không thể xóa yêu cầu: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string, version: number) => {
    await runAction('Đang tiếp nhận đơn...', 'Không thể tiếp nhận', () => acceptQuoteRequest(id, version));
  };

  const handlePricingSubmit = async (
    quotedPrice: number,
    vat?: number,
    options?: any[],
    extras?: {
      materialWeights?: { materialId: string; weightChi: number }[];
      manualStoneName?: string;
      manualStonePrice?: number;
      stones?: { stoneId: string; quantity: number }[];
    },
  ) => {
    if (!pricingReqId) return;
    await runAction(
      'Đang cập nhật báo giá...',
      'Không thể báo giá',
      () => completeQuoteRequest(pricingReqId, quotedPrice, vat, options, extras),
      { onSuccess: () => setPricingReqId(null) },
    );
  };

  const handleSelectOption = async (quoteId: string, optionId: string) => {
    await runAction('Đang cập nhật phương án...', 'Lỗi chọn phương án', () => selectQuoteOption(quoteId, optionId), { bumpCounts: false });
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectReqId) return;
    await runAction('Đang từ chối yêu cầu...', 'Không thể từ chối', () => rejectQuoteRequest(rejectReqId, reason), {
      onSuccess: () => setRejectReqId(null),
    });
  };

  const handleReturnSubmit = async (reason: string) => {
    if (!returnReqId) return;
    await runAction('Đang trả lại yêu cầu...', 'Không thể trả lại', () => returnQuoteRequest(returnReqId, reason), {
      onSuccess: () => setReturnReqId(null),
    });
  };

  const handleResubmitDirect = async (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;
    await runAction('Đang gửi lại yêu cầu...', 'Lỗi gửi lại yêu cầu', () => resubmitQuoteRequest(id));
  };

  const handleMarkClosed = async (id: string, optionId?: string) => {
    await runAction('Đang đánh dấu Đã chốt...', 'Lỗi đánh dấu Đã chốt', () => markQuoteClosed(id, optionId));
  };

  // Bấm "Đánh Dấu Đã Chốt" từ danh sách — nếu yêu cầu có nhiều hơn 1 phương án đã báo giá,
  // mở popup cho Sale chọn đúng phương án khách chốt thay vì để BE tự suy ra; chỉ 1 phương án
  // thì chốt thẳng luôn, không cần hỏi lại.
  const handleMarkClosedClick = (id: string) => {
    const target = requests.find((r) => r.id === id);
    const pricedOptionsCount = (target?.options || []).filter((o) => o.quotedPrice != null).length;
    if (pricedOptionsCount > 1) {
      setCloseOptionReqId(id);
    } else {
      handleMarkClosed(id);
    }
  };

  const handleCloseOptionSubmit = async (optionId: string) => {
    if (!closeOptionReqId) return;
    await handleMarkClosed(closeOptionReqId, optionId);
    setCloseOptionReqId(null);
  };

  const handleDeleteOption = async (id: string, optionId: string) => {
    await runAction('Đang xóa phương án báo giá...', 'Lỗi xóa phương án báo giá', () => deleteQuoteOption(id, optionId));
  };

  const selectedReq =
    requests.find((r) => r.id === selectedId || r.code === selectedId) ||
    requests[0] ||
    null;

  // Đơn PricingModal đang xử lý — PHẢI tra riêng theo pricingReqId, không được dùng chung
  // selectedReq (tra theo selectedId của DetailPage). Trước đây PricingModal nhận thẳng
  // selectedReq nên bấm "Báo Giá"/"Chốt giá" ở BẤT KỲ đơn nào cũng hiện data của đơn đang xem
  // chi tiết (hoặc requests[0] nếu chưa xem đơn nào) — sai hoàn toàn đơn vừa bấm.
  const pricingReq = requests.find((r) => r.id === pricingReqId) || null;

  return {
    requests,
    categories,
    materials,
    selectedId,
    setSelectedId,
    selectedReq,
    pricingReq,
    currentFilter,
    setCurrentFilter,
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
    totalPages: serverTotalPages,
    counts,
    loading,
    loadingMessage,
    listLoading,
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
    closeOptionReqId,
    setCloseOptionReqId,
    manageOptionsReqId,
    setManageOptionsReqId,
    handleTabChange,
    handleResetFilters,
    handleOpenCreate,
    handleOpenEdit,
    handleCreateOrUpdateSubmit,
    handleDeleteRequest,
    handleAccept,
    handlePricingSubmit,
    handleSelectOption,
    handleRejectSubmit,
    handleReturnSubmit,
    handleResubmitDirect,
    handleMarkClosed,
    handleMarkClosedClick,
    handleCloseOptionSubmit,
    handleDeleteOption,
    refreshQuietly: () => loadData(false),
    refreshList: () => loadData(true),
  };
}
