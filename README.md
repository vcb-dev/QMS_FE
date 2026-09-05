# Hệ Thống Quản Lý Báo Giá Trang Sức (QMS) — Frontend

Frontend cho hệ thống quản lý báo giá trang sức của Viễn Chí Bảo. Hỗ trợ 3 vai trò:

- **SALE** — tạo yêu cầu báo giá, dùng máy tính giá, tra cứu thư viện sản phẩm.
- **ORDER** — báo giá cho yêu cầu, cấu hình giá kim loại/đá/công.
- **ADMIN** — toàn quyền: quản lý nhân viên, khách hàng, cấu hình giá, cấu hình thông báo Lark.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- react-router-dom, axios, socket.io-client (realtime), recharts (biểu đồ)
- `oxlint` cho lint

## Yêu cầu

- Node.js, **pnpm** (không dùng `npm`)
- Backend `qms_be` (thư mục anh em, `../qms_be`) chạy sẵn ở `http://localhost:8000`

## Cài đặt & chạy

```bash
pnpm install
pnpm dev        # dev server, mặc định http://localhost:5173
```

Biến môi trường (`.env`):

```
VITE_API_BASE=http://localhost:8000/api
VITE_API_PROXY_TARGET=http://localhost:8000
```

## Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Chạy dev server (Vite + HMR) |
| `pnpm build` | `tsc -b && vite build` — build production, có type-check |
| `pnpm lint` | `oxlint` |
| `pnpm preview` | Xem thử bản build production |

## Cấu trúc thư mục

```
src/
├── pages/       ← 1 file / 1 route (RequestsPage, DetailPage, CalculatorPage, ...)
├── components/  ← component dùng chung (modal, bảng, header, sidebar...)
├── hooks/       ← state + logic dùng chung nhiều nơi (useQuoteRequests, useMaterialStoneRows...)
├── services/    ← api.ts — toàn bộ lời gọi API tới qms_be
├── styles/      ← classNames.ts — hằng className Tailwind dùng chung
├── types/       ← type dùng chung toàn app
├── constants/   ← hằng số / bảng dữ liệu tĩnh
├── utils/       ← hàm thuần (format tiền, ngày, breakdown giá...)
├── auth/        ← AuthGate — quản lý phiên đăng nhập
└── index.css    ← @theme token Tailwind + reset + @keyframes (không chứa class CSS viết tay)
```

## Quy ước quan trọng

- **Tailwind-only**: không viết class CSS tay mới. Class dùng chung/lặp lại ≥2 lần → `src/styles/classNames.ts`. Bảng tra cứu chi tiết: `doc/TAILWIND_CHEATSHEET.md`.
- **FE không tính giá**: mọi công thức tính giá/VAT/lãi nằm ở backend. Frontend chỉ hiển thị số backend trả về, không cộng/trừ/nhân/chia trên số tiền.
- **Tiền tệ**: luôn định dạng qua `utils/currency.ts` (dạng Việt Nam, VD `1.234.567 đ`).
- **`pnpm`, không `npm`.**
- Quy tắc tuân thủ FE đầy đủ (đồng thời là UI-kit FE): `doc/CONVENTIONS.md`.
