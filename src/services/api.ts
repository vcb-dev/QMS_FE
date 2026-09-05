import axios from 'axios';
import type { ChatMessage, FilterOptions, User, QuoteRequest, QuoteOptionDraft, QuoteOptionDraftMaterial, QuoteOptionDraftStone, DashboardChartsResponse, CustomerStatsResponse, CustomerMonthComparisonResponse, UserStatsResponse, StaffPerformanceResponse, LibraryProductsResponse, LibraryHistoryResponse, StaffUser, MarginTier, LarkWebhook, LarkActionInfo, LarkWebhookListResponse, LarkUpdater, LarkDmBridgeStatus } from '../types';
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

// Khuôn try/catch dùng chung cho phần lớn hàm gọi API dưới đây — đều theo đúng khuôn "gọi axios,
// trả res.data, lỗi thì ném Error với message BE trả về (hoặc fallback)". Hàm nào có xử lý đặc biệt
// (login lưu session, export tải file, import Excel có errors[], fetchProvinces/fetchWards nuốt lỗi
// trả mảng rỗng, fetchMasterData cache + trả rỗng khi lỗi, fetchSilverMultipliers biến đổi res.data
// trước khi trả...) giữ nguyên try/catch riêng, không ép qua đây.
async function apiCall(promise: Promise<{ data: any }>, fallbackMsg: string): Promise<any> {
  try {
    const res = await promise;
    return res.data;
  } catch (err: any) {
    // Giữ HTTP status trên Error để nơi gọi phân biệt 409 (optimistic-lock conflict) với lỗi
    // thường — axios error bị `new Error` nuốt mất `err.response`.
    const wrapped = new Error(
      err.response?.data?.message || fallbackMsg,
    ) as Error & { status?: number };
    wrapped.status = err.response?.status;
    throw wrapped;
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// Request Interceptor: đính kèm X-CSRF-Token — JWT tự gửi qua httpOnly cookie (crmspd_at),
// không cần Authorization header từ storage (token không nằm ở client-side JS).
api.interceptors.request.use((config) => {
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

    // skipAuthRedirect: caller tự xử lý 401 (VD bootstrap getProfileApi lúc khởi động) —
    // không reload để tránh vòng lặp reload khi phiên đã hết hạn.
    if (error.response?.status === 401 && !isAuthRequest && !originalRequest?.skipAuthRedirect) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Đọc: ưu tiên sessionStorage trước, rồi mới tới localStorage — loginApi lưu vào localStorage khi
// rememberMe=true (mặc định của form đăng nhập), nếu ở đây chỉ đọc sessionStorage thì y hệt trường
// hợp "đã đăng nhập nhớ tôi" vẫn bị đá về login mỗi lần F5, vì user nằm ở localStorage nhưng hàm
// đọc chưa bao giờ nhìn vào đó. JWT nằm trong httpOnly cookie (crmspd_at), JS phía client
// không đọc/ghi được, chống lộ token qua XSS.
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
  sessionStorage.removeItem(STORAGE_KEYS.USER);
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

// Khôi phục phiên từ cookie httpOnly (crmspd_at) lúc app khởi động — dùng cho cả login mật khẩu
// lẫn login Lark (Lark callback chỉ set cookie rồi redirect, không ghi được localStorage).
export async function getProfileApi(): Promise<User | null> {
  try {
    const res = await api.get('/auth/profile', { skipAuthRedirect: true } as any);
    if (res.data) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
    }
    return res.data ?? null;
  } catch {
    clearSession();
    return null;
  }
}

export async function loginApi(email: string, password: string, remember: boolean = true): Promise<{ user: User }> {
  try {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    clearSession();
    const store = remember ? localStorage : sessionStorage;
    if (data.user) {
      store.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    }
    return data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
  }
}

// Chốt 1 lần: double/spam click chỉ phát 1 lần điều hướng sang BE (browser vẫn chạy JS
// thêm vài ms trước khi unload nên 2 click nhanh sẽ bắn 2 request nếu không chặn).
let larkRedirecting = false;
export function redirectToLarkLogin() {
  if (larkRedirecting) return;
  larkRedirecting = true;
  window.location.href = `${API_BASE}/auth/lark`;
}

export async function registerApi(payload: { name: string; email: string; password: string; role?: string }): Promise<{ user: User; message: string }> {
  return apiCall(api.post('/auth/register', payload), 'Đăng ký không thành công. Vui lòng kiểm tra lại');
}

// Bộ lọc thời gian dùng chung cho các endpoint thống kê trang Nhân Viên — BE quy đổi & tính hết,
// FE chỉ đẩy tham số lên.
export type StaffTimeFilter = { timeRange?: string; startDate?: string; endDate?: string };
function staffTimeParams(filter?: StaffTimeFilter): Record<string, any> {
  const params: Record<string, any> = {};
  if (filter?.timeRange && filter.timeRange !== 'ALL') params.timeRange = filter.timeRange;
  if (filter?.startDate) params.startDate = filter.startDate;
  if (filter?.endDate) params.endDate = filter.endDate;
  return params;
}

export async function getAuditStatsApi(filter?: StaffTimeFilter): Promise<Record<string, { action: string; count: number; byActor: { actorId: string | null; actorName: string; count: number }[] }[]>> {
  return apiCall(dedupedGet('/audit-log/stats', staffTimeParams(filter)), 'Không thể lấy thống kê hành động');
}

export async function getAllUsersApi(filter?: StaffTimeFilter): Promise<StaffUser[]> {
  return apiCall(dedupedGet('/users', staffTimeParams(filter)), 'Không thể lấy danh sách người dùng');
}

export async function getUserStatsApi(filter?: StaffTimeFilter): Promise<UserStatsResponse> {
  return apiCall(dedupedGet('/users/stats', staffTimeParams(filter)), 'Không thể lấy thống kê người dùng');
}

export async function getStaffPerformanceApi(filter?: StaffTimeFilter): Promise<StaffPerformanceResponse> {
  return apiCall(dedupedGet('/quote-requests/staff-performance', staffTimeParams(filter)), 'Không thể lấy hiệu suất nhân viên');
}

export async function approveUserApi(userId: string, role?: string): Promise<User> {
  return apiCall(api.patch(`/users/${userId}/approve`, { role }), 'Không thể phê duyệt tài khoản');
}

export async function setUserActiveApi(userId: string, isActive: boolean): Promise<User> {
  return apiCall(api.patch(`/users/${userId}/active`, { isActive }), 'Không thể cập nhật trạng thái tài khoản');
}

export async function rejectUserApi(userId: string): Promise<{ message: string }> {
  return apiCall(api.delete(`/users/${userId}/reject`), 'Không thể từ chối tài khoản');
}

export async function forgotPasswordApi(email: string): Promise<{ message: string; otp?: string }> {
  return apiCall(api.post('/auth/forgot-password', { email }), 'Không thể gửi yêu cầu đặt lại mật khẩu');
}

export async function resetPasswordApi(payload: { email: string; otp: string; newPassword: string }): Promise<{ message: string }> {
  return apiCall(api.post('/auth/reset-password', payload), 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại OTP');
}

export async function fetchQuoteRequests(filter?: FilterOptions & { page?: number; limit?: number; categoryId?: string; materialId?: string; ownerId?: string; customerId?: string; includeCounts?: boolean; timeRange?: string; startDate?: string; endDate?: string; lite?: boolean; includeLocked?: boolean; withLivePrice?: boolean }) {
  const params: Record<string, any> = {};
  if (filter?.status) params.status = filter.status;
  if (filter?.search) params.search = filter.search;
  if (filter?.customerId) params.customerId = filter.customerId;
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
  if (filter?.withLivePrice) params.withLivePrice = true;

  return apiCall(dedupedGet('/quote-requests', params), 'Không thể tải danh sách báo giá');
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

  const data = await apiCall(dedupedGet('/quote-requests/stats', params), 'Không thể tải số liệu tổng hợp');
  return data as { total: number; closeRate: number; closedRevenue: number; quotedRevenue: number; counts: any };
}

export async function fetchDashboardCharts(filter?: { timeRange?: string; startDate?: string; endDate?: string }): Promise<DashboardChartsResponse> {
  const params: Record<string, any> = {};
  if (filter?.timeRange) params.timeRange = filter.timeRange;
  if (filter?.startDate) params.startDate = filter.startDate;
  if (filter?.endDate) params.endDate = filter.endDate;
  return apiCall(dedupedGet('/quote-requests/dashboard-charts', params), 'Không thể lấy dữ liệu biểu đồ Dashboard');
}

export async function fetchQuoteRequestById(id: string): Promise<QuoteRequest> {
  return apiCall(dedupedGet(`/quote-requests/${id}`), 'Không thể tải chi tiết yêu cầu báo giá');
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

// Xoá cache master data để lần fetch sau lấy dữ liệu mới (gọi sau khi Admin sửa
// chất liệu / danh mục / kim loại gốc ở PricingConfigPage).
export function invalidateMasterData(): void {
  masterDataCachePromise = null;
}

export async function searchCustomers(search?: string) {
  return apiCall(dedupedGet('/customers', search ? { search } : undefined), 'Không thể tìm kiếm khách hàng');
}

export async function fetchCustomerStats(params: {
  search?: string;
  sortMode?: string;
  provinceId?: string;
  requesterId?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<CustomerStatsResponse> {
  return apiCall(dedupedGet('/customers/stats', params), 'Không thể lấy thống kê khách hàng');
}

export async function fetchCustomerMonthComparison(params: {
  provinceId?: string;
  requesterId?: string;
}): Promise<CustomerMonthComparisonResponse> {
  return apiCall(dedupedGet('/customers/stats/month-comparison', params), 'Không thể lấy so sánh KPI theo tháng');
}

export async function fetchProvinces() {
  try {
    const res = await dedupedGet('/locations/provinces');
    return res.data;
  } catch (err: any) {
    console.error('Không thể lấy danh sách Tỉnh/TP:', err);
    return [];
  }
}

export async function fetchWards(provinceIdOrName?: string) {
  if (!provinceIdOrName) return [];
  try {
    const res = await dedupedGet('/locations/wards', { provinceId: provinceIdOrName });
    return res.data;
  } catch (err: any) {
    console.error('Không thể lấy danh sách Xã/Phường:', err);
    return [];
  }
}

export async function createCustomer(payload: { name: string; phone?: string; address?: string; province?: string; ward?: string; provinceId?: string; wardId?: string; note?: string }) {
  return apiCall(api.post('/customers', payload), 'Lỗi khi tạo thông tin khách hàng mới');
}

// CreateQuoteRequestDto/UpdateQuoteRequestDto không có field quotedPrice cấp ngoài, và options[]
// phải qua sanitizeQuoteOption như completeQuoteRequest — nếu không NestJS whitelist reject.
// `files` (ảnh mới, File thật) tách riêng khỏi phần JSON — xử lý ở buildQuoteRequestBody bên dưới.
function sanitizeQuoteRequestPayload(payload: any) {
  const { quotedPrice: _quotedPrice, files: _files, videoFile: _videoFile, ...rest } = payload || {};
  return {
    ...rest,
    options: Array.isArray(payload?.options) ? payload.options.map((opt: any) => sanitizeQuoteOption(opt)) : payload?.options,
  };
}

// Có ảnh mới (payload.files: File[]) thì gửi multipart thật (upload thẳng lên Cloudinary ở BE,
// không encode base64 qua JSON — base64 từng làm request tạo/sửa đơn chậm hẳn vì vừa tốn CPU
// encode phía client vừa tăng size body). Mảng/object lồng nhau (materialIds/stoneIds/options/
// imageUrls) phải JSON.stringify() trước khi append — multer trả field non-file dạng string thô,
// BE tự JSON.parse lại (xem create-quote-request.dto.ts parseIfJsonString). Không có ảnh mới thì
// giữ nguyên gửi JSON như trước, không đổi gì.
function buildQuoteRequestBody(payload: any): any {
  const sanitized = sanitizeQuoteRequestPayload(payload);
  const files: File[] | undefined = payload?.files;
  const videoFile: File | undefined = payload?.videoFile;
  if ((!files || files.length === 0) && !videoFile) return sanitized;

  const formData = new FormData();
  if (files) {
    for (const file of files) {
      formData.append('files', file);
    }
  }
  if (videoFile) {
    formData.append('video', videoFile);
  }
  for (const [key, value] of Object.entries(sanitized)) {
    if (value === undefined || value === null) continue;
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
}

export async function createQuoteRequest(payload: any) {
  const body = buildQuoteRequestBody(payload);
  const config = body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  return apiCall(api.post('/quote-requests', body, config), 'Lỗi khi tạo yêu cầu báo giá');
}

export async function deleteQuoteRequest(id: string) {
  return apiCall(api.delete(`/quote-requests/${id}`), 'Lỗi khi xóa yêu cầu báo giá');
}

export async function updateQuoteRequest(id: string, payload: any) {
  const body = buildQuoteRequestBody(payload);
  const config = body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  return apiCall(api.patch(`/quote-requests/${id}`, body, config), 'Lỗi khi cập nhật yêu cầu báo giá');
}

export async function changeQuoteStatus(id: string, payload: {
  action: 'ACCEPT' | 'QUOTE' | 'REJECT' | 'RETURN' | 'RESUBMIT' | 'SELECT_OPTION' | 'QUICK_QUOTE' | 'QUICK_APPROVE' | 'QUICK_REJECT' | 'MARK_CLOSED';
  version?: number;
  quotedPrice?: number;
  vat?: number;
  options?: SanitizedQuoteOptionPayload[];
  rejectReason?: string;
  returnReason?: string;
  optionId?: string;
  materialWeights?: { materialId: string; weightChi: number }[];
  manualStoneName?: string;
  manualStonePrice?: number;
  stones?: { stoneId: string; quantity: number }[];
}) {
  return apiCall(api.patch(`/quote-requests/${id}/status`, payload), 'Lỗi khi cập nhật trạng thái yêu cầu');
}

export async function acceptQuoteRequest(id: string, version: number) {
  return changeQuoteStatus(id, { action: 'ACCEPT', version });
}

// BE UpdateQuoteStatusDto nhận quotedPrice/vat trong options[] (không ở cấp ngoài),
// và QuoteOptionItemDto chỉ nhận đúng tập field cố định — options[] gửi lên phải lọc bỏ các field
// hiển thị-only (materialName...) kẻo NestJS whitelist reject. isSelected/stoneDescription được
// giữ lại có chủ đích — BE dùng isSelected để set QuoteOption.selectionStatus, stoneDescription
// để lưu tên đá lúc Order nhập tay tổng tiền đá (không chọn từ danh mục Stone).
interface SanitizedQuoteOptionPayload {
  optionName: string;
  id?: string;
  isSelected?: boolean;
  weightChi?: number;
  laborCost?: number;
  stoneCost?: number;
  vat?: number;
  quotedPrice?: number;
  totalMetalCost?: number;
  metalRawCost?: number;
  stonePrice?: number;
  note?: string;
  stoneDescription?: string;
  materials?: { materialId: string; weightChi?: number }[];
  stones?: { stoneId: string; quantity: number }[];
}

function sanitizeQuoteOption(
  opt: QuoteOptionDraft | null | undefined,
  fallbackMaterials?: { materialId: string; weightChi: number }[],
  fallbackStones?: { stoneId: string; quantity: number }[],
): SanitizedQuoteOptionPayload | null | undefined {
  if (!opt) return opt;

  const toNum = (v: any) => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const clean: SanitizedQuoteOptionPayload & Record<string, unknown> = {
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
  const rawMaterials: QuoteOptionDraftMaterial[] | undefined = opt.materials || fallbackMaterials;
  if (Array.isArray(rawMaterials) && rawMaterials.length > 0) {
    const cleanedMats = rawMaterials
      .map((m) => {
        const matId = m.materialId || m.id;
        if (!matId || typeof matId !== 'string') return null;
        const w = toNum(m.weightChi);
        return {
          materialId: matId,
          weightChi: w !== undefined ? w : clean.weightChi,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (cleanedMats.length > 0) {
      clean.materials = cleanedMats;
    }
  }

  // Sanitize stones: ONLY stoneId and quantity (number)
  const rawStones: QuoteOptionDraftStone[] | undefined = opt.stones || fallbackStones;
  if (Array.isArray(rawStones) && rawStones.length > 0) {
    const cleanedStones = rawStones
      .map((s) => {
        const sId = s.stoneId || s.id;
        if (!sId || typeof sId !== 'string') return null;
        const qty = parseInt(String(s.quantity ?? s.qty ?? 1), 10) || 1;
        return {
          stoneId: sId,
          quantity: qty,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

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
  options?: QuoteOptionDraft[],
  extras?: {
    materialWeights?: { materialId: string; weightChi: number }[];
    manualStoneName?: string;
    manualStonePrice?: number;
    stones?: { stoneId: string; quantity: number }[];
  },
  version?: number,
) {
  const cleanOptions = options
    ?.map((opt) => sanitizeQuoteOption(opt, extras?.materialWeights, extras?.stones))
    .filter((opt): opt is SanitizedQuoteOptionPayload => !!opt);
  return changeQuoteStatus(id, { action: 'QUOTE', options: cleanOptions, version });
}

export async function selectQuoteOption(id: string, optionId: string) {
  return changeQuoteStatus(id, { action: 'SELECT_OPTION', optionId });
}

export async function rejectQuoteRequest(
  id: string,
  rejectReason: string,
  version?: number,
) {
  return changeQuoteStatus(id, { action: 'REJECT', rejectReason, version });
}

export async function returnQuoteRequest(
  id: string,
  returnReason: string,
  version?: number,
) {
  return changeQuoteStatus(id, { action: 'RETURN', returnReason, version });
}

export async function resubmitQuoteRequest(id: string) {
  return changeQuoteStatus(id, { action: 'RESUBMIT' });
}

export async function markQuoteClosed(id: string, optionId?: string) {
  return changeQuoteStatus(id, { action: 'MARK_CLOSED', optionId });
}

export async function fetchVnGoldPrice() {
  return apiCall(dedupedGet('/vn-gold-price'), 'Không thể tải giá vàng thị trường tham khảo');
}

export async function fetchBaseMetals() {
  return apiCall(dedupedGet('/metal-prices'), 'Không thể tải giá kim loại gốc');
}

export async function fetchBaseMetalHistory(baseMetalId?: string, limit?: number) {
  const params: Record<string, any> = {};
  if (baseMetalId) params.baseMetalId = baseMetalId;
  if (limit) params.limit = limit;
  return apiCall(dedupedGet('/metal-prices/history', params), 'Không thể tải lịch sử giá kim loại');
}

export async function createBaseMetal(name: string) {
  return apiCall(api.post('/metal-prices', { name }), 'Không thể thêm kim loại gốc');
}

export async function setBaseMetalActive(id: string, isActive: boolean) {
  return apiCall(api.patch(`/metal-prices/${id}/active`, { isActive }), 'Không thể đổi trạng thái kim loại gốc');
}

export async function updateBaseMetalPrice(id: string, priceVnd: number) {
  return apiCall(api.patch(`/metal-prices/${id}/price`, { priceVnd }), 'Không thể cập nhật giá kim loại');
}

// % tính giá (priceRatioPct) và công thức tính lãi (pricingFormulaId) giờ nằm thẳng trên chất liệu
export async function createMaterial(name: string, priceRatioPct: number, pricingFormulaId: string, baseMetalId?: string) {
  return apiCall(api.post('/materials', { name, priceRatioPct, pricingFormulaId, baseMetalId }), 'Không thể thêm chất liệu');
}

export async function updateMaterial(id: string, patch: { name?: string; priceRatioPct?: number; pricingFormulaId?: string; baseMetalId?: string | null }) {
  return apiCall(api.patch(`/materials/${id}`, patch), 'Không thể cập nhật chất liệu');
}

// Công thức tính lãi — gắn theo NHÓM, nhiều chất liệu dùng chung 1 công thức.
export async function fetchPricingFormulas() {
  return apiCall(dedupedGet('/pricing-formulas'), 'Không thể tải công thức tính lãi');
}

export type PricingFormulaConfig = { tiers?: MarginTier[] } | { multipliers?: number[] };

export async function createPricingFormula(payload: { name: string; formulaType: 'MARGIN_TIERS' | 'MULTIPLIER'; config: PricingFormulaConfig; isDefault?: boolean }) {
  return apiCall(api.post('/pricing-formulas', payload), 'Không thể thêm công thức tính lãi');
}

export async function updatePricingFormula(id: string, patch: { name?: string; config?: PricingFormulaConfig; isDefault?: boolean }) {
  return apiCall(api.patch(`/pricing-formulas/${id}`, patch), 'Không thể cập nhật công thức tính lãi');
}

export interface CalculateBatchResultItem {
  materialNameOrKey: string;
  error?: string;
  metalPricePerChi?: number;
  totalMetalCost?: number;
  metalRawCost?: number;
  laborCost?: number;
  stoneCost?: number;
  stonePrice?: number;
  totalProductionCost?: number;
  profitMarginDivisor?: number;
  profitMarginLabel?: string;
  vatRate?: number;
  vatAmount?: number;
  quotedPrice?: number;
  materialPrice?: number;
  // Cấu thành lãi/VAT — BE tính sẵn, FE chỉ hiển thị.
  metalVatAmount?: number;
  metalProfit?: number;
  stoneVatAmount?: number;
  stoneProfit?: number;
}

// Tính NHIỀU phương án (phương án chính + các "loại vàng khác") trong 1 request — thay N lần gọi
// /quote-options/calculate riêng lẻ (mỗi lần ~1–5s qua pooler). Kết quả trả về theo ĐÚNG thứ tự items gửi lên.
export async function calculatePriceBatchApi(payload: {
  categoryId?: string;
  includeVat?: boolean;
  items: {
    materialNameOrKey: string;
    weightChi: number;
    laborCost?: number;
    stoneCost?: number;
    stones?: { stoneId: string; quantity: number }[];
    vatRate?: number;
    silverMultiplier?: number;
  }[];
}): Promise<CalculateBatchResultItem[]> {
  return apiCall(
    api.post('/quote-options/calculate-batch', payload),
    'Lỗi khi tính danh sách phương án báo giá từ hệ thống',
  );
}

export interface CalculateMultiResult {
  totalMetalCost: number;
  metalRawCost: number;
  stoneCost: number;
  stonePrice: number;
  laborCost: number;
  vatAmount: number;
  quotedPrice: number;
  materialPrice?: number;
  // Cấu thành lãi/VAT — BE tính sẵn, FE chỉ hiển thị.
  metalVatAmount?: number;
  metalProfit?: number;
  stoneVatAmount?: number;
  stoneProfit?: number;
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
  return apiCall(api.post('/quote-options/calculate-multi', payload), 'Không thể tính giá nhiều chất liệu');
}

export async function fetchStones(stoneType?: 'MAIN' | 'SIDE') {
  return apiCall(dedupedGet('/stones', stoneType ? { stoneType } : undefined), 'Không thể tải danh mục đá');
}

export async function createStone(payload: { stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number }) {
  return apiCall(api.post('/stones', payload), 'Không thể thêm đá mới');
}

export async function updateStonePrices(items: { id: string; price: number }[]) {
  return apiCall(api.patch('/stones/prices', { items }), 'Không thể cập nhật giá đá');
}

export async function deleteStonesMany(ids: string[]) {
  return apiCall(api.post('/stones/delete-many', { ids }), 'Không thể xóa đá');
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

export async function fetchSilverMultipliers(): Promise<number[]> {
  try {
    const res = await dedupedGet('/quote-options/silver-multipliers');
    return Array.isArray(res.data?.silverMultipliers) ? res.data.silverMultipliers : [];
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách hệ số nhân Bạc');
  }
}

export async function updateProductCategoriesBulk(items: { id: string; laborCost?: number; vatRate?: number }[]) {
  return apiCall(api.patch('/product-categories/bulk', { items }), 'Không thể cập nhật tiền công/VAT danh mục');
}

export async function createProductCategory(name: string, laborCost?: number, vatRate?: number) {
  return apiCall(api.post('/product-categories', { name, laborCost, vatRate }), 'Không thể thêm danh mục sản phẩm');
}

export async function fetchLibraryProducts(params: {
  search?: string;
  categoryId?: string;
  materialId?: string;
  salePersonId?: string;
  orderPersonId?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  sortMode?: string;
  page?: number;
  limit?: number;
}): Promise<LibraryProductsResponse> {
  return apiCall(dedupedGet('/quote-requests/library-products', params), 'Không thể lấy danh sách sản phẩm');
}

// Lịch sử báo giá 1 sản phẩm Thư Viện — lazy load khi mở modal chi tiết, phân trang theo đơn.
// Truyền cùng bộ lọc ngoài để lịch sử khớp view đang lọc.
export async function fetchLibraryProductHistory(params: {
  groupKey: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  materialId?: string;
  salePersonId?: string;
  orderPersonId?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}): Promise<LibraryHistoryResponse> {
  return apiCall(dedupedGet('/quote-requests/library-history', params), 'Không thể lấy lịch sử báo giá sản phẩm');
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
  return apiCall(api.post('/product-categories/delete-many', { ids }), 'Không thể xóa danh mục sản phẩm');
}

export async function fetchChatMessages(quoteRequestId: string): Promise<{ messages: ChatMessage[]; unreadCount: number }> {
  return apiCall(api.get(`/quote-chat/${quoteRequestId}/messages`), 'Không thể tải lịch sử trò chuyện');
}

export async function uploadChatImage(quoteRequestId: string, file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiCall(
    api.post(`/quote-chat/${quoteRequestId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    'Không thể tải ảnh lên',
  );
}

// ── Cấu hình thông báo Lark (ADMIN) ──────────────────────────────────
// REST: /lark-webhooks. webhookSecret KHÔNG trả về client (chỉ hasSecret).
// PATCH/POST: bỏ field webhookSecret = giữ nguyên, '' = xóa, chuỗi = đặt mới.
// actions = danh sách AuditAction webhook này nhận thông báo (bỏ field = giữ nguyên).

export interface LarkWebhookInput {
  chatName?: string;
  botName?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  isEnabled?: boolean;
  actions?: string[];
}

export interface LarkWebhookQuery {
  search?: string;
  status?: 'on' | 'off';
  updatedById?: string;
  updatedWithin?: '24h' | '7d' | '30d';
  page?: number;
  limit?: number;
}

export async function fetchLarkActions(): Promise<LarkActionInfo[]> {
  return apiCall(
    api.get('/lark-webhooks/actions'),
    'Không thể tải danh mục hành động',
  );
}

export async function fetchLarkUpdaters(): Promise<LarkUpdater[]> {
  return apiCall(
    api.get('/lark-webhooks/updaters'),
    'Không thể tải danh sách người cập nhật',
  );
}

// Lọc + phân trang do BE làm — FE chỉ truyền query rồi hiển thị data + meta.
export async function fetchLarkWebhooks(
  query: LarkWebhookQuery = {},
): Promise<LarkWebhookListResponse> {
  return apiCall(
    api.get('/lark-webhooks', { params: query }),
    'Không thể tải danh sách webhook Lark',
  );
}

export async function createLarkWebhook(
  body: LarkWebhookInput,
): Promise<LarkWebhook> {
  return apiCall(
    api.post('/lark-webhooks', body),
    'Không thể thêm webhook Lark',
  );
}

export async function updateLarkWebhook(
  id: string,
  body: LarkWebhookInput,
): Promise<LarkWebhook> {
  return apiCall(
    api.patch(`/lark-webhooks/${id}`, body),
    'Không thể cập nhật webhook Lark',
  );
}

export async function deleteLarkWebhook(id: string): Promise<void> {
  return apiCall(
    api.delete(`/lark-webhooks/${id}`),
    'Không thể xóa webhook Lark',
  );
}

// Bắn 1 tin thử qua webhook đã lưu (dùng URL + secret của bản ghi).
export async function testLarkWebhook(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  return apiCall(
    api.post(`/lark-webhooks/${id}/test`),
    'Không gửi được tin thử',
  );
}

// Công tắc tổng cầu chat web <-> Lark DM (ADMIN).
// Chưa có UI nào gọi 2 hàm này (0 nơi dùng trong src/) — khớp với doc/LARK_DM_CHAT_BRIDGE_PLAN.md,
// có thể là tính năng cầu chat Lark DM đang làm dở phía FE.
export async function fetchDmBridgeStatus(): Promise<LarkDmBridgeStatus> {
  return apiCall(
    api.get('/lark-webhooks/dm-bridge'),
    'Không thể tải trạng thái cầu Lark DM',
  );
}

export async function updateDmBridge(
  isEnabled: boolean,
  note?: string,
): Promise<LarkDmBridgeStatus> {
  return apiCall(
    api.patch('/lark-webhooks/dm-bridge', { isEnabled, note }),
    'Không đổi được trạng thái cầu Lark DM',
  );
}


