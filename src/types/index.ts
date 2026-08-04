export type Role = 'SALE' | 'PRICING' | 'ADMIN';

export type QuoteStatus = 'YC_MOI' | 'DANG_XLY' | 'XONG' | 'TU_CHOI';

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

export interface QuoteRequest {
  id: string;
  code: string;
  status: QuoteStatus;
  productName: string;
  requestNote?: string;
  desiredDate?: string;
  customerMeasurements?: string;
  closeRatePct?: number;
  vat?: number;
  quotedPrice?: number;
  quotedDate?: string;
  rejectReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;

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
