import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

// Xem ảnh phóng to toàn màn hình dùng chung — trích ra vì DetailPage/ChatPopup/ProductSpecModal
// đều cần y hệt: lăn chuột zoom, kéo để pan khi đã zoom, ESC đóng, phím trái/phải đổi ảnh khi có
// nhiều ảnh. Nơi gọi chỉ cần tự quản lý index ảnh đang xem (activeIndex) + có mở lightbox hay không.
//
// Zoom/pan dựng bằng CSS transform (translate + scale) trên chính thẻ <img>, KHÔNG dùng
// overflow:auto + scrollLeft/scrollTop — cách cũ bị lệch vì container canh giữa bằng flexbox
// (justify-content/align-items: center) khiến vùng cuộn thực tế không khớp toạ độ con trỏ, kéo
// cảm giác như đang kéo cả màn hình chứ không phải kéo ảnh.
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, activeIndex, onIndexChange, onClose }) => {
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startY: 0, panStartX: 0, panStartY: 0 });

  const currentIdx = Math.min(activeIndex, Math.max(0, images.length - 1));

  const resetView = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragInfo.current = { startX: e.clientX, startY: e.clientY, panStartX: pan.x, panStartY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const { startX, startY, panStartX, panStartY } = dragInfo.current;
    setPan({ x: panStartX + (e.clientX - startX), y: panStartY + (e.clientY - startY) });
  };

  const handleMouseUp = () => setIsDragging(false);

  const goPrev = () => {
    onIndexChange(currentIdx > 0 ? currentIdx - 1 : images.length - 1);
    resetView();
  };
  const goNext = () => {
    onIndexChange(currentIdx < images.length - 1 ? currentIdx + 1 : 0);
    resetView();
  };

  // Đóng lightbox khi bấm ESC, đổi ảnh bằng phím mũi tên trái/phải (chỉ khi có nhiều ảnh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (images.length > 1) {
        if (e.key === 'ArrowLeft') goPrev();
        else if (e.key === 'ArrowRight') goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, images.length]);

  return createPortal(
    <div
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setZoomScale((s) => {
          const next = Math.min(4, Math.max(1, s + (e.deltaY < 0 ? 0.2 : -0.2)));
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={clsx(
        "fixed inset-0 z-[99999] bg-[rgba(15,23,42,0.9)] backdrop-blur-[6px] flex items-center justify-center p-[40px] overflow-hidden",
        zoomScale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-out",
        isDragging ? "select-none" : "select-auto"
      )}
    >
      {/* Nút Đóng (Top-Right) */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-[20px] right-[24px] bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.3)] border-none rounded-full w-[42px] h-[42px] flex items-center justify-center text-white cursor-pointer z-10 transition-colors duration-150"
        title="Đóng (Esc)"
      >
        <X size={22} />
      </button>

      {/* Thông tin số thứ tự ảnh & Hướng dẫn */}
      <span
        className="fixed top-[24px] left-1/2 -translate-x-1/2 text-[rgba(255,255,255,0.9)] text-[13px] font-bold bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px] py-[6px] px-[16px] rounded-[20px] z-10 tracking-[0.3px]"
      >
        {images.length > 1 ? `Ảnh ${currentIdx + 1}/${images.length} · ` : ''}
        Lăn chuột để zoom ({Math.round(zoomScale * 100)}%){zoomScale > 1 ? ' · Kéo để xem các góc ảnh' : ''}
        {images.length > 1 ? ' · Phím ← / → để đổi ảnh' : ''}
      </span>

      {/* Nút lùi ảnh */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="fixed left-[24px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.3)] hover:scale-110 backdrop-blur-[4px] border-none rounded-full w-[50px] h-[50px] flex items-center justify-center text-white cursor-pointer z-10 transition-all duration-150"
          title="Ảnh trước (Phím ←)"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Nút tới ảnh */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="fixed right-[24px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.3)] hover:scale-110 backdrop-blur-[4px] border-none rounded-full w-[50px] h-[50px] flex items-center justify-center text-white cursor-pointer z-10 transition-all duration-150"
          title="Ảnh kế tiếp (Phím →)"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Ảnh phóng to chính — zoom/pan bằng transform, không dùng scroll */}
      <img
        src={images[currentIdx]}
        alt="Xem phóng to"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleImageMouseDown}
        className={clsx(
          "max-w-[85vw] max-h-[80vh] w-auto h-auto object-contain rounded-[10px] shadow-[0_16px_48px_rgba(0,0,0,0.6)] origin-center",
          zoomScale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        )}
        // động — giữ inline
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`,
          transition: isDragging ? 'none' : 'transform 0.05s linear',
        }}
      />

      {/* Dải thumbnail thu nhỏ dưới đáy Lightbox */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-[20px] left-1/2 -translate-x-1/2 flex gap-[10px] bg-[rgba(15,23,42,0.75)] backdrop-blur-[8px] py-[8px] px-[14px] rounded-[16px] z-10 max-w-[90vw] overflow-x-auto shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
        >
          {images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt=""
              onClick={() => {
                onIndexChange(idx);
                resetView();
              }}
              className={clsx(
                "w-[48px] h-[48px] rounded-[8px] object-cover cursor-pointer shrink-0 transition-all duration-150 hover:opacity-100",
                currentIdx === idx
                  ? "border-2 border-solid border-[#3b82f6] shadow-[0_0_0_2px_rgba(59,130,246,0.5)] opacity-100"
                  : "border border-solid border-[rgba(255,255,255,0.2)] shadow-none opacity-50"
              )}
              title={`Chuyển sang ảnh ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};
