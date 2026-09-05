# Bảng tra cứu Tailwind (qms_fe)

Tài liệu tra cứu khi viết class Tailwind mới trong `qms_fe` — bổ sung cho
`CONVENTIONS.md` §6 (Styling & design tokens). Toàn bộ style dựng giao diện
trong dự án đã chuyển sang Tailwind; đây là bảng luật để giữ đồng nhất khi
thêm/sửa UI, không phải hướng dẫn migration (đã xong).

## 1. Nguyên tắc cốt lõi

1. **Không đoán giá trị**: giữ chính xác số đo/màu đã có, kể cả số lẻ
   (`11.5px` → `text-[11.5px]`, `#f1f5f9` → `bg-[#f1f5f9]`).
2. Class Tailwind lặp **≥ 2 lần** trong 1 file **hoặc** dùng ở nhiều file →
   xuất `export const …Cls` trong `src/styles/classNames.ts`. **Không** khai
   `const …Cls` trong file `.tsx`. Đặt tên có ý nghĩa dựa theo chỗ dùng, xem
   danh mục hằng có sẵn trực tiếp ở `src/styles/classNames.ts` trước khi
   thêm hằng trùng ý nghĩa.
3. Trường hợp phức tạp/không chắc → giữ `style={{}}` + comment
   `// TODO tailwind: <lý do>`, không đoán mò.

---

## 2. Bảng dịch thuộc tính phổ biến

| Inline style | Tailwind class | Ghi chú |
|---|---|---|
| `padding: '10px'` | `p-[10px]` | 1 giá trị |
| `padding: '8px 10px'` | `py-[8px] px-[10px]` | 2 giá trị (dọc/ngang) |
| `padding: '6px 12px 8px 4px'` | `pt-[6px] pr-[12px] pb-[8px] pl-[4px]` | 4 giá trị |
| `margin: '10px'` | `m-[10px]` | Tương tự `my-`/`mx-`/`mt-`/`mb-`/`ml-`/`mr-` |
| `fontSize: '11.5px'` | `text-[11.5px]` | Giữ nguyên số lẻ |
| `fontWeight: 500/600/700/800/900` | `font-medium`/`semibold`/`bold`/`extrabold`/`black` | Số khác: `font-[550]` |
| `borderRadius: '12px'` | `rounded-[12px]` | |
| `borderRadius: '50%'`/`'999px'` | `rounded-full` | |
| `gap: '10px'` | `gap-[10px]` | |
| `display: flex/inline-flex/grid/none/inline-block/block` | `flex`/`inline-flex`/`grid`/`hidden`/`inline-block`/`block` | |
| `flexDirection: column/row` | `flex-col`/`flex-row` | |
| `alignItems: center/flex-start/flex-end` | `items-center`/`items-start`/`items-end` | |
| `justifyContent: space-between/center/flex-end/flex-start` | `justify-between`/`justify-center`/`justify-end`/`justify-start` | |
| `flex: 1` | `flex-1` | |
| `flexShrink: 0` | `shrink-0` | |
| `width: 100%/auto/'460px'` | `w-full`/`w-auto`/`w-[460px]` | |
| `maxWidth: '920px'` | `max-w-[920px]` | |
| `minWidth: '100px'` | `min-w-[100px]` | |
| `height: 100%/'38px'` | `h-full`/`h-[38px]` | |
| `minHeight: '38px'` | `min-h-[38px]` | |
| `position: fixed/absolute/relative/sticky` | `fixed`/`absolute`/`relative`/`sticky` | |
| `top: 0`, `left: '13px'` | `top-0`, `left-[13px]` | Tương tự bottom/right |
| `transform: 'translateY(-50%)'` | `-translate-y-1/2` | |
| `zIndex: 50` | `z-50` | Giá trị lạ: `z-[9999]` |
| `cursor: pointer/not-allowed/default` | `cursor-pointer`/`cursor-not-allowed`/`cursor-default` | |
| `textTransform: uppercase` | `uppercase` | |
| `letterSpacing: '0.4px'`/`'0.04em'` | `tracking-[0.4px]`/`tracking-[0.04em]` | |
| `whiteSpace: nowrap` | `whitespace-nowrap` | |
| `overflow(X/Y): hidden/auto` | `overflow-hidden`/`overflow-x-auto`/`overflow-y-auto` | |
| `border: '1px solid #e2e8f0'` | `border border-border` | Hoặc `border border-[#e2e8f0]` |
| `border: none` | `border-0` | |
| `borderBottom: '1px solid #e5e7eb'` | `border-b border-[#e5e7eb]` | Tương tự `-t`/`-l`/`-r` |
| `outline: none` | `outline-none` | |
| `transition: 'all 0.2s ease'` | `transition` hoặc `transition-[all_0.2s_ease]` | |
| `opacity: 0.5` | `opacity-50` | |
| `textAlign: right/center/left` | `text-right`/`text-center`/`text-left` | |
| `verticalAlign: middle` | `align-middle` | |
| `lineHeight: '1.35'` | `leading-[1.35]` | |
| `objectFit: cover` | `object-cover` | |
| `boxSizing: border-box` | `box-border` | |
| `boxShadow: '0 1px 3px rgba(0,0,0,0.05)'` | `shadow-sm` | Khớp token `@theme` |
| `boxShadow: '...'` khác | `shadow-[...]` | Khoảng trắng → gạch dưới: `shadow-[0_6px_16px_rgba(217,119,6,0.35)]` |
| `pointerEvents: none` | `pointer-events-none` | |

