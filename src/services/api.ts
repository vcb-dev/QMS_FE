import type { FilterOptions, User } from '../types';

const API_BASE = 'http://localhost:3000/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('vcb_qms_token');
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('vcb_qms_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('vcb_qms_token');
  localStorage.removeItem('vcb_qms_user');
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
  localStorage.setItem('vcb_qms_token', data.accessToken);
  localStorage.setItem('vcb_qms_user', JSON.stringify(data.user));
  return data;
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchQuoteRequests(filter?: FilterOptions) {
  const headers = getAuthHeaders();
  const query = new URLSearchParams();
  if (filter?.status) query.append('status', filter.status);
  if (filter?.search) query.append('search', filter.search);
  query.append('limit', '100');

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
  const [categoriesRes, materialsRes, customersRes] = await Promise.all([
    fetch(`${API_BASE}/product-categories`, { headers }),
    fetch(`${API_BASE}/materials`, { headers }),
    fetch(`${API_BASE}/customers`, { headers }),
  ]);

  const categories = categoriesRes.ok ? await categoriesRes.json() : [];
  const materials = materialsRes.ok ? await materialsRes.json() : [];
  const customers = customersRes.ok ? await customersRes.json() : [];

  return { categories, materials, customers };
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

export async function acceptQuoteRequest(id: string, version: number) {
  const res = await fetch(`${API_BASE}/quote-requests/${id}/accept`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ version }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Yêu cầu này đã được tiếp nhận bởi người khác');
  }
  return res.json();
}

export async function completeQuoteRequest(id: string, quotedPrice: number, vat?: number) {
  const res = await fetch(`${API_BASE}/quote-requests/${id}/quote`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ quotedPrice, vat }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi nhập báo giá');
  }
  return res.json();
}

export async function rejectQuoteRequest(id: string, rejectReason: string) {
  const res = await fetch(`${API_BASE}/quote-requests/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ rejectReason }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Lỗi khi từ chối yêu cầu');
  }
  return res.json();
}
