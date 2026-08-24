import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Gem, Weight } from 'lucide-react';
import type { ProductSpecModalProps } from '../types';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { ImageLightbox } from './ImageLightbox';

const STATUS_TAG: Record<string, { label: string; bg: string; color: string }> = {
  CLOSED: { label: 'Đã chốt', bg: '#dcfce7', color: '#15803d' },
  SELECTED: { label: 'Đang chọn', bg: '#e2e8f0', color: '#475569' },
};

export const ProductSpecModal: React.FC<ProductSpecModalProps> = ({ item, onClose, onViewRequest }) => {
  const images = item.images && item.images.length > 0 ? item.images : [];
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const mainImgUrl = images[activeIdx]?.imageUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
  const tag = item.option.selectionStatus ? STATUS_TAG[item.option.selectionStatus] : undefined;

  return createPortal(
    <>
    <div className="modal-backdrop show" onClick={onClose}>
      <div className="modal-card product-spec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</h2>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
              {item.code} · {item.option.optionName}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', flexShrink: 0, padding: '4px', marginLeft: '10px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="product-spec-grid">
          {/* Cột ảnh */}
          <div className="product-spec-image-col">
            <img
              src={mainImgUrl}
              alt=""
              onClick={() => images.length > 0 && setZoomOpen(true)}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: images.length > 0 ? 'zoom-in' : 'default' }}
            />
            {images.length > 1 && (
              <div style={{ position: 'absolute', left: '12px', right: '12px', bottom: '12px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                {images.map((img, idx) => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt=""
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '7px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      flexShrink: 0,
                      border: idx === activeIdx ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.7)',
                      opacity: idx === activeIdx ? 1 : 0.75,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cột thông tin */}
          <div className="product-spec-info-col">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)' }}>
                {formatCurrency(item.option.quotedPrice)}
              </div>
              {tag && (
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', background: tag.bg, color: tag.color, flexShrink: 0 }}>
                  {tag.label}
                </span>
              )}
            </div>

            {/* Chất liệu + Đá quý — cùng 1 hàng, kẻ dọc giữa 2 cột cho dễ phân biệt */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', letterSpacing: '0.3px' }}>
                  <Weight size={13} /> CHẤT LIỆU
                </div>
                {item.option.materials && item.option.materials.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {item.option.materials.map((m, idx) => (
                      <div key={m.materialId || idx} style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        {m.materialName || m.material?.name || 'Chưa rõ'} — <strong>{m.weightChi ?? item.option.weightChi ?? 0} chỉ</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                    {item.matStr}{item.weightDisplay ? ` — ${item.weightDisplay}` : ''}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px', letterSpacing: '0.3px' }}>
                  <Gem size={13} /> ĐÁ QUÝ
                </div>
                {item.option.stones && item.option.stones.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {item.option.stones.map((s, idx) => (
                      <div key={s.stoneId || idx} style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        <strong>{s.quantity} viên</strong> {s.stoneName || s.stone?.name || 'đá'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{item.stoneDisplay}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="tool-btn" onClick={onClose}>Đóng</button>
          <button
            type="button"
            onClick={onViewRequest}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: 'var(--primary)', color: 'white',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
          >
            Xem đơn gốc <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
    {zoomOpen && images.length > 0 && (
      <ImageLightbox
        images={images.map((img) => img.imageUrl)}
        activeIndex={activeIdx}
        onIndexChange={setActiveIdx}
        onClose={() => setZoomOpen(false)}
      />
    )}
    </>,
    document.body
  );
};
