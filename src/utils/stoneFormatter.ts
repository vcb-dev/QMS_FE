import type { QuoteOption, Role } from '../types';

interface StoneInput {
  name?: string;
  cut?: string | null;
  size?: string | null;
  price?: number;
}

export function formatStoneDisplay(stone: StoneInput, role?: Role | null): string {
  const parts = [stone.name];
  if (stone.cut) parts.push(stone.cut);
  if (stone.size) parts.push(stone.size);

  const baseText = parts.filter(Boolean).join(' - ');

  if ((role === 'ADMIN' || role === 'ORDER') && stone.price !== undefined) {
    return `${baseText} - ${new Intl.NumberFormat('vi-VN').format(stone.price)}đ`;
  }

  return baseText;
}

// Thông số đá của 1 phương án ở trang chi tiết: "21 viên (1v Kim cương - Round - 5.0mm, 20v Kim cương
// - Round - 1.3mm (đá tấm))". Kèm giác cắt/size vì tên đá trùng nhau giữa nhiều size và giữa đá chủ/
// đá tấm. Phương án CHƯA có giá (đá Sale chọn lúc tạo yêu cầu) liệt kê mỗi loại đá 1 dòng (nối "\n" —
// nơi hiển thị cần white-space: pre-line), không ghi số viên: form tạo không nhập số lượng, BE tự gán
// 1 viên/loại, và các đá đó có thể chỉ là lựa chọn cho khách.
// Không có dòng đá (Order nhập tay giá đá) -> chỉ "Có/Không đính đá" theo tiền đá, KHÔNG dùng
// stoneDescription: đó là chữ gõ tự do, form còn điền sẵn "Đá tổng". Tiền đá đọc cả priceBreakdown
// vì stoneCost (giá vốn) bị BE cắt khi người xem là Sale.
export function formatOptionStoneSpec(
  opt: Pick<QuoteOption, 'stones' | 'stoneCost' | 'priceBreakdown' | 'quotedPrice'> | null | undefined,
): string {
  const stones = opt?.stones ?? [];
  if (stones.length > 0) {
    const labels = stones.map((s) => {
      const label = formatStoneDisplay({ name: s.stoneName || s.stone?.name || 'đá', cut: s.stoneCut, size: s.stoneSize });
      const isSide = (s.stoneType ?? s.stone?.stoneType) === 'SIDE';
      return `${label}${isSide ? ' (đá tấm)' : ''}`;
    });
    if (opt?.quotedPrice == null) return labels.join('\n');
    const total = stones.reduce((sum, s) => sum + (s.quantity || 1), 0);
    const names = labels.map((label, i) => `${stones[i].quantity}v ${label}`).join(', ');
    return `${total} viên (${names})`;
  }
  if (Number(opt?.stoneCost) > 0 || Number(opt?.priceBreakdown?.stone) > 0) return 'Có đính đá';
  return 'Không đính đá';
}

// Thông số đá của CẢ đơn — gộp nhiều phương án như ô Chất liệu: máy tính giá tách mỗi loại đá thành 1
// phương án riêng, chỉ đọc phương án chính thì mất các loại đá còn lại. Mỗi tổ hợp đá khác nhau 1 dòng
// (bỏ trùng). Có dòng đá cụ thể thì bỏ các dòng chung chung "Có/Không đính đá" của phương án khác.
export function formatOptionsStoneSpec(opts: Parameters<typeof formatOptionStoneSpec>[0][]): string {
  const lines = [...new Set(opts.flatMap((o) => formatOptionStoneSpec(o).split('\n')))];
  const concrete = lines.filter((l) => l !== 'Có đính đá' && l !== 'Không đính đá');
  if (concrete.length > 0) return concrete.join('\n');
  return lines.includes('Có đính đá') ? 'Có đính đá' : 'Không đính đá';
}
