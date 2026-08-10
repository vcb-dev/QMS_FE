export type Role = 'SALE' | 'PRICING' | 'ADMIN';

export type QuoteStatus = 'YC_MOI' | 'DANG_XLY' | 'XONG' | 'TU_CHOI' | 'NEED_MORE_INFO';

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
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
}

export interface QuoteRequestImage {
  id: string;
  imageUrl: string;
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
  vat?: number;
  quotedPrice: number;
  isSelected?: boolean;
  note?: string;
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
  selectedOptionId?: string;
  options?: QuoteOption[];
  version: number;
  createdAt: string;
  updatedAt: string;

  customerName?: string;
  categoryId?: string;
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
