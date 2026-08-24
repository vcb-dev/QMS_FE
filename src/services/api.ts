import axios from 'axios';
import type { ChatMessage, FilterOptions, User, QuoteRequest } from '../types';
import { STORAGE_KEYS } from '../constants';

const API_BASE = import.meta.env.VITE_API_BASE ;

// Configured Axios Client with default withCredentials: true
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Gửi cookie HTTP-Only tự động
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gộp các request GET trùng lặp đang bay cùng lúc (VD: React.StrictMode / lazy-mount kích hoạt effect
// nhiều lần) thành 1 request thật duy nhất — các lệnh gọi sau chỉ "ăn theo" promise đang chờ, không bắn
// thêm request mới. Không cache lâu dài: request tiếp theo sau khi cái cũ đã xong vẫn lấy dữ liệu mới.
const inFlightGetRequests = new Map<string, Promise<any>>();
function dedupedGet(url: string, params?: Record<string, any>) {
  const key = params ? `${url}?${JSON.stringify(params)}` : url;
  let pending = inFlightGetRequests.get(key);
  if (!pending) {
    pending = api.get(url, params ? { params } : undefined).finally(() => {
      inFlightGetRequests.delete(key);
    });
    inFlightGetRequests.set(key, pending);
  }
  return pending;
}

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

// Response Interceptor: Khi Access Token (cookie) hết hạn (401), tự động gọi
// /auth/refresh (Refresh Token cookie tự gửi kèm) rồi thử lại request cũ.
// Chỉ đăng xuất khi refresh cũng thất bại (Refresh Token hết hạn/không hợp lệ).
let refreshPromise: Promise<boolean> | null = null;

function requestRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshed = await requestRefresh();
      if (refreshed) {
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401 && !isAuthRequest) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Đọc: ưu tiên sessionStorage trước.
export function getStoredToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function getStoredUser(): User | null {
  const data = sessionStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.USER);
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
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USER);
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

