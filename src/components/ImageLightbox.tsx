import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out',
        overflow: 'hidden',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Nút Đóng (Top-Right) */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        title="Đóng (Esc)"
      >
        <X size={22} />
      </button>

      {/* Thông tin số thứ tự ảnh & Hướng dẫn */}
      <span
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '13px',
          fontWeight: 700,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          padding: '6px 16px',
          borderRadius: '20px',
          zIndex: 10,
          letterSpacing: '0.3px',
        }}
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
          style={{
            position: 'fixed',
            left: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
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
          style={{
            position: 'fixed',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
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
        style={{
          maxWidth: '85vw',
          maxHeight: '80vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: '10px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.05s linear',
        }}
      />

      {/* Dải thumbnail thu nhỏ dưới đáy Lightbox */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: '16px',
            zIndex: 10,
            maxWidth: '90vw',
            overflowX: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
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
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                objectFit: 'cover',
                cursor: 'pointer',
                border: currentIdx === idx ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                boxShadow: currentIdx === idx ? '0 0 0 2px rgba(59,130,246,0.5)' : 'none',
                opacity: currentIdx === idx ? 1 : 0.5,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => {
                if (currentIdx !== idx) e.currentTarget.style.opacity = '0.5';
              }}
              title={`Chuyển sang ảnh ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};
