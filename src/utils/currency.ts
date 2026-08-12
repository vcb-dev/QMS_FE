/**
 * Định dạng một số thành chuỗi số theo kiểu Việt Nam (dấu chấm phân cách hàng nghìn),
 * không kèm ký hiệu tiền tệ — dùng cho các ô nhập liệu số tiền có thể chỉnh sửa.
 */
export function formatNumberVN(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || !Number.isFinite(num)) return '';
  return Math.round(num).toLocaleString('vi-VN');
}

/**
 * Định dạng một số thành tiền Việt Nam (VD: 1234567 -> "1.234.567 đ").
 * Trả về `fallback` nếu giá trị null/undefined/NaN — dùng cho MỌI nơi hiển thị số tiền.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  fallback: string = '---'
): string {
  const formatted = formatNumberVN(value);
  if (!formatted) return fallback;
  return `${formatted} đ`;
}
