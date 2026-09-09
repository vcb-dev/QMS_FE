import { useEffect, useRef } from 'react';

// Hành vi bàn phím / trợ năng dùng chung cho mọi modal:
//   - Nhấn Esc để đóng.
//   - Khoá cuộn nền (document.body) trong lúc modal mở.
//   - Đưa tiêu điểm vào modal khi mở, trả tiêu điểm về phần tử cũ khi đóng.
//
// KHÔNG bẫy Tab cứng: vài modal (CreateModal, PricingModal) render dropdown qua createPortal ra
// ngoài cây modal, bẫy cứng sẽ chặn không cho Tab tới các panel đó. Thuộc tính aria-modal="true"
// trên phần tử card đã đủ tín hiệu cho trình đọc màn hình.
//
// Trả về ref để gắn vào phần tử card của modal.
export function useModalA11y(onClose: () => void, active = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Giữ onClose qua ref để effect chỉ phụ thuộc `active` — cha truyền onClose mới mỗi lần render
  // sẽ không khiến effect chạy lại (focus lại / khoá cuộn lại) vô cớ.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    const restoreFocusTo = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const firstFocusable = container?.querySelector<HTMLElement>(
      'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    (firstFocusable ?? container)?.focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      restoreFocusTo?.focus?.();
    };
  }, [active]);

  return containerRef;
}
