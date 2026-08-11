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

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// Request Interceptor: đính kèm Bearer Token & X-CSRF-Token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && token !== 'undefined' && token !== 'null' && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Tự động đọc cookie crmspd_csrf và gửi kèm Header X-CSRF-Token
  const csrfToken = getCookie('crmspd_csrf');
  if (csrfToken && config.headers) {
    config.headers['X-CSRF-Token'] = csrfToken;
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

export async function registerApi(payload: { name: string; email: string; password: string; role?: string }): Promise<{ user: User; message: string }> {
  try {
    const res = await api.post('/auth/register', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại');
  }
}

export async function getPendingUsersApi(): Promise<User[]> {
  try {
    const res = await api.get('/users/pending');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể lấy danh sách tài khoản chờ duyệt');
  }
}

export async function approveUserApi(userId: string, role?: string): Promise<User> {
  try {
    const res = await api.patch(`/users/${userId}/approve`, { role });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể phê duyệt tài khoản');
  }
}

export async function rejectUserApi(userId: string): Promise<{ message: string }> {
  try {
    const res = await api.delete(`/users/${userId}/reject`);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể từ chối tài khoản');
  }
}

export async function forgotPasswordApi(email: string): Promise<{ message: string; otp?: string }> {
  try {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
  }
}

export async function resetPasswordApi(payload: { email: string; otp: string; newPassword: string }): Promise<{ message: string }> {
  try {
    const res = await api.post('/auth/reset-password', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại OTP');
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

export async function fetchQuoteRequests(filter?: FilterOptions & { page?: number; limit?: number; categoryId?: string; materialId?: string; ownerId?: string; includeCounts?: boolean; timeRange?: string; startDate?: string; endDate?: string }) {
  const params: Record<string, any> = {};
  if (filter?.status) params.status = filter.status;
  if (filter?.search) params.search = filter.search;
  if (filter?.categoryId && filter.categoryId !== 'ALL') params.categoryId = filter.categoryId;
  if (filter?.materialId && filter.materialId !== 'ALL') params.materialId = filter.materialId;
  if (filter?.ownerId && filter.ownerId !== 'ALL') params.ownerId = filter.ownerId;
  if (filter?.page) params.page = filter.page;
  if (filter?.limit) params.limit = filter.limit;
  if (filter?.includeCounts) params.includeCounts = true;
  if (filter?.timeRange) params.timeRange = filter.timeRange;
  if (filter?.startDate) params.startDate = filter.startDate;
  if (filter?.endDate) params.endDate = filter.endDate;

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

export async function fetchProvinces() {
  try {
    const res = await api.get('/locations/provinces');
    return res.data;
  } catch (err: any) {
    console.error('Không thể lấy danh sách Tỉnh/TP:', err);
    return [];
  }
}

export async function fetchWards(provinceIdOrName?: string) {
  if (!provinceIdOrName) return [];
  try {
    const res = await api.get('/locations/wards', {
      params: { provinceId: provinceIdOrName },
    });
    return res.data;
  } catch (err: any) {
    console.error('Không thể lấy danh sách Xã/Phường:', err);
    return [];
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

export async function calculatePriceApi(payload: {
  materialNameOrKey: string;
  weightChi: number;
  laborCost?: number;
  stoneCost?: number;
  vatRate?: number;
}) {
  try {
    const res = await api.post('/pricing-config/calculate', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tính giá từ hệ thống');
  }
}

export async function generatePricingOptionsApi(payload: {
  requestedMatName?: string;
  weightChi?: number;
  laborCost?: number;
  stoneCost?: number;
  stoneDesc?: string;
  vatRate?: number;
  includeVat?: boolean;
  manualBasePrice?: number;
}) {
  try {
    const res = await api.post('/pricing-config/generate-options', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tính danh sách phương án báo giá từ Backend');
  }
}
