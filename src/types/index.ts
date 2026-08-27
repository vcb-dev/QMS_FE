export type Role = 'SALE' | 'ORDER' | 'ADMIN';

export type QuoteStatus = 'PENDING' | 'PROCESSING' | 'QUOTED' | 'REJECTED' | 'NEED_MORE_INFO' | 'CLOSED';

export interface StatusCounts {
  total: number;
  myReq?: number;
  pending: number;
  processing: number;
  needMoreInfo: number;
  quoted: number;
  rejected: number;
  closed: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: {
    id: string;
    name: string;
  };
}

export interface BaseMetal {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  priceVnd: number;
  changePct: number | null;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface BaseMetalPriceHistoryItem {
  id: string;
  baseMetalId: string;
  baseMetalName: string;
  priceVnd: number;
  changePct: number | null;
  isActive: boolean;
  updatedById: string | null;
  updatedByName: string | null;
  createdAt: string;
  source: string | null;
}

export interface Material {
  id: string;
  name: string;
  // % dùng nhân với giá kim loại gốc lúc tính giá (vàng theo tuổi: vd 18K=75; Bạc/Bạch kim = 100)
  priceRatioPct: number;
  // Kim loại gốc dùng để tra giá thị trường — undefined/null = phi kim loại (đá/phụ kiện)
  baseMetalId?: string | null;
  baseMetal?: { id: string; name: string; isDefault: boolean } | null;
  // Công thức tính lãi chất liệu này dùng — nhiều chất liệu có thể trỏ chung 1 công thức
  pricingFormulaId: string;
  pricingFormula?: PricingFormula;
}

export interface ProductCategory {
  id: string;
  name: string;
  laborCost?: number | null;
  // VAT chuẩn theo danh mục sản phẩm — thay cho pricing_config.defaultVatRate cũ (1 giá trị
  // global duy nhất), mỗi danh mục có thể có mức VAT riêng, giống hệt laborCost
  vatRate?: number | null;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  province?: { id: string; name: string; code?: string };
  ward?: { id: string; name: string; code?: string };
  note?: string;
}

export interface CustomerStatRow {
  customer: Customer;
  totalOrders: number;
  totalClosed: number;
  closedValue: number;
  lastOrder: string | null;
}

export interface CustomerStatsResponse {
  data: CustomerStatRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  totalClosedValueAll: number;
}

export interface CustomerMonthComparisonResponse {
  current: { customerCount: number; closedValue: number };
  previous: { customerCount: number; closedValue: number };
  // null = tháng trước bằng 0, không có mốc để tính % tăng/giảm
  customerCountDeltaPct: number | null;
  closedValueDeltaPct: number | null;
}

export interface QuoteRequestImage {
  id: string;
  imageUrl: string;
}

export interface QuoteOptionMaterial {
  id?: string;
  optionId?: string;
  materialId: string;
  materialName?: string;
  weightChi?: number;
  material?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface QuoteOptionStone {
  id?: string;
  optionId?: string;
  stoneId: string;
  stoneName?: string;
  quantity: number;
  stone?: {
    id: string;
    name: string;
    stoneType?: string;
    price?: number;
  };
}

export interface QuoteOption {
  id?: string;
  quoteRequestId?: string;
  optionName: string;
  materialName?: string;
  weightChi?: number;
  laborCost?: number;
  stoneCost?: number;
  stoneDescription?: string;
  totalMetalCost?: number;
  metalRawCost?: number;
  stonePrice?: number;
  vat?: number;
  quotedPrice: number;
  // Giá tính LẠI theo config hiện tại (giá kim loại/đá/tỷ lệ/VAT hôm nay) — BE trang Thư Viện/
  // Quản Lý Sản Phẩm luôn tính kèm. null = không tính được (thiếu config), fallback hiển thị
  // quotedPrice gốc. undefined = trang không yêu cầu tính live.
  livePrice?: number | null;
  quotedDate?: string;
  isSelected?: boolean;
  // Trạng thái được chọn lưu ở BE (QuoteOption.selectionStatus) — SELECTED = đang dùng báo giá chính,
  // CLOSED = khách đã chốt đúng phương án này, NONE = không có gì đặc biệt (mặc định).
  selectionStatus?: 'NONE' | 'SELECTED' | 'CLOSED';
  // true = Order không được chọn làm giá chính (PricingModal) — option Sale gửi kèm nhưng KHÁC
  // chất liệu Sale thực sự yêu cầu (vd phương án so sánh tuổi vàng tự sinh lúc Sale tạo đơn). Vẫn
  // hiển thị để tham khảo, chỉ khóa hành động chọn/thêm.
  locked?: boolean;
  // Gắn cụm cho các phương án đính kèm (locked) đi kèm ĐÚNG 1 phương án chính (locked=false) —
  // cùng groupId = cùng 1 lần "Tính Giá Ngay" (hoặc cùng 1 yêu cầu Sale gửi lên), dùng để lồng
  // hiển thị các phương án đính kèm bên trong card của phương án chính, không hiện dạng list rời.
  groupId?: string;
  note?: string;
  materials?: QuoteOptionMaterial[];
  stones?: QuoteOptionStone[];
}

// Input thô của 1 phương án trước khi qua sanitizeQuoteOption (services/api.ts) — dữ liệu đến
// thẳng từ state form (CalculatorPage/PricingModal/CreateModal), số có thể là string (input
// chưa parse), và materials/stones chấp nhận cả `id` lẫn `materialId`/`stoneId` do nhiều nơi
// tạo option theo quy ước field khác nhau.
export interface QuoteOptionDraftMaterial {
  materialId?: string;
  id?: string;
  weightChi?: number | string;
}

export interface QuoteOptionDraftStone {
  stoneId?: string;
  id?: string;
  quantity?: number | string;
  qty?: number | string;
}

export interface QuoteOptionDraft {
  id?: string;
  optionName?: string;
  isSelected?: boolean;
  weightChi?: number | string;
  laborCost?: number | string;
  stoneCost?: number | string;
  vat?: number | string;
  quotedPrice?: number | string;
  totalMetalCost?: number | string;
  metalRawCost?: number | string;
  stonePrice?: number | string;
  note?: string;
  stoneDescription?: string;
  materials?: QuoteOptionDraftMaterial[];
  stones?: QuoteOptionDraftStone[];
}

export interface QuoteRequest {
  id: string;
  code: string;
  status: QuoteStatus;
  productName: string;
  desiredLeadTime?: string;
  desiredDate?: string;
  customerMeasurements?: string;
  closeRatePct?: number;
  vat?: number;
  quotedPrice?: number;
  quotedDate?: string;
  rejectReason?: string;
  returnReason?: string;
  acceptedAt?: string;
  returnedAt?: string;
  options?: QuoteOption[];
  version: number;
  createdAt: string;
  updatedAt: string;