---

## 3. Bảng ánh xạ màu sang token/class

Ưu tiên token `@theme` khai trong `src/index.css`:

| Hex / màu | Class nền | Class chữ | Class viền |
|---|---|---|---|
| `#ffffff`/`white` | `bg-surface` | `text-surface` | `border-surface` |
| `#f8fafc` | `bg-page` (hoặc `bg-[#f8fafc]`) | | `border-[#f8fafc]` |
| `#f1f5f9` | `bg-[#f1f5f9]` | `text-[#f1f5f9]` | `border-[#f1f5f9]` |
| `#e2e8f0` | `bg-[#e2e8f0]` | | `border-border` |
| `#0f172a` | `bg-[#0f172a]` | `text-text` (hoặc `text-[#0f172a]`) | |
| `#64748b` | | `text-muted` | |
| `#94a3b8` | | `text-faint` | |
| `#334155` | `bg-[#334155]` | `text-[#334155]` | |
| `#2563eb` | `bg-primary` | `text-primary` | `border-primary` |
| `#1d4ed8` | `bg-primary-dark` | `text-primary-dark` | |
| `#d97706` | `bg-[#d97706]` | `text-[#d97706]` | |
| Tone Blue (`#eff6ff`/`#1d4ed8`) | `bg-tone-blue-bg` | `text-tone-blue-text` | |
| Tone Indigo (`#e0e7ff`/`#4338ca`) | `bg-tone-indigo-bg` | `text-tone-indigo-text` | |
| Tone Amber (`#fef3c7`/`#b45309`) | `bg-tone-amber-bg` | `text-tone-amber-text` | |
| Tone Green (`#dcfce7`/`#15803d`) | `bg-tone-green-bg` | `text-tone-green-text` | |
| Tone Purple (`#f3e8ff`/`#7e22ce`) | `bg-tone-purple-bg` | `text-tone-purple-text` | |
| Tone Rose (`#ffe4e6`/`#be123c`) | `bg-tone-rose-bg` | `text-tone-rose-text` | |
| Hex khác | `bg-[#hex]` | `text-[#hex]` | `border-[#hex]` |

---

## 4. Xử lý điều kiện & ghép class

```tsx
import { clsx } from 'clsx';

// Điều kiện đơn giản
className={clsx('base-class', isActive ? 'bg-primary text-surface' : 'bg-surface text-muted')}

// Ghép hằng dùng chung + class cục bộ
import { cardCls } from '../styles/classNames';
className={clsx(cardCls, 'p-[20px]')}
```

---

## 5. Khi nào giữ `style={{}}` (động)

Bắt buộc giữ inline khi giá trị phụ thuộc runtime:

1. `` width: `${pct}%` ``, `style={{ width: barWidth }}` (biến tính toán).
2. `background: computedColor` — màu lấy từ biến JavaScript.
3. `` transform: `translateX(${x}px)` `` theo toạ độ động.
4. Style truyền cho thư viện ngoài (recharts `<Cell style>`,
   `<XAxis tick={{...}}>`, `<Tooltip contentStyle>`...).
5. Kèm comment ngay trên dòng: `// động — giữ inline` (hoặc `// động —
   recharts`).
6. Element vừa tĩnh vừa động: phần tĩnh → `className`, `style={{}}` chỉ giữ
   phần động.

---

## 6. Cú pháp nâng cao (CSS đặc biệt → Tailwind)

| Cú pháp CSS | Tailwind v4 tương đương |
|---|---|
| `:hover` | `hover:…` |
| `:hover:not(:disabled)` | `enabled:hover:…` |
| `:disabled` | `disabled:…` |
| `:focus` | `focus:…` |
| Class trạng thái do JS thêm (`.active`/`.selected`/`.expanded`/`.show`) | ưu tiên `clsx('base', isActive && 'bg-… border-…')`; nếu là `data-*` sẵn có → `data-[active]:…` |
| `[data-copied]`/`[aria-selected='true']`/`[data-active]` | `data-[copied]:…`/`aria-selected:…`/`data-[active]:…` |
| Selector con `.x td`/`.x button`/`.x svg`/`.x .y` | trên `.x`: `[&_td]:…`/`[&_button]:…`/`[&_svg]:…`/`[&_.y]:…` |
| Selector con + trạng thái `.x tr:hover` | `[&_tr:hover]:…` |
| `> div` (con trực tiếp) | `[&>div]:…` |
| `:first-child`/`:last-child` | `first:…`/`last:…` |
| `@media (max-width: 860px)` | `max-[860px]:…` |
| `!important` | thêm `!` (VD `!py-[14px]`, `!grid-cols-1`) — giữ đúng chỗ CSS gốc có `!important` |
| `animation: spin 1s linear infinite` | `animate-[spin_1s_linear_infinite]` (hoặc token `--animate-*` nếu dùng lặp lại) |

**Khi bí:** không dịch sạch được trong ~15 phút → giữ class cũ +
`// TODO tailwind: <lý do>`, đi tiếp, không đoán mò.

---

## 7. Hằng className dùng chung

Toàn bộ hằng `...Cls` (khoảng 60+, VD `modalCardCls`, `formControlCls`,
`btnInspPrimaryCls`, `statusPillCls`, `dropdownItemHoverCls`, `specColCls`,
`navBtnActiveCls`...) khai và có comment mô tả ngay tại
`src/styles/classNames.ts` — đọc trực tiếp file đó để tra cứu, tránh liệt kê
lại ở đây rồi lệch khi có hằng mới thêm vào.
