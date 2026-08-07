import type { FilterOptions, User } from '../types';
import { STORAGE_KEYS } from '../constants';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

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

export async function loginApi(email: string, password: string): Promise<{ accessToken: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Email hoặc mật khẩu không chính xác');
  }

  const data = await res.json();
  localStorage.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  return data;
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchQuoteRequests(filter?: FilterOptions & { page?: number; limit?: number; categoryId?: string; materialId?: string; ownerId?: string; includeCounts?: boolean }) {
  const headers = getAuthHeaders();
  const query = new URLSearchParams();
  if (filter?.status && filter.status !== 'ALL') query.append('status', filter.status);
  if (filter?.search) query.append('search', filter.search);
  if (filter?.categoryId && filter.categoryId !== 'ALL') query.append('categoryId', filter.categoryId);
  if (filter?.materialId && filter.materialId !== 'ALL') query.append('materialId', filter.materialId);
  if (filter?.ownerId && filter.ownerId !== 'ALL') query.append('ownerId', filter.ownerId);
  if (filter?.page) query.append('page', String(filter.page));
  if (filter?.limit) query.append('limit', String(filter.limit));
  if (filter?.includeCounts) query.append('includeCounts', 'true');

  const res = await fetch(`${API_BASE}/quote-requests?${query.toString()}`, { headers });
  if (res.status === 401) {
    clearSession();
    window.location.reload();
    throw new Error('Phiên đăng nhập đã hết hạn');
  }
  if (!res.ok) throw new Error('Không thể tải danh sách báo giá');
  return res.json();
}

export async function fetchMasterData() {
  const headers = getAuthHeaders();
  const [categoriesRes, materialsRes] = await Promise.all([
    fetch(`${API_BASE}/product-categories`, { headers }),
    fetch(`${API_BASE}/materials`, { headers }),
  ]);

  const categories = categoriesRes.ok ? await categoriesRes.json() : [];
  const materials = materialsRes.ok ? await materialsRes.json() : [];

  return { categories, materials, customers: [] };
}

export async function searchCustomers(search?: string) {
  const headers = getAuthHeaders();
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  const res = await fetch(`${API_BASE}/customers?${query.toString()}`, { headers });
  if (!res.ok) throw new Error('Không thể tìm kiếm khách hàng');
  return res.json();
}

export async function createCustomer(payload: { name: string; phone?: string; address?: string; note?: string }) {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi tạo thông tin khách hàng mới');
  }
  return res.json();
}

export async function createQuoteRequest(payload: any) {
  const res = await fetch(`${API_BASE}/quote-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi tạo yêu cầu báo giá');
  }
  return res.json();
}

export async function updateQuoteRequest(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/quote-requests/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi cập nhật yêu cầu báo giá');
  }
  return res.json();
}

export async function changeQuoteStatus(id: string, payload: {
  action: 'ACCEPT' | 'QUOTE' | 'REJECT' | 'RETURN' | 'RESUBMIT' | 'SELECT_OPTION';
  version?: number;
  quotedPrice?: number;
  vat?: number;
  options?: any[];
  rejectReason?: string;
  returnReason?: string;
  optionId?: string;
}) {
  const res = await fetch(`${API_BASE}/quote-requests/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi cập nhật trạng thái yêu cầu');
  }
  return res.json();
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
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/pricing-config`, { headers });
  if (!res.ok) throw new Error('Không thể tải cấu hình tính giá');
  return res.json();
}

export async function fetchMetalPrices() {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/metal-prices`, { headers });
  if (!res.ok) throw new Error('Không thể tải giá vàng & bạc trực tuyến');
  return res.json();
}

export async function updatePricingConfig(payload: any) {
  const res = await fetch(`${API_BASE}/pricing-config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi cập nhật cấu hình tính giá');
  }
  return res.json();
}