  customerName?: string;
  customerId?: string;
  categoryId?: string;
  requesterId?: string;
  assigneeId?: string;
  customer?: Customer;
  material?: Material;
  materials?: Material[];
  category?: ProductCategory;
  requester?: User;
  assignee?: User;
  createdBy?: User;
  images?: QuoteRequestImage[];
  videoUrl?: string;
}

export interface FilterOptions {
  status?: QuoteStatus;
  search?: string;
  page?: number;
  limit?: number;
  customerId?: string;
}
export interface CalculatorPageProps {
  currentRole?: Role;
  onApplyToNewRequest?: (productData: any) => void;
}

export type MaterialRow = {
  id: string;
  materialId: string;
  materialName: string;
  weightChi: string;
};

 export type StoneRow = {
  id: string;
  stoneType: 'MAIN' | 'SIDE' | '';
  stoneId: string;
  qty: number;
};

export type StoneCatalogItem = { id: string; stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number };

export type CalcResult = {
  totalMetalCost: number;
  metalRawCost?: number;
  laborCost: number;
  stoneCost: number;
  stonePrice: number;
  vatRate: number;
  vatAmount: number;
  quotedPrice: number;
  profitMarginLabel?: string;
  breakdown?: { materialId: string; materialName: string; weightChi: number; cost: number }[];
};

// Response của POST /quote-options/calculate — khớp PricingCalculationResult (BE
// quote-requests/dto/calculate-price.dto.ts). Role SALE chỉ nhận materialNameOrKey/quotedPrice
// (BE tự cắt bớt phần cấu thành giá), các field còn lại optional để phản ánh đúng thực tế đó.
export type CalculatePriceResult = {
  materialNameOrKey: string;
  quotedPrice: number;
  metalPricePerChi?: number;
  totalMetalCost?: number;
  metalRawCost?: number;
  laborCost?: number;
  stoneCost?: number;
  stonePrice?: number;
  stoneMarginLabel?: string;
  totalProductionCost?: number;
  profitMarginDivisor?: number;
  profitMarginLabel?: string;
  subtotalPrice?: number;
  vatRate?: number;
  vatAmount?: number;
};


export type SortMode = 'RECENT' | 'TOP_SPEND' | 'MOST_ORDERS';

export interface DashboardPageProps {
  requests: QuoteRequest[];
  counts: StatusCounts;
  currentRole: Role;
  onSelectReq: (id: string) => void;
  onOpenCreateModal?: () => void;
  // Bấm vào 1 ô trạng thái trong "Số lượng yêu cầu theo trạng thái" (SALE) — điều hướng sang
  // trang danh sách và lọc sẵn theo đúng trạng thái đó.
  onFilterStatus?: (status: string) => void;
}

export interface DashboardTimelineBucket {
  key: string; label: string;
  pending: number; processing: number; needMoreInfo: number;
  quoted: number; rejected: number; closed: number; total: number;
}

export interface DashboardChartsResponse {
  timeline: DashboardTimelineBucket[];
  saleStats: { id: string; name: string; total: number; closed: number }[];
  categoryDistribution: { name: string; value: number }[];
  materialDistribution: { name: string; value: number }[];
  priceRangeDistribution: { label: string; value: number }[];
  featuredProducts: { key: string; productName: string; price: number; images?: QuoteRequestImage[] }[];
}

// Trang chi tiết chỉ để xem — mọi thao tác đổi trạng thái/dữ liệu (tiếp nhận, báo giá, từ chối,
// trả lại, sửa, xóa, đánh dấu chốt...) thực hiện từ bảng danh sách (QuoteTable), không phải ở đây.
export interface DetailPageProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  socket?: import('socket.io-client').Socket | null;
}


export interface LibraryPageProps {
  categories: ProductCategory[];
  materials: Material[];
  currentRole: Role;
  onSelectReq: (id: string) => void;
  // Khoảng thời gian đang chọn ở filter toàn cục (Dashboard/Danh sách) — dùng làm MẶC ĐỊNH cho
  // bộ lọc thời gian của trang Thư Viện lúc mở (người dùng vẫn đổi tự do trong trang). Thu hẹp
  // working set khi vào Thư Viện, không phải luôn quét toàn bộ lịch sử.
  initialTimeRange?: TimeRange;
}

export type SortModeLibrary = 'PRICE_DESC' | 'PRICE_ASC' | 'RECENT' | 'MOST_QUOTED';
export type TimeRange = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

// 1 phương án báo giá (QuoteOption) đã "duyệt" (đơn cha ở status QUOTED/CLOSED) hiển thị như 1 sản
// phẩm riêng trên trang Quản Lý Sản Phẩm — khác với QuoteRequest (1 đơn có thể có nhiều phương án).
export interface ProductOptionCard {
  key: string;
  // Khóa gộp nhóm — dùng để lazy-load lịch sử báo giá qua fetchLibraryProductHistory.
  groupKey?: string;
  requestId: string;
  code: string;
  categoryId?: string;
  images?: QuoteRequestImage[];
  option: QuoteOption;
  productName: string;
  matStr: string;
  weightDisplay: string | null;
  stoneDisplay: string;
  materialIds: string[];
  requestCreatedAt?: string;
  lastQuotedAt?: string;
  // Số ĐƠN (request) distinct bị gộp chung vào nhóm này (cùng danh mục + kim loại gốc + tập đá) —
  // 1 = chỉ 1 đơn tạo ra sản phẩm này.
  duplicateCount?: number;
  // Khoảng giá ĐÃ BÁO của nhóm (quoted, đóng băng) — min === max khi nhóm 1 giá.
  priceMin?: number;
  priceMax?: number;
  // Khoảng giá HÔM NAY (ước lượng ~) — quoted range × tỉ lệ biến động của option đại diện. null
  // khi rep không tính được giá sống.
  livePriceMin?: number | null;
  livePriceMax?: number | null;
  // Lịch sử báo giá của nhóm — 1 phần tử / đơn, sắp mới → cũ. Modal chi tiết dùng để dựng cột trái
  // (danh sách đơn) + cột phải (giá các phương án của đơn đang chọn).
  history?: QuoteHistoryEntry[];
}

export interface QuoteHistoryOption {
  optionName: string;
  // Giá đã báo khách ngày đó (đóng băng).
  price: number;
  // Giá tính lại hôm nay cho đúng cấu hình phương án này — null nếu BE không tính được.
  livePrice?: number | null;
  // % chênh lệch giá hôm nay so với lúc báo (BE tính sẵn) — null nếu không so được.
  livePriceDeltaPct?: number | null;
  selectionStatus?: string;
}

export interface QuoteHistoryEntry {
  requestId: string;
  code: string;
  quotedDate?: string | null;
  quotedAt?: string;
  weightDisplay: string | null;
  saleName: string;
  pricerName?: string | null;
  // Khoảng giá ĐÃ BÁO của đơn này (BE tính sẵn).
  priceMin?: number;
  priceMax?: number;
  options: QuoteHistoryOption[];
}

export interface LibraryProductsResponse {
  data: ProductOptionCard[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Lịch sử báo giá 1 sản phẩm — lazy load + phân trang theo đơn khi mở modal chi tiết.
export interface LibraryHistoryResponse {
  data: QuoteHistoryEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Kết quả "Sản phẩm" trong dropdown search tổng ở Header — rút gọn từ các option đã có giá
// (QUOTED/CLOSED) của các đơn khớp search, KHÔNG phải toàn bộ ProductOptionCard của Thư Viện.
export interface HeaderSearchProduct {
  key: string;
  requestId: string;
  productName: string;
  price: number | null;
}

export interface ProductSpecModalProps {
  item: ProductOptionCard;
  onClose: () => void;
  // Bộ lọc ngoài đang áp ở trang Thư Viện — truyền vào để lịch sử báo giá (lazy load) khớp view.
  filters?: {
    search?: string;
    categoryId?: string;
    materialId?: string;
    salePersonId?: string;
    orderPersonId?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface LoginPageProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export type MarginTier = { maxCost: number; divisor: number; margin: string };
export type PricingFormulaType = 'MARGIN_TIERS' | 'MULTIPLIER';
// Công thức tính lãi gắn theo NHÓM chất liệu (Material.pricingFormulaId) — MARGIN_TIERS dùng
// `config.tiers`, MULTIPLIER dùng `config.multipliers`. Thay cho bảng lợi nhuận/hệ số nhân Bạc
// cũ từng gom chung 1 JSON tách rời trong pricing_config.
export type PricingFormula = {
  id: string;
  name: string;
  formulaType: PricingFormulaType;
  config: { tiers?: MarginTier[]; multipliers?: number[] };
  isDefault: boolean;
  updatedAt?: string;
};
export type StoneItem = { id: string; stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number };
export type CategoryItem = { id: string; name: string; laborCost?: number | null; vatRate?: number | null };


export interface RequestsPageProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  currentRole: Role;
  currentUser: User;
  counts: StatusCounts;
  statusSubFilter: string;
  setStatusSubFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  materialFilter: string;
  setMaterialFilter: (v: string) => void;
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  timeRangeFilter: string;
  setTimeRangeFilter: (v: string) => void;
  startDateFilter: string;
  setStartDateFilter: (v: string) => void;
  endDateFilter: string;
  setEndDateFilter: (v: string) => void;
  includeLocked?: boolean;
  setIncludeLocked?: (v: boolean) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  totalRecords: number;
  totalPages: number;
  scopeFilter: string;
  setScopeFilter: (v: string) => void;
  onSelectReq: (id: string) => void;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn: (id: string) => void;
  onResubmit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkClosed?: (id: string) => void;
  onManageOptions?: (id: string) => void;
  onOpenCreate: () => void;
  onOpenExport: () => void;
  onResetFilters: () => void;
  selectedId?: string | null;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isApproved: boolean;
  isActive: boolean;
  department?: { id: string; name: string } | null;
  createdAt: string;
}

export interface UserStatsResponse {
  totalUsers: number;
  byRole: { SALE: number; ORDER: number; ADMIN: number };
  byDept: { name: string; count: number }[];
  pendingCount: number;
}

export interface StaffPerformanceResponse {
  saleStats: { id: string; name: string; total: number; closed: number; closeRate: number }[];
  pricerStats: { id: string; name: string; totalHandled: number; avgQuoteMs: number | null; avgProcessMs: number | null }[];
}

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  categories: ProductCategory[];
  materials: Material[];
  editingReq: QuoteRequest | null;
  saleName: string;
  calculatorData?: {
    categoryId?: string;
    materialType?: string;
    materials?: { id?: string; materialId?: string; materialName?: string; weightChi?: string | number }[];
    stones?: { id?: string; stoneId?: string; quantity?: number }[];
    suggestedPrice?: number;
    note?: string;
    options?: { optionName: string; materialName?: string; quotedPrice: number; isSelected?: boolean }[];
  } | null;
}

export interface ChatMessage {
  id: string;
  quoteRequestId: string;
  senderId: string;
  senderName: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ChatPopupProps {
  quoteRequestId: string;
  currentUserId: string;
  currentUserName?: string;
  socket: import('socket.io-client').Socket;
  unreadCount: number;
  onOpenChange: (isOpen: boolean) => void;
}