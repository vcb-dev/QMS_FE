# Quy tắc tuân thủ — Frontend (qms_fe)

Quy tắc bắt buộc khi phát triển frontend VCB QMS (React 19 + Vite + TypeScript,
react-router-dom 7) — **đồng thời là UI-kit / design system của FE**: token
màu, quy tắc style, component dùng chung đều mô tả tại đây, bám đúng code
thật. Mọi thay đổi trong `qms_fe/` phải tuân theo; quy tắc ở đây thắng thói
quen cá nhân hoặc gợi ý mặc định của thư viện.

Tham chiếu thêm: `../../doc/DEVELOPER_GUIDE.md`,
`../../doc/QUY_TAC_TUAN_THU_BE.md` (quy tắc backend), `TAILWIND_CHEATSHEET.md`
(bảng tra cứu chi tiết khi viết Tailwind).

**Mục lục:** [1. Stack & công cụ](#1-stack-thực-tế--công-cụ) ·
[2. Kiến trúc thư mục](#2-kiến-trúc-thư-mục) · [3. Gọi API](#3-gọi-api) ·
[4. Dữ liệu & tính toán](#4-dữ-liệu--tính-toán) ·
[5. React & hiệu năng](#5-react--hiệu-năng) ·
[6. Styling & design tokens](#6-styling--design-tokens) ·
[7. Trạng thái bất đồng bộ](#7-trạng-thái-bất-đồng-bộ-loading--empty--error--success) ·
[8. Ngôn ngữ & nội dung](#8-ngôn-ngữ--nội-dung) ·
[9. Mock khi backend chưa sẵn sàng](#9-mock-khi-backend-chưa-sẵn-sàng) ·
[10. Cấu hình môi trường](#10-cấu-hình-môi-trường) ·
[11. Kiểm tra trước khi merge](#11-kiểm-tra-trước-khi-merge) · [12. Git](#12-git)

---

## 1. Stack thực tế & công cụ

- **Runtime/UI**: React 19 (`StrictMode` bật ở `main.tsx`), react-router-dom 7,
  Vite, TypeScript.
- **Thư viện dùng**: `axios` (HTTP), `lucide-react` (icon), `recharts` (biểu
  đồ), `socket.io-client` (realtime), **Tailwind CSS v4**
  (`@import "tailwindcss"` + `@tailwindcss/vite`) kết hợp className dùng
  chung ở `src/styles/classNames.ts` và `@theme` token trong `src/index.css`.
- **KHÔNG có trong dự án** (đừng thêm nếu không có yêu cầu rõ ràng): shadcn
  UI, Radix, Phosphor Icons, react-hook-form, Zod, TanStack Query,
  class-variance-authority, styled-components.
- **Package manager: `pnpm`. Không dùng `npm`** cho bất kỳ lệnh nào.
- **Lint**: `oxlint` (`pnpm lint`). Rule cứng: `react/rules-of-hooks`
  (`error`), `react/only-export-components` (`warn`).
- **Build/kiểm tra kiểu**: `pnpm build` = `tsc -b && vite build` — **lệnh duy
  nhất** bắt lỗi type. `tsc --noEmit -p tsconfig.json` im lặng không chạy gì,
  không dùng để xác minh.
- Không tự chạy `pnpm dev` — người phát triển tự chạy.

---

## 2. Kiến trúc thư mục

```
src/
├── pages/          ← 1 file / route, export named (không default)
├── components/     ← component tái sử dụng, PascalCase.tsx, export named
├── hooks/          ← use*.ts — state + gọi API + business flow của 1 màn
├── services/       ← api.ts (điểm gọi API duy nhất), realtimeSocket.ts
├── constants/      ← hằng số, bảng meta màu/nhãn, STORAGE_KEYS, *_DEFAULTS
├── types/          ← index.ts — mọi interface/type dùng chung
├── utils/          ← hàm thuần (currency, quoteOption, priceBreakdown...)
├── styles/         ← classNames.ts — className Tailwind dùng chung
├── auth/           ← AuthGate.tsx (useAuth)
└── index.css       ← @theme token Tailwind + reset + @keyframes (không chứa class tay)
```

- **Type và hằng số không đặt inline** trong file component/page/hook —
  interface dùng chung → `src/types/index.ts`; hằng số/bảng dữ liệu →
  `src/constants/`; className lặp lại → `src/styles/classNames.ts`.
- **`src/index.css` chỉ chứa** `@import`, `@theme`, `:root`, reset element
  (`*`, `body`, `button, input, select, textarea`) và `@keyframes`. Mọi style
  giao diện dùng Tailwind utility; **TUYỆT ĐỐI không** thêm rule `.class` tay
  mới vào `index.css`, và **không** nhúng `<style>` chứa class/`@keyframes`
  tay trong file `.tsx` — keyframe mới khai ở `index.css` + token
  `--animate-*`; pseudo-element (`::-webkit-...`) dùng arbitrary variant
  `[&::-webkit-...]:`.
- Ưu tiên bổ sung vào file util/const/types có sẵn thay vì tạo file mới một
  mục đích.
- Component/page export **named** (`export const X`), không `export default`
  (trừ `App.tsx`).

---

## 3. Gọi API

- **`src/services/api.ts` là điểm gọi API duy nhất.** Component/hook không
  gọi `axios` trực tiếp, không ghép URL thủ công.
- Client axios dùng chung: `withCredentials: true` (JWT qua cookie httpOnly
  `crmspd_at`), interceptor tự đính `X-CSRF-Token` từ cookie `crmspd_csrf`.
  **Không đọc/ghi JWT ở client-side JS** — chỉ `user` (không nhạy cảm) lưu ở
  `localStorage`/`sessionStorage` qua `STORAGE_KEYS`.
- GET dùng `dedupedGet()` — gộp các request GET trùng đang bay cùng lúc (do
  `StrictMode`/lazy-mount kích hoạt effect nhiều lần) thành 1 request thật.
- Khuôn xử lý chuẩn: `apiCall(promise, fallbackMsg)` trả `res.data`, lỗi thì
  `throw new Error(err.response?.data?.message || fallbackMsg)` — **message
  fallback luôn tiếng Việt**. Hàm có xử lý đặc biệt (login lưu session,
  export tải blob, import Excel có `errors[]`, fetch nuốt lỗi trả mảng rỗng)
  giữ try/catch riêng.
- 401 (trừ `/auth/*`) → interceptor tự gọi `/auth/refresh` rồi retry request
  cũ; refresh fail mới `clearSession()` + reload. Response interceptor và
  `requestRefresh()` chống gọi refresh song song bằng 1 promise dùng chung.
- Master data (danh mục, chất liệu) cache 1 lần/phiên bằng promise
  module-scope; **không cache kết quả lỗi** (reset promise = null để thử
  lại).
- **Chặn race condition** khi đổi lọc/trang liên tục: đếm request bằng
  `useRef` (`requestIdRef`), tăng ở đầu hàm gọi API, bỏ qua response trả về
  trễ (`if (myRequestId !== requestIdRef.current) return`) — áp dụng cho mọi
  effect fetch theo filter/trang (`useQuoteRequests`, `LibraryPage`,
  `StaffPage`, `DashboardPage`...).

---

## 4. Dữ liệu & tính toán

- **Giá trị suy diễn (số tiền, tổng, tỷ lệ, chênh lệch) do backend tính và
  trả trong response.** Frontend chỉ hiển thị, không tự cộng/nhân/chia lại
  logic nghiệp vụ.
- `getPriceBreakdown(opt)` / `getLivePriceBreakdown(opt)` là **accessor
  thuần** — chỉ đọc `opt.priceBreakdown` / `opt.livePriceBreakdown` do
  backend trả. FE **không** tự suy phần chất liệu/đá từ
  `quotedPrice - stonePrice`.
- **Mọi số tiền hiển thị qua `utils/currency.ts`**: `formatCurrency()`
  (`"1.234.567 đ"`, fallback `"---"`) cho hiển thị, `formatNumberVN()` cho ô
  nhập tiền sửa được — khớp formatter backend (`formatVnd` ở `qms_be`).
- **SALE không thấy cấu thành giá vốn** — backend đã cắt field này khỏi
  response cho role SALE; FE không tìm cách lấy lại hay dựng lại giá vốn từ
  dữ liệu khác. Trước khi kết luận "bug ẩn giá", xác nhận lỗi tái hiện trên
  nhiều role.
- **Chỉ hiển thị số khi có ý nghĩa thật.** Đừng render khối "cấu thành giá"
  khi request/option chưa thật sự có giá (VD `metalRawCost` vẫn 0 vì chưa
  tính) — số phái sinh trên nền 0 (VAT, lãi) ra kết quả vô nghĩa, có thể âm,
  gây hiểu lầm hơn hữu ích. Ẩn cả khối thay vì hiện số sai.

---

## 5. React & hiệu năng

- **`StrictMode` bật** → mọi effect chạy 2 lần khi dev. Phân biệt
  double-fetch do StrictMode (bình thường, `dedupedGet` đã chặn request thật
  trùng) với bug gọi trùng thật sự (thiếu cleanup, dependency sai).
- State + gọi API + flow nghiệp vụ của một màn gom vào **một custom hook**
  (`useQuoteRequests`, `useAuth`...). Component chỉ nhận giá trị + handler.
- `useEffect` phụ thuộc `currentUser` chỉ nên đọc `currentUser?.id` (kể cả
  trong null-check) — object có thể đổi tham chiếu giữa các lần render dù
  cùng 1 người dùng; đưa `.id` vào dep array tránh effect chạy lại/reconnect
  không cần thiết (VD socket realtime) mà vẫn qua đúng lint
  `exhaustive-deps`.
- Callback truyền cho subscription bên ngoài (socket, timer) cần luôn dùng
  bản mới nhất của 1 hàm hay đổi tham chiếu (VD `refreshQuietly`) → giữ qua
  `useRef` cập nhật ở effect riêng, gọi qua `ref.current()` — tránh vừa
  reconnect subscription vừa bị stale closure.
- `useMemo` cho `find()`/`filter()` phái sinh chạy mỗi lần render (danh sách
  lớn, target của popup đang đóng).
- **Route và modal nặng lazy-load** (`lazy()` + `<Suspense fallback={null}>`);
  modal toàn cục chỉ mount khi state mở khác `null`/`true`.
- Realtime: **một** kết nối socket `/realtime` duy nhất suốt phiên đăng
  nhập, `disconnect()` trong cleanup; nghe event qua hằng số ở
  `constants/realtimeEvents.ts`/`constants/chatEvents.ts`, không gõ chuỗi
  tên event.
- Phân quyền route trong `App.tsx`: role không đủ → `<Navigate to="/"
  replace />`. SALE mặc định scope `MY_REQ`, role khác `ALL`.

---

## 6. Styling & design tokens

- **Token màu/bóng khai một chỗ: `:root` trong `src/index.css`** —
  `--primary`, `--primary-dark`, `--border-color`, `--text-main`,
  `--text-muted`, `--text-light`, `--tone-*-bg/text`, `--shadow-sm/md/lg`;
  song song `@theme` khai token Tailwind tương ứng (`--color-*`,
  `--shadow-*`, `--font-sans`, `--animate-*`) để dùng qua utility
  (`bg-surface`, `text-muted`, `shadow-sm`, `font-sans`...). CSS/class mới
  tham chiếu `var(--…)` hoặc utility sinh từ token, không đặt hex mới lẻ tẻ.
- **Font chữ: Roboto duy nhất**, khai 1 lần qua token `--font-sans` trong
  `@theme` — mọi nơi (kể cả `font-sans` utility, `button/input/select`) thừa
  hưởng từ token này, không khai `font-family` lẻ tẻ trong component.
- **Màu trạng thái đơn hàng lấy từ bảng meta trong `src/constants/`**
  (`STATUS_BADGE_META`, `STATUS_CHART_META`, `STATUS_COUNT_KEYS`). Component
  (`StatusPill`, biểu đồ) đọc từ đó, không khai lại hex trạng thái.
- **Tông giao diện: gần đơn sắc, nền sáng.** Tránh bề mặt/nút màu nhấn. Xanh
  lá/đỏ chỉ dùng cho **biến động giá** (tăng/giảm) và badge trạng thái đã
  chuẩn hoá. Toast xác nhận thao tác dùng tông xám/trắng, không màu nhấn.
- Cách viết style, theo thứ tự ưu tiên: **(1) Tailwind utility class**, kết
  hợp hằng dùng chung ở `src/styles/classNames.ts` (`cardCls`,
  `modalCardCls`, `formControlCls`, `btnInspPrimaryCls`, `statusPillCls`...)
  — nguồn duy nhất cho style giao diện, `index.css` không giữ class tay nào
  để tham chiếu; **(2) inline `style={{}}` chỉ cho giá trị động runtime**
  (biến tính toán, màu lấy từ biến JS, thư viện ngoài như recharts). Tuyệt
  đối không dùng inline style tĩnh. Bảng tra cứu chi tiết (thuộc tính, màu,
  điều kiện, cú pháp nâng cao): `TAILWIND_CHEATSHEET.md`.
- Icon: **`lucide-react`** (không emoji/Unicode glyph), truyền `size` (12
  nhỏ / 14–16 thường / 24+ lớn), màu qua `color` prop hoặc `currentColor`.
- Số căn cột (giá, ngày, mã) dùng `font-variant-numeric: tabular-nums`
  (`[font-variant-numeric:tabular-nums]`).
- Modal/bảng rộng cuộn ngang trong khung riêng (`overflow-x-auto` trên
  `<div>` bọc `<table>`), không để body trang cuộn ngang; header bảng dùng
  `sticky top-0`.
- Ảnh sản phẩm dạng lưới (card vuông): `<img>` đặt `absolute inset-0` bên
  trong khung `relative ... aspect-square` — nếu `<img>` nằm trong luồng
  (`w-full h-full` thường), ảnh gốc dọc/ngang khác nhau sẽ kéo khung cao
  thấp lệch nhau giữa các card.
- Giữ chiều cao dòng cố định giữa chế độ xem và chế độ sửa (`tdCls`
  `min-h-[38px]` / `valueBoxCls` box-model khớp input) — tránh bảng "nhảy"
  làm bấm trúng nhầm dòng.

---

## 7. Trạng thái bất đồng bộ (loading / empty / error / success)

- Hai loại loading, không lẫn: **`loading`** = thao tác ghi dữ liệu → overlay
  chặn toàn màn (`LoadingOverlay` + message tiếng Việt); **`listLoading`** =
  load/refresh danh sách khi đổi tab/lọc → thanh tiến trình mỏng
  (`NavProgressBar`), không chặn UI.
- Lỗi hành động hiện tại báo bằng `alert(\`${errorPrefix}: ${err.message}\`)`
  theo khuôn `runAction` trong hook — giữ nhất quán khuôn này; message do BE
  trả (tiếng Việt) hoặc fallback tiếng Việt.
- Thành công nhẹ: `Toast` góc dưới-phải, tự ẩn sau ~3.5s (timer trong hook).
- `ErrorBoundary` bọc toàn app ở `main.tsx` — không hiển thị mã lỗi/JSON thô
  cho người dùng cuối.
- Fetch phụ (tỉnh/phường, master data) nuốt lỗi trả mảng/giá trị rỗng +
  `console.error`, không làm vỡ màn hình.

---

## 8. Ngôn ngữ & nội dung

- **Toàn bộ chữ hiển thị viết tiếng Việt** — nhãn, nút, tiêu đề, thông báo
  lỗi, message loading, tooltip, kể cả phụ đề nhỏ (chức danh, trạng thái).
  Không sót copy tiếng Anh kiểu placeholder ("Store Associate", "System
  Admin"...).
- Fallback hiển thị (tên người dùng, nhãn rỗng...) dùng dữ liệu thật đã có
  (VD `user.email` khi `user.name` trống) — **không hardcode tên/giá trị
  mẫu** làm fallback, dễ hiểu nhầm là dữ liệu thật.
- Chuỗi lặp lại (nhãn trạng thái, nhãn vai trò) đặt trong `constants/`
  (`STATUS_*_META`, `ROLE_SWITCH_LABEL`, `staffLabels.ts`), không rải chuỗi
  trong JSX.
- Ngày giờ và số định dạng theo `vi-VN`.

---

## 9. Mock khi backend chưa sẵn sàng

Hiện tại **không có nhánh mock nào** trong `src/services/api.ts` — mọi hàm
gọi thẳng API thật. Nếu về sau cần dựng UI trước khi BE có endpoint, theo
đúng khuôn sau (đừng để mock trôi nổi trong component):

- Gói mock sau một cờ (`const XXX_MOCK = true` khai đầu `api.ts`), ghi chú rõ
  "xóa cả block + đổi cờ về false là hết".
- Hàm API vẫn giữ đúng chữ ký thật; nhánh mock chỉ chèn ở đầu, `_delay()` giả
  độ trễ. Không để logic mock lẫn vào component.
- Trước khi merge: rà lại `api.ts` không còn cờ mock nào bật `true`.

---

## 10. Cấu hình môi trường

- Biến build qua `import.meta.env.VITE_*` (`VITE_API_BASE`,
  `VITE_API_PROXY_TARGET`, `VITE_DEFAULT_PRICER_EMAIL`). Đổi giá trị cần
  build/deploy lại frontend.
- Không hardcode URL backend trong component — đi qua `API_BASE` ở `api.ts`.
- `vite.config.ts` chia vendor chunk sẵn (`vendor-react`, `vendor-charts`,
  `vendor-network`, `vendor-icons`); thêm thư viện lớn cân nhắc khai group
  tương ứng.

---

## 11. Kiểm tra trước khi merge

```bash
cd qms_fe && pnpm build     # tsc -b + vite build — BẮT BUỘC pass
cd qms_fe && pnpm lint      # oxlint — không lỗi mới
```

- `tsconfig.app.json` bật `noUnusedLocals`/`noUnusedParameters` — biến/tham
  số thừa làm build fail; xoá hoặc đặt tiền tố `_`.
- Nếu đổi field API: cập nhật type ở `src/types/index.ts` và khuôn sanitize
  payload ở `api.ts` (`sanitizeQuoteOption`/`sanitizeQuoteRequestPayload`) —
  NestJS whitelist ở BE sẽ reject field lạ.
- Nếu đổi màu/nhãn trạng thái: sửa ở bảng meta `constants/`, không sửa rải
  trong component.
- Hàm API export ra mà không còn nơi nào gọi (kể cả nội bộ `api.ts`) là dead
  code — xoá hẳn, đừng để tồn đọng "phòng khi cần".

---

## 12. Git

- **Claude Code/công cụ AI không tự tạo commit, branch, worktree** hay thao
  tác git trong dự án này. Người phát triển tự quản git.
- Commit message **không** kèm trailer `Co-Authored-By: Claude`.
