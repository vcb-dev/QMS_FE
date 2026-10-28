// Tiện ích nhà cung cấp (NCC): nhãn hiển thị, so khớp tìm kiếm không dấu, định dạng thời gian.

// "NCC-0001 – Tên" (+ " (đã xóa)" khi NCC đã bị xóa mềm sau khi gắn vào yêu cầu).
export function supplierLabel(s: { code: string; name: string; deletedAt?: string | null }): string {
  return `${s.code} – ${s.name}${s.deletedAt ? ' (đã xóa)' : ''}`;
}

// Thường hóa + bỏ dấu tiếng Việt để gõ "vang phu" vẫn tìm ra "Vàng Phú". `đ` không tách được bằng NFD
// nên thay riêng — phải thường hóa TRƯỚC để `Đ` thành `đ` rồi mới thay.
export function foldVi(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

// Khớp mã hoặc tên; query rỗng khớp tất cả.
export function matchSupplier(s: { code: string; name: string }, query: string): boolean {
  const q = foldVi(query.trim());
  if (!q) return true;
  return foldVi(s.code).includes(q) || foldVi(s.name).includes(q);
}

// "dd/MM/yyyy HH:mm" (giờ máy người dùng). Tự ghép thay vì toLocaleString('vi-VN') vì locale đó đặt giờ
// đứng TRƯỚC ngày. Rỗng/không hợp lệ → ''.
export function formatSupplierTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