export async function loginApi(email: string, password: string, remember: boolean = true): Promise<{ accessToken: string; user: User }> {
  try {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    clearSession();
    const store = remember ? localStorage : sessionStorage;
    if (data.accessToken) {
      store.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
    }
    if (data.user) {
      store.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
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

export async function getAuditStatsApi(): Promise<Record<string, { action: string; count: number; byActor: { actorId: string | null; actorName: string; count: number }[] }[]>> {
  try {
    const res = await api.get('/audit-log/stats');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể lấy thống kê hành động');
  }
}

export async function getAllUsersApi(): Promise<any[]> {
  try {
    const res = await api.get('/users');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể lấy danh sách người dùng');
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

export async function setUserActiveApi(userId: string, isActive: boolean): Promise<User> {
  try {
    const res = await api.patch(`/users/${userId}/active`, { isActive });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản');
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

export async function fetchQuoteRequests(filter?: FilterOptions & { page?: number; limit?: number; categoryId?: string; materialId?: string; ownerId?: string; includeCounts?: boolean; timeRange?: string; startDate?: string; endDate?: string; lite?: boolean; includeLocked?: boolean }) {
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
  if (filter?.lite) params.lite = true;
  if (filter?.includeLocked) params.includeLocked = true;

  try {
    const res = await dedupedGet('/quote-requests', params);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách báo giá');
  }
}

export async function fetchQuoteRequestStats(filter?: { timeRange?: string; startDate?: string; endDate?: string; status?: string; categoryId?: string; materialId?: string; ownerId?: string }) {
  const params: Record<string, any> = {};
  if (filter?.timeRange) params.timeRange = filter.timeRange;
  if (filter?.startDate) params.startDate = filter.startDate;
  if (filter?.endDate) params.endDate = filter.endDate;
  if (filter?.status) params.status = filter.status;
  if (filter?.categoryId && filter.categoryId !== 'ALL') params.categoryId = filter.categoryId;
  if (filter?.materialId && filter.materialId !== 'ALL') params.materialId = filter.materialId;
  if (filter?.ownerId && filter.ownerId !== 'ALL') params.ownerId = filter.ownerId;

  try {
    const res = await api.get('/quote-requests/stats', { params });
    return res.data as { total: number; closeRate: number; closedRevenue: number; quotedRevenue: number; counts: any };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải số liệu tổng hợp');
  }
}

export async function fetchQuoteRequestById(id: string): Promise<QuoteRequest> {
  try {
    const res = await dedupedGet(`/quote-requests/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải chi tiết yêu cầu báo giá');
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
      // Không cache kết quả lỗi — lần gọi tiếp theo sẽ thử lại thay vì kẹt rỗng vĩnh viễn cả phiên
      masterDataCachePromise = null;
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

export async function createCustomer(payload: { name: string; phone?: string; address?: string; province?: string; ward?: string; provinceId?: string; wardId?: string; note?: string }) {
  try {
    const res = await api.post('/customers', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tạo thông tin khách hàng mới');
  }
}

// CreateQuoteRequestDto/UpdateQuoteRequestDto không có field quotedPrice cấp ngoài, và options[]
// phải qua sanitizeQuoteOption như completeQuoteRequest — nếu không NestJS whitelist reject.
function sanitizeQuoteRequestPayload(payload: any) {
  const { quotedPrice: _quotedPrice, ...rest } = payload || {};
  return {
    ...rest,
    options: Array.isArray(payload?.options) ? payload.options.map((opt: any) => sanitizeQuoteOption(opt)) : payload?.options,
  };
}

export async function createQuoteRequest(payload: any) {
  try {
    const res = await api.post('/quote-requests', sanitizeQuoteRequestPayload(payload));
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tạo yêu cầu báo giá');
  }
}

export async function deleteQuoteRequest(id: string) {
  try {
    const res = await api.delete(`/quote-requests/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi xóa yêu cầu báo giá');
  }
}

export async function updateQuoteRequest(id: string, payload: any) {
  try {
    const res = await api.patch(`/quote-requests/${id}`, sanitizeQuoteRequestPayload(payload));
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi cập nhật yêu cầu báo giá');
  }
}

export async function changeQuoteStatus(id: string, payload: {
  action: 'ACCEPT' | 'QUOTE' | 'REJECT' | 'RETURN' | 'RESUBMIT' | 'SELECT_OPTION' | 'QUICK_QUOTE' | 'QUICK_APPROVE' | 'QUICK_REJECT' | 'MARK_CLOSED';
  version?: number;
  quotedPrice?: number;
  vat?: number;
  options?: any[];
  rejectReason?: string;
  returnReason?: string;
  optionId?: string;
  materialWeights?: { materialId: string; weightChi: number }[];
  manualStoneName?: string;
  manualStonePrice?: number;
  stones?: { stoneId: string; quantity: number }[];
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

// BE UpdateQuoteStatusDto không còn nhận quotedPrice/vat cấp ngoài (đã dồn hết vào options[]),
// và QuoteOptionItemDto chỉ nhận đúng tập field cố định — options[] gửi lên phải lọc bỏ các field
// hiển thị-only (materialName...) kẻo NestJS whitelist reject. isSelected/stoneDescription được
// giữ lại có chủ đích — BE dùng isSelected để set QuoteOption.selectionStatus, stoneDescription
// để lưu tên đá lúc Order nhập tay tổng tiền đá (không chọn từ danh mục Stone).
function sanitizeQuoteOption(
  opt: any,
  fallbackMaterials?: { materialId: string; weightChi: number }[],
  fallbackStones?: { stoneId: string; quantity: number }[],
) {
  if (!opt) return opt;

  const toNum = (v: any) => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const clean: any = {
    optionName:
      typeof opt.optionName === 'string' && opt.optionName.trim()
        ? opt.optionName.trim()
        : 'Phương án',
  };

  if (opt.id && typeof opt.id === 'string' && !opt.id.startsWith('temp_')) {
    clean.id = opt.id;
  }

  // Phương án nào đang được chọn làm giá chính — BE dùng để set QuoteOption.selectionStatus.
  if (typeof opt.isSelected === 'boolean') {
    clean.isSelected = opt.isSelected;
  }

  const numFields = [
    'weightChi',
    'laborCost',
    'stoneCost',
    'vat',
    'quotedPrice',
    'totalMetalCost',
    'metalRawCost',
    'stonePrice',
  ] as const;

  for (const field of numFields) {
    const val = toNum(opt[field]);
    if (val !== undefined) clean[field] = val;
  }

  if (typeof opt.note === 'string' && opt.note.trim()) {
    clean.note = opt.note.trim();
  }

  if (typeof opt.stoneDescription === 'string' && opt.stoneDescription.trim()) {
    clean.stoneDescription = opt.stoneDescription.trim();
  }

  // Sanitize materials: ONLY materialId and weightChi (number)
  const rawMaterials = opt.materials || fallbackMaterials;
  if (Array.isArray(rawMaterials) && rawMaterials.length > 0) {
    const cleanedMats = rawMaterials
      .map((m: any) => {
        const matId = m.materialId || m.id;
        if (!matId || typeof matId !== 'string') return null;
        const w = toNum(m.weightChi);
        return {
          materialId: matId,
          weightChi: w !== undefined ? w : clean.weightChi,
        };
      })
      .filter(Boolean);

    if (cleanedMats.length > 0) {
      clean.materials = cleanedMats;
    }
  }

  // Sanitize stones: ONLY stoneId and quantity (number)
  const rawStones = opt.stones || fallbackStones;
  if (Array.isArray(rawStones) && rawStones.length > 0) {
    const cleanedStones = rawStones
      .map((s: any) => {
        const sId = s.stoneId || s.id;
        if (!sId || typeof sId !== 'string') return null;
        const qty = parseInt(String(s.quantity ?? s.qty ?? 1), 10) || 1;
        return {
          stoneId: sId,
          quantity: qty,
        };
      })
      .filter(Boolean);

    if (cleanedStones.length > 0) {
      clean.stones = cleanedStones;
    }
  }

  return clean;
}

export async function completeQuoteRequest(
  id: string,
  _quotedPrice: number,
  _vat?: number,
  options?: any[],
  extras?: {
    materialWeights?: { materialId: string; weightChi: number }[];
    manualStoneName?: string;
    manualStonePrice?: number;
    stones?: { stoneId: string; quantity: number }[];
  },
) {
  const cleanOptions = options?.map((opt) => sanitizeQuoteOption(opt, extras?.materialWeights, extras?.stones));
  return changeQuoteStatus(id, { action: 'QUOTE', options: cleanOptions });
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

export async function markQuoteClosed(id: string, optionId?: string) {
  return changeQuoteStatus(id, { action: 'MARK_CLOSED', optionId });
}

export async function deleteQuoteOption(id: string, optionId: string) {
  try {
    const res = await api.delete(`/quote-requests/${id}/options/${optionId}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể xóa phương án báo giá');
  }
}

export async function fetchVnGoldPrice() {
  try {
    const res = await dedupedGet('/vn-gold-price');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải giá vàng thị trường tham khảo');
  }
}

export async function fetchMetalPrices() {
  try {
    const res = await dedupedGet('/metal-prices');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải giá vàng & bạc trực tuyến');
  }
}

export async function updateMetalPrices(payload: { gold24kVnd?: number; silverVnd?: number; platinumVnd?: number }) {
  try {
    const res = await api.post('/metal-prices', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật giá vàng & bạc');
  }
}

// % tính giá (priceRatioPct) và công thức tính lãi (pricingFormulaId) giờ nằm thẳng trên chất liệu
export async function createMaterial(name: string, priceRatioPct: number, pricingFormulaId: string) {
  try {
    const res = await api.post('/materials', { name, priceRatioPct, pricingFormulaId });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể thêm chất liệu');
  }
}

export async function updateMaterial(id: string, patch: { name?: string; priceRatioPct?: number; pricingFormulaId?: string }) {
  try {
    const res = await api.patch(`/materials/${id}`, patch);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật chất liệu');
  }
}

// Công thức tính lãi — gắn theo NHÓM, nhiều chất liệu dùng chung 1 công thức (thay bảng lợi
// nhuận/hệ số nhân Bạc cũ vốn gom chung 1 JSON tách rời trong pricing-config)
export async function fetchPricingFormulas() {
  try {
    const res = await dedupedGet('/pricing-formulas');
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải công thức tính lãi');
  }
}

export async function createPricingFormula(payload: { name: string; formulaType: 'MARGIN_TIERS' | 'MULTIPLIER'; config: any; isDefault?: boolean }) {
  try {
    const res = await api.post('/pricing-formulas', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể thêm công thức tính lãi');
  }
}

export async function updatePricingFormula(id: string, patch: { name?: string; config?: any; isDefault?: boolean }) {
  try {
    const res = await api.patch(`/pricing-formulas/${id}`, patch);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật công thức tính lãi');
  }
}

export async function calculatePriceApi(payload: {
  materialNameOrKey: string;
  weightChi: number;
  laborCost?: number;
  stoneCost?: number;
  vatRate?: number;
  includeVat?: boolean;
  categoryId?: string;
  silverMultiplier?: number;
}) {
  try {
    const res = await api.post('/pricing-config/calculate', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tính giá từ hệ thống');
  }
}

export interface CalculateMultiResult {
  totalMetalCost: number;
  metalRawCost: number;
  stoneCost: number;
  stonePrice: number;
  laborCost: number;
  vatAmount: number;
  quotedPrice: number;
  breakdown: { materialId: string; materialName: string; weightChi: number; cost: number }[];
}

export async function calculatePriceMultiApi(payload: {
  materials: { materialId: string; materialName: string; weightChi: number }[];
  categoryId?: string;
  laborCost?: number;
  vatRate?: number;
  includeVat?: boolean;
  manualStoneName?: string;
  manualStonePrice?: number;
  stones?: { stoneId: string; quantity: number }[];
}): Promise<CalculateMultiResult> {
  try {
    const res = await api.post('/pricing-config/calculate-multi', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tính giá nhiều chất liệu');
  }
}

export async function fetchStones(stoneType?: 'MAIN' | 'SIDE') {
  try {
    const res = await dedupedGet('/stones', stoneType ? { stoneType } : undefined);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải danh mục đá');
  }
}

export async function createStone(payload: { stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number }) {
  try {
    const res = await api.post('/stones', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể thêm đá mới');
  }
}

export async function updateStonePrices(items: { id: string; price: number }[]) {
  try {
    const res = await api.patch('/stones/prices', { items });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật giá đá');
  }
}

export async function deleteStonesMany(ids: string[]) {
  try {
    const res = await api.post('/stones/delete-many', { ids });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể xóa đá');
  }
}

export async function importStonesExcel(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await api.post('/stones/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    const data = err.response?.data;
    if (data?.errors && Array.isArray(data.errors)) {
      throw new Error(`${data.message}\n${data.errors.join('\n')}`);
    }
    throw new Error(data?.message || 'Không thể import bảng giá đá');
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
  categoryId?: string;
  silverMultiplier?: number;
}) {
  try {
    const res = await api.post('/pricing-config/generate-options', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Lỗi khi tính danh sách phương án báo giá từ Backend');
  }
}

export async function fetchSilverMultipliers(): Promise<number[]> {
  try {
    const res = await dedupedGet('/pricing-config/silver-multipliers');
    return Array.isArray(res.data?.silverMultipliers) ? res.data.silverMultipliers : [];
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách hệ số nhân Bạc');
  }
}

export async function updateProductCategoriesBulk(items: { id: string; laborCost?: number; vatRate?: number }[]) {
  try {
    const res = await api.patch('/product-categories/bulk', { items });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể cập nhật tiền công/VAT danh mục');
  }
}

export async function createProductCategory(name: string, laborCost?: number, vatRate?: number) {
  try {
    const res = await api.post('/product-categories', { name, laborCost, vatRate });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể thêm danh mục sản phẩm');
  }
}

export async function exportQuoteRequestsExcelApi(filter?: FilterOptions & { categoryId?: string; materialId?: string; ownerId?: string; timeRange?: string; startDate?: string; endDate?: string; fields?: string[] }) {
  const params: Record<string, any> = {};
  if (filter?.status) params.status = filter.status;
  if (filter?.search) params.search = filter.search;
  if (filter?.categoryId && filter.categoryId !== 'ALL') params.categoryId = filter.categoryId;
  if (filter?.materialId && filter.materialId !== 'ALL') params.materialId = filter.materialId;
  if (filter?.ownerId && filter.ownerId !== 'ALL') params.ownerId = filter.ownerId;
  if (filter?.timeRange) params.timeRange = filter.timeRange;
  if (filter?.startDate) params.startDate = filter.startDate;
  if (filter?.endDate) params.endDate = filter.endDate;
  if (filter?.fields?.length) params.fields = filter.fields.join(',');

  try {
    const res = await api.get('/quote-requests/export', { params, responseType: 'blob' });

    const disposition = res.headers['content-disposition'] as string | undefined;
    const filenameMatch = disposition?.match(/filename="?([^";]+)"?/);
    const filename = filenameMatch?.[1] || `bao-gia-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể export danh sách yêu cầu báo giá');
  }
}

export async function deleteProductCategoriesMany(ids: string[]) {
  try {
    const res = await api.post('/product-categories/delete-many', { ids });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể xóa danh mục sản phẩm');
  }
}

export async function fetchChatMessages(quoteRequestId: string): Promise<{ messages: ChatMessage[]; unreadCount: number }> {
  try {
    const res = await api.get(`/quote-chat/${quoteRequestId}/messages`);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải lịch sử trò chuyện');
  }
}

export async function uploadChatImage(quoteRequestId: string, file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await api.post(`/quote-chat/${quoteRequestId}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải ảnh lên');
  }
}
