// Hiển thị trong lúc chunk lazy của một route đang được tải (Suspense). Không chặn thao tác,
// tông xám/trắng đơn sắc như phần còn lại của app — thay cho khoảng trắng khi mạng chậm.
export const RouteFallback = () => (
  <div
    className="flex-1 min-h-[240px] flex items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <span className="w-[26px] h-[26px] rounded-full border-[3px] border-solid border-[#e2e8f0] border-t-[#475569] animate-[spin_0.8s_linear_infinite]" />
    <span className="sr-only">Đang tải nội dung…</span>
  </div>
);
