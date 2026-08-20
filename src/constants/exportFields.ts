// Danh sách cột export Excel hiển thị ở ExportModal — khớp đúng key với EXPORT_FIELD_DEFS bên BE
// (qms_be/src/quote-requests/dto/export-field-defs.ts). Đổi ở đây nhớ đổi cả bên đó.
export const EXPORT_FIELDS: { key: string; label: string }[] = [
  { key: 'code', label: 'Mã yêu cầu' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'category', label: 'Danh mục' },
  { key: 'productName', label: 'Sản phẩm' },
  { key: 'material', label: 'Chất liệu' },
  { key: 'customerName', label: 'Khách hàng' },
  { key: 'customerPhone', label: 'SĐT khách hàng' },
  { key: 'requester', label: 'Người yêu cầu' },
  { key: 'requesterDept', label: 'Phòng ban yêu cầu' },
  { key: 'assignee', label: 'Người báo giá' },
  { key: 'quotedPrice', label: 'Giá báo' },
  { key: 'vat', label: 'VAT (%)' },
  { key: 'quotedDate', label: 'Ngày báo giá' },
  { key: 'desiredLeadTime', label: 'Thời gian mong muốn' },
  { key: 'closeRatePct', label: 'Tỉ lệ chốt (%)' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'updatedAt', label: 'Cập nhật lần cuối' },
];
