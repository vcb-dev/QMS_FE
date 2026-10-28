import { useState, useEffect, useRef } from 'react';
import type { Material, ProductCategory, QuoteRequest, Role, User, StatusCounts, CalculatorHandoff, QuoteOption, Team } from '../types';
import {
  fetchQuoteRequests,
  fetchQuoteRequestById,
  fetchMasterData,
  getAllUsersApi,
  fetchDepartments,
  fetchTeams,
  createQuoteRequest,
  updateQuoteRequest,
  deleteQuoteRequest,
  acceptQuoteRequest,
  completeQuoteRequest,
  editQuotedPrice,
  selectQuoteOption,
  rejectQuoteRequest,
  returnQuoteRequest,
  resubmitQuoteRequest,
  cancelQuoteRequest,
  restoreQuoteRequest,
  markQuoteClosed,
  unmarkQuoteClosed,
} from '../services/api';
import { TEAM_FILTER_ALL } from '../constants/team';
import { OWNER_FILTER_ASSIGNED_TO_ME } from '../constants';

// `listDataEnabled=false` (khi đang ở trang KHÔNG đọc `requests[]` — Thư viện/Máy tính giá/Nhân
// viên/Khách hàng/Cấu hình giá): vẫn fetch để lấy `counts` nhưng kéo bản NHẸ (limit 1 + lite)
// thay vì hydrate 8 dòng kèm option/chất liệu/đá rồi vứt.
// `countsEnabled=false`: không cần cả counts (VD Tổng quan của ADMIN — mọi số liệu lấy từ /stats do
// DashboardPage tự gọi) -> không gọi request đó.
export function useQuoteRequests(
  currentUser: User | null,
  currentRole: Role,
  listDataEnabled: boolean = true,
  masterDataEnabled: boolean = true,
) {
  // Multi-Filter State
  const [currentFilter, setCurrentFilter] = useState<string>('OVERVIEW');
  const [statusSubFilter, setStatusSubFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [saleFilter, setSaleFilter] = useState<string>('ALL');
  const [pricerFilter, setPricerFilter] = useState<string>('ALL');
  const [assignedOrderFilter, setAssignedOrderFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  // Lọc theo NCC — chỉ ORDER/ADMIN (BE bỏ qua với Sale).
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>(TEAM_FILTER_ALL);
  // SALE mặc định chỉ xem yêu cầu của mình, ORDER mặc định xem đơn được giao cho mình, ADMIN xem tất
  // cả. Dùng lại giá trị này mỗi khi reset bộ lọc (đổi tab / "Xóa bộ lọc") — reset về 'ALL' cứng sẽ
  // âm thầm bỏ phạm vi mặc định trong khi dropdown vẫn hiện "Chỉ yêu cầu của tôi" / "Đơn được giao
  // cho tôi".
  const roleDefaultOwnerFilter =
    currentRole === 'SALE'
      ? 'MY_REQ'
      : currentRole === 'ORDER'
        ? OWNER_FILTER_ASSIGNED_TO_ME
        : 'ALL';
  const [ownerFilter, setOwnerFilter] = useState<string>(roleDefaultOwnerFilter);
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  // Chỉ ADMIN dùng — hiện lại các yêu cầu PENDING/PROCESSING đang bị ẩn do người tạo/xử lý bị khóa
  const [includeLocked, setIncludeLocked] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
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
    cancelled: 0,
  });

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saleUsers, setSaleUsers] = useState<User[]>([]);
  const [pricerUsers, setPricerUsers] = useState<User[]>([]);

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
  // Bản chi tiết đầy đủ (kèm stones của từng option) cho request đang mở PricingModal — mảng
  // `requests` (GET list) dùng select rút gọn không có field `stones`, xem effect fetch bên dưới.
  const [pricingReqDetail, setPricingReqDetail] = useState<QuoteRequest | null>(null);
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [returnReqId, setReturnReqId] = useState<string | null>(null);
  // Yêu cầu đang chờ Sale chọn 1 trong nhiều phương án giá để "Đánh Dấu Đã Chốt"
  // (chỉ mở popup khi có >1 phương án đã báo giá — 1 phương án thì chốt thẳng, không cần hỏi).
  const [closeOptionReq, setCloseOptionReq] = useState<QuoteRequest | null>(null);
  // Mã yêu cầu vừa được Sale đánh dấu Đã chốt: bật popup nhắc ghi mã báo giá vào ghi chú khi lên đơn trên OMS.
  const [closedNoticeCode, setClosedNoticeCode] = useState<string | null>(null);
  // Tăng 1 sau mỗi action ghi dữ liệu thành công — DetailPage dựa vào đó để tải lại đơn đang xem.
  const [actionTick, setActionTick] = useState(0);

  // `loading`: chỉ dùng cho các thao tác ghi dữ liệu (blocking overlay che toàn màn hình)
  // `listLoading`: dùng cho việc load/refresh danh sách khi chuyển tab, đổi bộ lọc (thanh tiến trình mỏng, không chặn UI)
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu từ hệ thống VCB...');
  // Chỉ bật khi trang thực sự tải danh sách (listDataEnabled). Bật true vô điều kiện lúc login rồi
  // đáp ở trang không tải list (Tổng quan ADMIN, Thư viện, Cấu hình...) khiến loadData return sớm,
  // không chỗ nào tắt -> thanh NavProgressBar chạy mãi.
  const [listLoading, setListLoading] = useState<boolean>(
    Boolean(currentUser) && listDataEnabled,
  );

  // Thông báo thành công dạng nhẹ (toast góc màn hình), tự ẩn sau vài giây.
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Tab "Đã hủy" chỉ ADMIN có. ADMIN đang xem thử giao diện Sale/Order (chỉ là cờ FE — API vẫn là ADMIN)
  // mà còn đứng ở tab đó thì trả về "Tất cả", kẻo danh sách của vai trò xem thử lộ đơn hủy.
  useEffect(() => {
    if (currentRole !== 'ADMIN' && statusSubFilter === 'CANCELLED') setStatusSubFilter('ALL');
  }, [currentRole, statusSubFilter]);

  // Dùng useRef để giữ state mới nhất tránh stale closure trong useEffect
  const filterRef = useRef({ currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, saleFilter, pricerFilter, assignedOrderFilter, departmentFilter, supplierFilter, teamFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked, listDataEnabled });
  filterRef.current = { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, saleFilter, pricerFilter, assignedOrderFilter, departmentFilter, supplierFilter, teamFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked, listDataEnabled };
  const needCountsRef = useRef(true); // true = fetch counts, false = chỉ fetch data
  // Chữ ký bộ lọc ảnh hưởng tới counts sidebar (nằm trong countsWhere của BE — đã strip status).
  // Khác lần trước mới xin BE tính lại counts; phân trang / đổi tab trạng thái giữ nguyên chữ ký.
  const countsSigRef = useRef<string>('');
  // Đếm request để bỏ qua response trả về trễ (race condition khi chuyển tab/lọc liên tục)
  const requestIdRef = useRef(0);
  // Số lần load DANH SÁCH (foreground) đang chạy — thanh NavProgressBar bật khi > 0, tắt khi về 0.
  // Không đếm refreshQuietly (nền): trước đây finally tắt spinner bị guard theo requestId, mà mỗi
  // refreshQuietly do socket cũng ++requestId -> 1 loạt event làm finally của load foreground bị bỏ
  // qua -> thanh tiến trình kẹt chạy mãi tới khi đổi trang.
  const listLoadInFlightRef = useRef(0);

  // 1. Load Master Data ONCE on user login
  const loadMasterDataOnce = async () => {
    try {
      const [masterRes, usersRes, deptsRes, teamsRes] = await Promise.all([
        fetchMasterData(),
        getAllUsersApi().catch(() => []),
        fetchDepartments().catch(() => []),
        fetchTeams().catch(() => [])
      ]);
      setCategories(masterRes.categories || []);
      setMaterials(masterRes.materials || []);
      if (Array.isArray(usersRes)) {
        setSaleUsers(usersRes.filter(u => u.role === 'SALE') as unknown as User[]);
        setPricerUsers(usersRes.filter(u => u.role === 'ORDER') as unknown as User[]);
      }
      if (Array.isArray(deptsRes)) {
        setDepartments(deptsRes);
      }
      if (Array.isArray(teamsRes)) {
        setTeams(teamsRes);
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  // 2. Load Quote Requests dùng ref để đọc state mới nhất
  const loadData = async (showLoading = true, forceCounts = false) => {
    const { currentFilter, statusSubFilter, searchTerm, categoryFilter, materialFilter, saleFilter, pricerFilter, assignedOrderFilter, departmentFilter, supplierFilter, teamFilter, ownerFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize, currentUser, includeLocked, listDataEnabled } = filterRef.current;
    if (!currentUser) return;

    // `counts` chỉ trang Danh sách + Tổng quan SALE dùng (đều listDataEnabled=true). Trang khác
    // (Cấu hình thông báo / Cấu hình giá / Thư viện / Nhân viên / Khách hàng / Máy tính giá) không
    // đọc requests[] lẫn counts -> không gọi gì cả.
    if (!listDataEnabled) {
      // Rời trang danh sách khi 1 lượt load đang chạy -> tắt thanh tiến trình, reset bộ đếm.
      listLoadInFlightRef.current = 0;
      setListLoading(false);
      return;
    }

    const myRequestId = ++requestIdRef.current;

    if (showLoading) {
      listLoadInFlightRef.current += 1;
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
      // Phạm vi "Đơn được giao cho tôi" (mặc định của ORDER) lọc theo assignedOrderId. Ô "Người được
      // giao" chọn đích danh ai thì ưu tiên ô đó. Tab sidebar "Yêu cầu của tôi" (MY_REQ, theo người
      // tiếp nhận) không chồng thêm điều kiện này — nếu không chỉ còn đơn vừa do mình nhận vừa được
      // giao cho mình.
      const assignedOrderId =
        assignedOrderFilter !== 'ALL'
          ? assignedOrderFilter
          : ownerFilter === OWNER_FILTER_ASSIGNED_TO_ME && currentFilter !== 'MY_REQ'
            ? currentUser.id
            : undefined;

      // Counts sidebar chỉ đổi theo bộ lọc nằm trong countsWhere của BE (đã strip status) — KHÔNG
      // đổi khi phân trang hay đổi tab trạng thái. Xin BE tính lại khi chữ ký lọc đổi, lần đầu,
      // hoặc socket refresh (forceCounts — trạng thái đơn vừa đổi). Đỡ 2 query mỗi lần phân trang.
      const countsSig = JSON.stringify([
        searchTerm, categoryFilter, materialFilter, saleFilter, pricerFilter, assignedOrderId, departmentFilter, supplierFilter, teamFilter, ownerId,
        timeRangeFilter, startDateFilter, endDateFilter, includeLocked,
      ]);
      const includeCounts =
        forceCounts || needCountsRef.current || countsSig !== countsSigRef.current;
      needCountsRef.current = false;
      // countsSigRef cập nhật SAU khi response về (dưới) — nếu cập nhật ở đây rồi request bị 1 request
      // mới hơn vượt mặt, lần sau sẽ tưởng đã có counts cho bộ lọc này mà thật ra chưa.
      // Trang không đọc requests[]: chỉ cần counts -> kéo 1 dòng + lite, khỏi hydrate cả trang.
      const effectiveLimit = !listDataEnabled ? 1 : pageSize;

      const quoteRes = await fetchQuoteRequests({
        page: !listDataEnabled ? 1 : currentPage,
        limit: effectiveLimit,
        status: targetStatus,
        search: searchTerm,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        materialId: materialFilter !== 'ALL' ? materialFilter : undefined,
        requesterId: saleFilter !== 'ALL' ? saleFilter : undefined,
        assigneeId: pricerFilter !== 'ALL' ? pricerFilter : undefined,
        assignedOrderId,
        departmentId: departmentFilter !== 'ALL' ? departmentFilter : undefined,
        supplierId: supplierFilter !== 'ALL' ? supplierFilter : undefined,
        teamId: teamFilter !== TEAM_FILTER_ALL ? teamFilter : undefined,
        ownerId: ownerId,
        timeRange: timeRangeFilter !== 'ALL' ? timeRangeFilter : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        includeCounts,
        includeLocked,
        lite: !listDataEnabled ? true : undefined,
      });

      // Bỏ qua nếu đã có request mới hơn được gửi sau request này (kết quả trả về trễ/không theo thứ tự)
      if (myRequestId !== requestIdRef.current) return;

      if (includeCounts) countsSigRef.current = countsSig;

      const items: QuoteRequest[] = quoteRes.data || [];
      const meta = quoteRes.meta || {};

      // Trang không đọc requests[]: chỉ lấy counts/tổng cho Sidebar, KHÔNG đụng requests/selectedId
      // — giữ nguyên list thật đã tải ở trang Danh Sách để quay lại / mở modal không bị rỗng.
      if (listDataEnabled) {
        setRequests(items);
      }
      setTotalRecords(meta.total || items.length);
      setServerTotalPages(meta.totalPages || 1);
      if (meta.counts) {
        setCounts(meta.counts);
      } else if (includeCounts && listDataEnabled && items) {
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
          cancelled: 0,
        });
      }

      if (listDataEnabled && items.length > 0) {
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
      if (showLoading) {
        listLoadInFlightRef.current = Math.max(0, listLoadInFlightRef.current - 1);
        if (listLoadInFlightRef.current === 0) setListLoading(false);
      }
    }
  };

  // Master data (danh mục + chất liệu) chỉ cần cho: dropdown lọc ở Danh sách + Thư viện, và modal
  // tạo/sửa đơn. KHÔNG tải lúc login — chờ tới đúng ngữ cảnh, tránh giành pool kết nối với các
  // request khác lúc mới vào. (fetchMasterData có cache nên gọi lại rẻ.)
  useEffect(() => {
    if (currentUser?.id && (masterDataEnabled || isCreateOpen)) {
      loadMasterDataOnce();
    }
  }, [currentUser?.id, masterDataEnabled, isCreateOpen]);

  // Load danh sách: 50ms gộp với Tab/Filter, 300ms debounce với search text. 50ms để 1 thao tác
  // đổi nhiều state cùng lúc (VD vào /requests: cờ route đổi + handleTabChange reset filter) chỉ
  // bắn 1 request thay vì 2.
  useEffect(() => {
    if (!currentUser?.id) return;
    const delay = searchTerm ? 300 : 50;
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
    saleFilter,
    pricerFilter,
    assignedOrderFilter,
    departmentFilter,
    supplierFilter,
    teamFilter,
    ownerFilter,
    timeRangeFilter,
    startDateFilter,
    endDateFilter,
    includeLocked,
    listDataEnabled,
  ]);

  useEffect(() => {
    if (!currentUser?.id) return;
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
    // requests/selectedId cố ý không đưa vào deps: effect này tự gọi setSelectedId nên thêm
    // selectedId sẽ khiến nó chạy lặp; requests đã được đồng bộ lại selectedId ngay trong loadData().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser?.id,
    currentPage,
    pageSize,
    currentFilter,
    statusSubFilter,
    categoryFilter,
    materialFilter,
    saleFilter,
    pricerFilter,
    assignedOrderFilter,
    departmentFilter,
    supplierFilter,
    teamFilter,
    ownerFilter,
  ]);

  const handleTabChange = (filter: string) => {
    needCountsRef.current = true; // Đổi tab -> cần refresh counts
    setCurrentFilter(filter);
    setSearchTerm('');
    setStatusSubFilter('ALL');
    setCategoryFilter('ALL');
    setMaterialFilter('ALL');
    setSaleFilter('ALL');
    setPricerFilter('ALL');
    setAssignedOrderFilter('ALL');
    setDepartmentFilter('ALL');
    setSupplierFilter('ALL');
    setTeamFilter(TEAM_FILTER_ALL);
    setOwnerFilter(roleDefaultOwnerFilter);
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
    setSaleFilter('ALL');
    setPricerFilter('ALL');
    setAssignedOrderFilter('ALL');
    setDepartmentFilter('ALL');
    setSupplierFilter('ALL');
    setTeamFilter(TEAM_FILTER_ALL);
    setOwnerFilter(roleDefaultOwnerFilter);
    setTimeRangeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
  };

  const [calculatorData, setCalculatorData] = useState<CalculatorHandoff | null>(null);

  const handleOpenCreate = (calcData?: CalculatorHandoff) => {
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
  // Trả về true nếu action thành công (chỗ gọi cần biết để KHÔNG đóng modal khi BE từ chối).
  const runAction = async (
    loadingMsg: string,
    errorPrefix: string,
    action: () => Promise<QuoteRequest>,
    opts?: { bumpCounts?: boolean; onSuccess?: (updated: QuoteRequest) => void },
  ): Promise<boolean> => {
    setLoadingMessage(loadingMsg);
    setLoading(true);
    try {
      const updated = await action();
      setSelectedId(updated.id);
      if (opts?.bumpCounts !== false) needCountsRef.current = true;
      opts?.onSuccess?.(updated);
      await loadData(false);
      // Báo cho trang chi tiết tải lại đơn đang xem: đơn vừa đổi trạng thái có thể không còn trong danh
      // sách đã tải (bộ lọc/phân trang) nên không thể chỉ trông vào `requests`.
      setActionTick((t) => t + 1);
      return true;
    } catch (err: any) {
      // Optimistic-lock conflict (BE ném 409 khi version FE gửi lệch version DB): người khác vừa
      // sửa đơn này — không phải lỗi thao tác của user. Báo nhẹ + tải lại danh sách cho đồng bộ.
      // CHỈ các 409 kiểu "người khác vừa làm" mới báo nhẹ; 409 do quy tắc nghiệp vụ (VD "Chỉ đánh dấu Đã
      // chốt được khi ... QUOTED") phải hiện đúng lý do BE trả về, không được che bằng câu chung chung.
      const message: string = err?.message || '';
      const isConflict =
        /cập nhật bởi người khác|tiếp nhận bởi nhân sự khác|vừa bị hủy/i.test(message);
      if (isConflict) {
        setToastMessage(
          'Yêu cầu vừa được người khác cập nhật. Đã tải lại dữ liệu mới nhất, vui lòng thao tác lại.',
        );
        await loadData(false);
      } else {
        alert(`${errorPrefix}: ${message || 'Lỗi hệ thống'}`);
        // Lỗi nghiệp vụ thường do dữ liệu trên màn hình đã cũ (VD đơn đã đổi trạng thái) — tải lại cho đồng bộ.
        if (err?.status === 409) await loadData(false);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateSubmit = async (payload: any) => {
    const wasEditing = !!editingReq;
    await runAction('Đang lưu yêu cầu...', 'Không thể lưu yêu cầu', async () => {
      if (editingReq) {
        let updated = await updateQuoteRequest(editingReq.id, payload);
        if (editingReq.status === 'NEED_MORE_INFO') {
          updated = await resubmitQuoteRequest(editingReq.id);
        }
        return updated;
      }
      return createQuoteRequest(payload);
    }, {
      onSuccess: () =>
        setToastMessage(wasEditing ? 'Đã cập nhật yêu cầu báo giá.' : 'Đã tạo yêu cầu báo giá thành công.'),
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

  // "Báo giá luôn" từ đơn PENDING: tiếp nhận trước (khóa đơn về mình), CHỈ khi thành công mới mở
  // PricingModal. Người khác vừa tiếp nhận trước -> acceptQuoteRequest ném lỗi, runAction báo alert,
  // onSuccess không chạy, modal không mở.
  const handleQuoteNow = async (id: string, version: number) => {
    await runAction(
      'Đang tiếp nhận đơn...',
      'Không thể tiếp nhận',
      () => acceptQuoteRequest(id, version),
      { onSuccess: () => setPricingReqId(id) },
    );
  };

  const handlePricingSubmit = async (
    quotedPrice: number,
    vat?: number,
    options?: QuoteOption[],
    extras?: {
      materialWeights?: { materialId: string; weightChi: number }[];
      manualStoneName?: string;
      manualStonePrice?: number;
      stones?: { stoneId: string; quantity: number }[];
      inspectionFee?: number;
      // NCC bắt buộc — PricingModal luôn gửi kèm; BE trả 400 nếu thiếu.
      supplierId?: string;
    },
  ) => {
    if (!pricingReqId) return;
    // Dùng `pricingReq` (cùng nguồn với PricingModal: bản chi tiết fetch riêng theo id, fallback về
    // requests[]) chứ KHÔNG tra thẳng requests[] — list bị lọc theo tab/phân trang nên đơn vừa báo
    // giá xong (đã sang QUOTED) có thể không còn trong đó -> targetReq undefined -> gửi nhầm action
    // QUOTE (BE đòi PROCESSING -> 409) và mất luôn version (bỏ qua optimistic lock).
    const targetReq = pricingReq;
    const version = targetReq?.version;
    // Đơn đã có giá (QUOTED/CLOSED) mở lại PricingModal để SỬA giá — hành vi GIỐNG HỆT
    // completeQuoteRequest (xóa hết & tạo lại toàn bộ options, thêm/bớt/sửa tự do), chỉ khác action
    // gửi lên (BE tự giữ nguyên status/assigneeId, không đẩy PROCESSING->QUOTED lần 2).
    const isEditingQuotedPrice = targetReq?.status === 'QUOTED' || targetReq?.status === 'CLOSED';
    const fallbackOptions = options?.length
      ? options
      : [{ optionName: 'Phương án', quotedPrice, vat }];
    await runAction(
      'Đang cập nhật báo giá...',
      'Không thể báo giá',
      () =>
        isEditingQuotedPrice
          ? editQuotedPrice(
              pricingReqId,
              fallbackOptions,
              version,
              extras?.inspectionFee,
              extras?.supplierId,
            )
          : completeQuoteRequest(
              pricingReqId,
              quotedPrice,
              vat,
              options,
              extras,
              version,
            ),
      { onSuccess: () => setPricingReqId(null) },
    );
  };

  const handleSelectOption = async (quoteId: string, optionId: string) => {
    await runAction('Đang cập nhật phương án...', 'Lỗi chọn phương án', () => selectQuoteOption(quoteId, optionId), { bumpCounts: false });
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectReqId) return;
    const version = requests.find((r) => r.id === rejectReqId)?.version;
    await runAction('Đang từ chối yêu cầu...', 'Không thể từ chối', () => rejectQuoteRequest(rejectReqId, reason, version), {
      onSuccess: () => setRejectReqId(null),
    });
  };

  const handleReturnSubmit = async (reason: string) => {
    if (!returnReqId) return;
    const version = requests.find((r) => r.id === returnReqId)?.version;
    await runAction('Đang trả lại yêu cầu...', 'Không thể trả lại', () => returnQuoteRequest(returnReqId, reason, version), {
      onSuccess: () => setReturnReqId(null),
    });
  };

  // Chỉ ADMIN (nút nằm ở DetailPage, BE cũng chặn role khác). Đơn hủy vẫn mở được với ADMIN nên
  // runAction giữ selectedId như các action khác.
  const handleCancelRequest = async (id: string) => {
    await runAction('Đang hủy yêu cầu...', 'Không thể hủy yêu cầu', () => cancelQuoteRequest(id), {
      onSuccess: () => setToastMessage('Đã hủy yêu cầu. Đơn không còn hiển thị với Sale/Order.'),
    });
  };

  const handleRestoreRequest = async (id: string) => {
    await runAction('Đang khôi phục yêu cầu...', 'Không thể khôi phục yêu cầu', () => restoreQuoteRequest(id), {
      onSuccess: () => setToastMessage('Đã khôi phục yêu cầu.'),
    });
  };

  // `req`: trang chi tiết truyền đơn đang xem — đơn đó có thể không nằm trong trang danh sách đã tải
  // (mở bằng link trực tiếp/F5), khi ấy tra `requests` sẽ không ra và thao tác bị bỏ qua âm thầm.
  const handleResubmitDirect = async (id: string, req?: QuoteRequest) => {
    const target = req ?? requests.find((r) => r.id === id);
    if (!target) return;
    await runAction('Đang gửi lại yêu cầu...', 'Lỗi gửi lại yêu cầu', () => resubmitQuoteRequest(id));
  };

  // `code`: mã yêu cầu để hiện trong popup nhắc. Chỉ Sale được nhắc (Admin chốt hộ thì không phải người lên đơn OMS).
  const handleMarkClosed = async (id: string, optionIds?: string[], code?: string): Promise<boolean> =>
    runAction('Đang đánh dấu Đã chốt...', 'Lỗi đánh dấu Đã chốt', () => markQuoteClosed(id, optionIds), {
      onSuccess: () => {
        setToastMessage('Đã đánh dấu Đã chốt.');
        if (currentRole === 'SALE') setClosedNoticeCode(code || id);
      },
    });

  const handleUnmarkClosed = async (id: string) => {
    await runAction('Đang bỏ đánh dấu Đã chốt...', 'Lỗi bỏ đánh dấu Đã chốt', () => unmarkQuoteClosed(id), {
      onSuccess: () => setToastMessage('Đã bỏ đánh dấu Đã chốt. Đơn quay về "Đã báo giá".'),
    });
  };

  // Bấm "Đánh Dấu Đã Chốt" từ danh sách — nếu yêu cầu có nhiều hơn 1 phương án đã báo giá,
  // mở popup cho Sale chọn các phương án khách chốt (được chọn nhiều) thay vì để BE tự suy ra; chỉ 1 phương án
  // thì chốt thẳng luôn, không cần hỏi lại.
  // `req`: như handleResubmitDirect — không tra lại trong `requests` khi đã có sẵn đơn (trang chi tiết),
  // nếu không đơn ngoài trang danh sách sẽ bị coi là 0 phương án và bỏ qua bước chọn phương án.
  const handleMarkClosedClick = async (id: string, req?: QuoteRequest): Promise<void> => {
    const target = req ?? requests.find((r) => r.id === id);
    const pricedOptionsCount = (target?.options || []).filter((o) => o.quotedPrice != null).length;
    if (target && pricedOptionsCount > 1) {
      setCloseOptionReq(target);
      return;
    }
    await handleMarkClosed(id, undefined, target?.code);
  };

  const handleCloseOptionSubmit = async (optionIds: string[]) => {
    if (!closeOptionReq) return;
    // Chỉ đóng modal khi chốt thành công — BE từ chối thì giữ modal để người dùng thấy lỗi và thử lại.
    if (await handleMarkClosed(closeOptionReq.id, optionIds, closeOptionReq.code)) setCloseOptionReq(null);
  };

  const selectedReq =
    requests.find((r) => r.id === selectedId || r.code === selectedId) ||
    requests[0] ||
    null;

  // GET /quote-requests (list, nguồn của `requests[]`) dùng select rút gọn không có field `stones`
  // của option — mở PricingModal từ đó thì ô Thông Số Đá Quý luôn trống dù DB có đá thật. Tải lại
  // bản chi tiết đầy đủ mỗi khi đổi pricingReqId, giống cách DetailPage.tsx đã xử lý cho selectedReq.
  useEffect(() => {
    if (!pricingReqId) {
      setPricingReqDetail(null);
      return;
    }
    let cancelled = false;
    fetchQuoteRequestById(pricingReqId)
      .then((data) => { if (!cancelled) setPricingReqDetail(data); })
      .catch(() => { if (!cancelled) setPricingReqDetail(null); });
    return () => { cancelled = true; };
  }, [pricingReqId]);

  // Đơn PricingModal đang xử lý — PHẢI tra riêng theo pricingReqId, không được dùng chung
  // selectedReq (tra theo selectedId của DetailPage). Trước đây PricingModal nhận thẳng
  // selectedReq nên bấm "Báo Giá"/"Chốt giá" ở BẤT KỲ đơn nào cũng hiện data của đơn đang xem
  // chi tiết (hoặc requests[0] nếu chưa xem đơn nào) — sai hoàn toàn đơn vừa bấm.
  // Ưu tiên bản chi tiết đầy đủ (pricingReqDetail) khi đã tải xong đúng đơn đang mở; fallback về
  // data rút gọn trong requests[] trong lúc đang chờ fetch, tránh modal chớp trống lúc vừa mở.
  const pricingReq =
    pricingReqDetail?.id === pricingReqId
      ? pricingReqDetail
      : requests.find((r) => r.id === pricingReqId) || null;

  return {
    requests,
    categories,
    materials,
    departments,
    teams,
    saleUsers,
    pricerUsers,
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
    saleFilter,
    setSaleFilter,
    pricerFilter,
    setPricerFilter,
    assignedOrderFilter,
    setAssignedOrderFilter,
    departmentFilter,
    setDepartmentFilter,
    supplierFilter,
    setSupplierFilter,
    teamFilter,
    setTeamFilter,
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
    toastMessage,
    setToastMessage,
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
    closeOptionReq,
    setCloseOptionReq,
    closedNoticeCode,
    setClosedNoticeCode,
    actionTick,
    handleTabChange,
    handleResetFilters,
    handleOpenCreate,
    handleOpenEdit,
    handleCreateOrUpdateSubmit,
    handleDeleteRequest,
    handleAccept,
    handleQuoteNow,
    handlePricingSubmit,
    handleSelectOption,
    handleRejectSubmit,
    handleReturnSubmit,
    handleResubmitDirect,
    handleMarkClosed,
    handleMarkClosedClick,
    handleUnmarkClosed,
    handleCloseOptionSubmit,
    handleCancelRequest,
    handleRestoreRequest,
    // Socket STATUS_CHANGED: trạng thái 1 đơn vừa đổi -> counts sidebar cũng đổi, ép lấy lại counts.
    refreshQuietly: () => loadData(false, true),
    refreshList: () => loadData(true),
  };
}
