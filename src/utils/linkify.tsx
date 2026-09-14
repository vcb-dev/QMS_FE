import React from 'react';

// Chỉ nhận link http(s) — chặn luôn scheme khác (vd javascript:) lọt vào href.
const URL_SPLIT_REGEX = /(https?:\/\/[^\s<>"']+)/g;
const isUrl = (s: string) => /^https?:\/\//.test(s);

// Tách 1 đoạn text tự do (VD: QuoteRequest.note Sale gõ tay) theo link http(s) trong đó, bọc từng
// link thành <a target="_blank">, phần còn lại giữ nguyên plain text — dùng cho các ô ghi chú có
// thể chứa link ảnh/video để người xem bấm được thẳng, không phải copy URL ra dán vào trình duyệt.
export function renderTextWithLinks(text: string): React.ReactNode {
  return text.split(URL_SPLIT_REGEX).map((part, idx) =>
    isUrl(part) ? (
      <a
        key={idx}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline break-all"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    ),
  );
}
