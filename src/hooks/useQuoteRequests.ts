import { useState, useEffect, useRef } from 'react';
import type { Customer, Material, ProductCategory, QuoteRequest, QuoteStatus, Role, User } from '../types';
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
} from '../services/api';

export function useQuoteRequests(currentUser: User | null, _currentRole?: Role) {
  // Multi-Filter State
  const [currentFilter, setCurrentFilter] = useState<string>('ALL');
  const [statusSubFilter, setStatusSubFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [counts, setCounts] = useState({
    total: 0,
    myReq: 0,
    ycMoi: 0,
    dangXly: 0,
    needMoreInfo: 0,
    xong: 0,
    tuChoi: 0,
  });

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modals & UI States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<QuoteRequest | null>(null);
  const [pricingReqId, setPricingReqId] = useState<string | null>(null);
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [returnReqId, setReturnReqId] = useState<string | null>(null);

  // Khởi tạo loading = true nếu đã đăng nhập để hiện LoadingOverlay ngay lập tức
  const [loading, setLoading] = useState<boolean>(Boolean(currentUser));
  const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu từ hệ thống VCB...');

  // Dùng useRef để giữ state mới nhất tránh stale closure trong useEffect
  const filterRef = useRef({ currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, currentPage, pageSize, currentUser });
  filterRef.current = { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, currentPage, pageSize, currentUser };
  const needCountsRef = useRef(true); // true = fetch counts, false = chỉ fetch data

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
    const { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, ownerFilter, currentPage, pageSize, currentUser } = filterRef.current;
    if (!currentUser) return;

    if (showLoading) {
      setLoading(true);
    }
    try {
      let targetStatus: QuoteStatus | undefined = undefined;
      if (currentFilter === 'YC_MOI') targetStatus = 'YC_MOI';
      else if (currentFilter === 'DANG_XLY') targetStatus = 'DANG_XLY';
      else if (currentFilter === 'NEED_MORE_INFO') targetStatus = 'NEED_MORE_INFO';
      else if (currentFilter === 'XONG' || currentFilter === 'LIBRARY') targetStatus = 'XONG';
      else if (currentFilter === 'TU_CHOI') targetStatus = 'TU_CHOI';
      else if (statusSubFilter !== 'ALL') targetStatus = statusSubFilter as QuoteStatus;

      const ownerId = (currentFilter === 'MY_REQ' || ownerFilter === 'MY_REQ') ? currentUser.id : undefined;

      const includeCounts = needCountsRef.current;
      needCountsRef.current = false; // Reset sau lần đầu
      const effectiveLimit = currentFilter === 'LIBRARY' ? 100 : pageSize;

      const quoteRes = await fetchQuoteRequests({
        page: currentFilter === 'LIBRARY' ? 1 : currentPage,
        limit: effectiveLimit,
        status: targetStatus,
        search: searchTerm,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        materialId: materialFilter !== 'ALL' ? materialFilter : undefined,
        ownerId: ownerId,
        includeCounts,
      });

      const items: QuoteRequest[] = quoteRes.data || [];
      const meta = quoteRes.meta || {};

      setRequests(items);
      setTotalRecords(meta.total || items.length);
      setServerTotalPages(meta.totalPages || 1);
      if (meta.counts) {
        setCounts(meta.counts);
      } else if (items) {
        const ycMoi = items.filter((r) => r.status === 'YC_MOI').length;
        const dangXly = items.filter((r) => r.status === 'DANG_XLY').length;
        const needMoreInfo = items.filter((r) => r.status === 'NEED_MORE_INFO').length;
        const xong = items.filter((r) => r.status === 'XONG').length;
        const tuChoi = items.filter((r) => r.status === 'TU_CHOI').length;
        setCounts({
          total: meta.total || items.length,
          myReq: items.filter((r) => r.requester?.id === currentUser.id || r.pricer?.id === currentUser.id).length,
          ycMoi,
          dangXly,
          needMoreInfo,
          xong,
          tuChoi,
        });
      }

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
  ]);

  useEffect(() => {
    if (!currentUser) return;
    if (requests.length > 0) {
      const isSelectedInPage = requests.some(
        (r) => r.id === selectedId || r.code === selectedId
      );
      if (!isSelectedInPage) {
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
    setLoadingMessage('Đang tải dữ liệu...');
    setLoading(true);
    setCurrentFilter(filter);
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    needCountsRef.current = true; // Reset filter -> cần refresh counts
    setLoadingMessage('Đang làm mới bộ lọc...');
    setLoading(true);
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setOwnerFilter('ALL');
    setCurrentPage(1);
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
        setSelectedId(updated.id);
      } else {
        const created = await createQuoteRequest(payload);
        setSelectedId(created.id);
      }
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Không thể lưu yêu cầu: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string, version: number) => {
    setLoadingMessage('Đang tiếp nhận đơn...');
    setLoading(true);
    try {
      const updated = await acceptQuoteRequest(id, version);
      setSelectedId(updated.id);
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Không thể tiếp nhận: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingSubmit = async (quotedPrice: number, vat?: number, options?: any[]) => {
    if (!pricingReqId) return;
    setLoadingMessage('Đang cập nhật báo giá...');
    setLoading(true);
    try {
      const updated = await completeQuoteRequest(pricingReqId, quotedPrice, vat, options);
      setSelectedId(updated.id);
      setPricingReqId(null);
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Không thể báo giá: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (quoteId: string, optionId: string) => {
    setLoadingMessage('Đang cập nhật phương án...');
    setLoading(true);
    try {
      const updated = await selectQuoteOption(quoteId, optionId);
      setSelectedId(updated.id);
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Lỗi chọn phương án: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectReqId) return;
    setLoadingMessage('Đang từ chối yêu cầu...');
    setLoading(true);
    try {
      const updated = await rejectQuoteRequest(rejectReqId, reason);
      setSelectedId(updated.id);
      setRejectReqId(null);
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Không thể từ chối: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async (reason: string) => {
    if (!returnReqId) return;
    setLoadingMessage('Đang trả lại yêu cầu...');
    setLoading(true);
    try {
      const updated = await returnQuoteRequest(returnReqId, reason);
      setSelectedId(updated.id);
      setReturnReqId(null);
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Không thể trả lại: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitDirect = async (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;
    setLoadingMessage('Đang gửi lại yêu cầu...');
    setLoading(true);
    try {
      const updated = await resubmitQuoteRequest(id);
      setSelectedId(updated.id);
      needCountsRef.current = true;
      await loadData();
    } catch (err: any) {
      alert(`⚠️ Lỗi gửi lại yêu cầu: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedReq =
    requests.find((r) => r.id === selectedId || r.code === selectedId) ||
    requests[0] ||
    null;

  return {
    requests,
    categories,
    materials,
    customers,
    selectedId,
    setSelectedId,
    selectedReq,
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
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalRecords,
    totalPages: serverTotalPages,
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
  };
}
