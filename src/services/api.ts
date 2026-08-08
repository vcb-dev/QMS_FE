import axios from 'axios';
import type { FilterOptions, User } from '../types';
import { STORAGE_KEYS } from '../constants';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

// Configured Axios Client with default withCredentials: true
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Gửi cookie HTTP-Only tự động
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: đính kèm Bearer Token nếu có (chỉ khi dùng Bearer legacy)
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && token !== 'undefined' && token !== 'null' && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Tự động xử lý hết hạn phiên đăng nhập (401) ngoại trừ API login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export async function logoutApi(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('Error calling logout API:', err);
  } finally {
    clearSession();
  }
}

export async function loginApi(email: string, password: string): Promise<{ accessToken: string; user: User }> {
  try {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    if (data.accessToken) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
    if (data.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    }
    return data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
  }
}

export async function uploadImageToBackend(file: File): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải ảnh lên hệ thống');
  }
}

export async function fetchQuoteRequests(filter?: FilterOptions & { page?: number; limit?: number; categoryId?: string; materialId?: string; ownerId?: string; includeCounts?: boolean }) {
  const params: Record<string, any> = {};
  if (filter?.status) params.status = filter.status;
  if (filter?.search) params.search = filter.search;
  if (filter?.categoryId && filter.categoryId !== 'ALL') params.categoryId = filter.categoryId;
  if (filter?.materialId && filter.materialId !== 'ALL') params.materialId = filter.materialId;
  if (filter?.ownerId && filter.ownerId !== 'ALL') params.ownerId = filter.ownerId;
  if (filter?.page) params.page = filter.page;
  if (filter?.limit) params.limit = filter.limit;
  if (filter?.includeCounts) params.includeCounts = true;

  try {
    const res = await api.get('/quote-requests', { params });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách báo giá');
  }
}

let masterDataCachePromise: Promise<{ categories: any[]; materials: any[]; customers: any[] }> | null = null;

export async function fetchMasterData() {
  if (masterDataCachePromise) {
    return masterDataCachePromise;
  }
  masterDataCachePromise = (async () => {
    try {
      const [categoriesRes, materialsRes] = await Promise.all([
        api.get('/product-categories'),
        api.get('/materials'),
      ]);

      return {
        categories: categoriesRes.data || [],
        materials: materialsRes.data || [],
        customers: [],
      };
    } catch {
      return { categories: [], materials: [], customers: [] };
    }
  })();

  return masterDataCachePromise;
}

export async function searchCustomers(search?: string) {
  try {
    const res = await api.get('/customers', {
      params: search ? { search } : undefined,
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tìm kiếm khách hàng');
  }
}

export async function createCustomer(payload: { name: string; phone?: string; address?: string; province?: string; ward?: string; note?: string }) {
  try {
    const res = await api.post('/customers', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tạo thông tin khách hàng mới');
  }
}

export async function createQuoteRequest(payload: any) {
  try {
    const res = await api.post('/quote-requests', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tạo yêu cầu báo giá');
  }
}

export async function updateQuoteRequest(id: string, payload: any) {
  try {
    const res = await api.patch(`/quote-requests/${id}`, payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi cập nhật yêu cầu báo giá');
  }
}

export async function changeQuoteStatus(id: string, payload: {
  action: 'ACCEPT' | 'QUOTE' | 'REJECT' | 'RETURN' | 'RESUBMIT' | 'SELECT_OPTION' | 'QUICK_QUOTE' | 'QUICK_APPROVE' | 'QUICK_REJECT';
  version?: number;
  quotedPrice?: number;
  vat?: number;
  options?: any[];
  rejectReason?: string;
  returnReason?: string;
  optionId?: string;
}) {
  try {
    const res = await api.patch(`/quote-requests/${id}/status`, payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái yêu cầu');
  }
}

export async function acceptQuoteRequest(id: string, version: number) {
  return changeQuoteStatus(id, { action: 'ACCEPT', version });
}

export async function completeQuoteRequest(id: string, quotedPrice: number, vat?: number, options?: any[]) {
  return changeQuoteStatus(id, { action: 'QUOTE', quotedPrice, vat, options });
}

export async function selectQuoteOption(id: string, optionId: string) {
  return changeQuoteStatus(id, { action: 'SELECT_OPTION', optionId });
}

export async function rejectQuoteRequest(id: string, rejectReason: string) {
  return changeQuoteStatus(id, { action: 'REJECT', rejectReason });
}

export async function returnQuoteRequest(id: string, returnReason: string) {
  return changeQuoteStatus(id, { action: 'RETURN', returnReason });
}

export async function resubmitQuoteRequest(id: string) {
  return changeQuoteStatus(id, { action: 'RESUBMIT' });
}

export async function fetchPricingConfig() {
  try {
    const res = await api.get('/pricing-config');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải cấu hình tính giá');
  }
}

export async function fetchMetalPrices() {
  try {
    const res = await api.get('/metal-prices');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải giá vàng & bạc trực tuyến');
  }
}

export async function updatePricingConfig(payload: any) {
  try {
    const res = await api.put('/pricing-config', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi cập nhật cấu hình tính giá');
  }
}

export async function submitQuickQuote(payload: any) {
  try {
    const res = await api.post('/quote-requests/quick-submit', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi gửi yêu cầu báo giá nhanh');
  }
}
