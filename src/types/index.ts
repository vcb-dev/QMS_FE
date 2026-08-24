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

export interface Material {
  id: string;
  name: string;
  // % dùng nhân với giá kim loại gốc lúc tính giá (vàng theo tuổi: vd 18K=75; Bạc/Bạch kim = 100)
  priceRatioPct: number;
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
  province?: string;
  ward?: string;
  note?: string;
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
  // Giá tính LẠI theo config hiện tại (giá kim loại/đá/tỷ lệ/VAT hôm nay) — chỉ có khi BE nhận
  // withLivePrice=true (trang Quản Lý Sản Phẩm). null = không tính được (thiếu config), fallback
  // hiển thị quotedPrice gốc. undefined = trang không yêu cầu tính live.
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
}

export interface FilterOptions {
  status?: QuoteStatus;
  search?: string;
  page?: number;
  limit?: number;
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

// Trang chi tiết chỉ để xem — mọi thao tác đổi trạng thái/dữ liệu (tiếp nhận, báo giá, từ chối,
// trả lại, sửa, xóa, đánh dấu chốt...) thực hiện từ bảng danh sách (QuoteTable), không phải ở đây.
export interface DetailPageProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  socket?: import('socket.io-client').Socket | null;
}


export interface LibraryPageProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  currentRole: Role;
  onSelectReq: (id: string) => void;
  totalCount?: number;
  // Nút "Tải lại giá" góc phải — gọi lại API với withLivePrice=true để cập nhật giá theo config
  // hiện tại (giá kim loại/đá vừa đổi không tự đẩy xuống FE, phải bấm tải lại).
  onRefreshPrices?: () => void;
  refreshing?: boolean;
}

export type SortModeLibrary = 'PRICE_DESC' | 'PRICE_ASC' | 'RECENT' | 'MOST_QUOTED';
export type TimeRange = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

// 1 phương án báo giá (QuoteOption) đã "duyệt" (đơn cha ở status QUOTED/CLOSED) hiển thị như 1 sản
// phẩm riêng trên trang Quản Lý Sản Phẩm — khác với QuoteRequest (1 đơn có thể có nhiều phương án).
export interface ProductOptionCard {
  key: string;
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
  // Số bản ghi bị gộp chung (cùng danh mục/chất liệu/khối lượng/đá) — 1 = không trùng ai
  duplicateCount?: number;
}

export interface ProductSpecModalProps {
  item: ProductOptionCard;
  onClose: () => void;
  onViewRequest: () => void;
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
export type MetalPricesState = { gold24kVnd: number; silverVnd: number; platinumVnd: number };


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
  onConfirmDirectPrice?: (id: string, price: number) => void;
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

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  categories: ProductCategory[];
  materials: Material[];
  customers: Customer[];
  onRefreshCustomers: () => Promise<void>;
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