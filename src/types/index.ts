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
  pricerId?: string;
  customer?: Customer;
  material?: Material;
  materials?: Material[];
  category?: ProductCategory;
  requester?: User;
  pricer?: User;
  createdBy?: User;
  images?: QuoteRequestImage[];
}

export interface FilterOptions {
  status?: QuoteStatus;
  search?: string;
  page?: number;
  limit?: number;
}
