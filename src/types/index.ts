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
}

export interface ProductCategory {
  id: string;
  name: string;
  laborCost?: number | null;
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
  isSelected?: boolean;
  // Trạng thái được chọn lưu ở BE (QuoteOption.selectionStatus) — SELECTED = đang dùng báo giá chính,
  // CLOSED = khách đã chốt đúng phương án này, NONE = không có gì đặc biệt (mặc định).
  selectionStatus?: 'NONE' | 'SELECTED' | 'CLOSED';
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
}

export interface DetailPageProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
  onResubmit?: (id: string) => void;
  onConfirmDirectPrice?: (id: string, price: number) => Promise<void>;
  onMarkClosed?: (id: string, optionId?: string) => void;
  onDelete?: (id: string) => void;
  onDeleteOption?: (id: string, optionId: string) => void;
}


export interface LibraryPageProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  onSelectReq: (id: string) => void;
  selectedId?: string | null;
  totalCount?: number;
}

export type SortModeLibrary = 'PRICE_DESC' | 'PRICE_ASC' | 'RECENT';
export type TimeRange = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

export interface LoginPageProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export type GoldRatio = { key: string; standard: number; applied: number; label: string };
export type ProfitMargin = { maxCost: number; divisor: number; margin: string };
export type StoneItem = { id: string; stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number };
export type CategoryItem = { id: string; name: string; laborCost?: number | null };
export type MetalPricesState = { gold24kVnd: number; silverVnd: number; platinumVnd: number };
export type ConfigSnapshot = {
  defaultVatRate: number;
  silverMultipliers: number[];
  goldRatios: GoldRatio[];
  profitMargins: ProfitMargin[];
};


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
  onDelete?: (id: string) => void;
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