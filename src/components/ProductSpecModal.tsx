import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, Coins, Copy, Check } from 'lucide-react';
import type { ProductSpecModalProps, QuoteHistoryEntry } from '../types';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getPriceBreakdown, getLivePriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { ImageLightbox } from './ImageLightbox';
import { formatPriceRange } from '../utils/quoteOption';
import { fetchLibraryProductHistory } from '../services/api';

const HISTORY_PAGE_SIZE = 20;

// Chỉ phương án khách CHỐT THẬT (CLOSED) mới gắn tag. SELECTED ("Sale đang nghiêng về") không gắn.
const STATUS_TAG: Record<string, { label: string; bg: string; color: string }> = {
  CLOSED: { label: 'Đã chốt', bg: '#dcfce7', color: '#15803d' },
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN') : '—';

export const ProductSpecModal: React.FC<ProductSpecModalProps> = ({ item, onClose, filters }) => {
  const images = item.images && item.images.length > 0 ? item.images : [];
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const mainImgUrl = images[activeIdx]?.imageUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

  // Lịch sử báo giá — KHÔNG gửi kèm list nữa (nhóm có thể vài nghìn đơn). Lazy-load theo trang khi
  // mở modal; nút "Tải thêm" tải trang tiếp theo. Truyền cùng bộ lọc ngoài để khớp view đang lọc.
  const [history, setHistory] = useState<QuoteHistoryEntry[]>([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histLoading, setHistLoading] = useState(false);
  const [selIdx, setSelIdx] = useState(0);
  const selected = history[selIdx] ?? history[0];

  // Copy giá "sống" (Hôm nay ~) của phương án — fallback về giá gốc nếu option chưa có livePrice.
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  useEffect(() => { setCopiedIdx(null); setCopiedAll(false); }, [selIdx]);

  const optLine = (o: { optionName: string; price: number; livePrice?: number | null }) =>
    `${o.optionName}: ${formatCurrency(o.livePrice ?? o.price)}`;

  const handleCopyOption = (idx: number, o: { optionName: string; price: number; livePrice?: number | null }) => {
    navigator.clipboard.writeText(optLine(o)).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAll = (opts: { optionName: string; price: number; livePrice?: number | null }[]) => {
    navigator.clipboard.writeText(opts.map(optLine).join('\n')).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!item.groupKey) return;
    let cancelled = false;
    setHistLoading(true);
    fetchLibraryProductHistory({
      groupKey: item.groupKey,
      page: histPage,
      limit: HISTORY_PAGE_SIZE,
      ...(filters || {}),
    })
      .then((res) => {
        if (cancelled) return;
        setHistory((prev) =>
          histPage === 1 ? res.data : [...prev, ...res.data],
        );
        setHistTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // filters cố ý KHÔNG vào deps — modal mở lại (key theo item) là fetch mới; filters chỉ đọc 1 lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.groupKey, histPage]);

  return createPortal(
    <>
    <div className="modal-backdrop show" onClick={onClose}>
      <div className="modal-card product-spec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', flexShrink: 0, padding: '4px', marginLeft: '10px' }}
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
            {/* Trái: lịch sử báo giá (mới → cũ) · Phải: giá các phương án của đơn đang chọn */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }}>
              <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border-color)', minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', letterSpacing: '0.3px' }}>
                  <History size={13} /> LỊCH SỬ BÁO GIÁ
                </div>
                {history.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                    {histLoading ? 'Đang tải lịch sử…' : 'Chưa có lịch sử báo giá'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {history.map((h, idx) => {
                      const active = idx === selIdx;
                      return (
                        <button
                          key={h.requestId}
                          type="button"
                          onClick={() => setSelIdx(idx)}
                          style={{
                            textAlign: 'left',
                            background: active ? 'var(--primary-soft, #eef2ff)' : 'transparent',
                            border: active ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                              {h.code}
                            </span>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-main)', textAlign: 'right', flexShrink: 0 }}>
                              {fmtDate(h.quotedDate ?? h.quotedAt)}
                              {h.weightDisplay ? ` · ${h.weightDisplay}` : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Sale: <strong style={{ color: 'var(--text-main)' }}>{h.saleName || '—'}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Báo giá: <strong style={{ color: 'var(--text-main)' }}>{h.pricerName || '—'}</strong>
                          </div>
                          <div
                            title={item.stoneDisplay || 'Không đính đá'}
                            style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            Đá: <strong style={{ color: 'var(--text-main)' }}>{item.stoneDisplay || 'Không đính đá'}</strong>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            Đã báo: <strong style={{ color: 'var(--text-main)' }}>{formatPriceRange(h.priceMin, h.priceMax, h.options[0]?.price ?? 0)}</strong>
                          </div>
                        </button>
                      );
                    })}
                    {histPage < histTotalPages && (
                      <button
                        type="button"
                        onClick={() => setHistPage((p) => p + 1)}
                        disabled={histLoading}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-color)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: histLoading ? 'default' : 'pointer',
                        }}
                      >
                        {histLoading ? 'Đang tải…' : 'Tải thêm lịch sử'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.3px' }}>
                    <Coins size={13} /> GIÁ PHƯƠNG ÁN
                  </div>
                  {selected && selected.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleCopyAll(selected.options)}
                      title="Copy giá hôm nay của tất cả phương án"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                        padding: '4px 9px', borderRadius: '7px', border: '1px solid var(--border-color)',
                        background: copiedAll ? '#dcfce7' : 'transparent',
                        color: copiedAll ? '#16a34a' : 'var(--text-muted)',
                        fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {copiedAll ? <Check size={12} /> : <Copy size={12} />} {copiedAll ? 'Đã copy' : 'Copy hết'}
                    </button>
                  )}
                </div>
                {selected && selected.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selected.options.map((o, idx) => {
                      const oTag = o.selectionStatus ? STATUS_TAG[o.selectionStatus] : undefined;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '6px', borderBottom: idx < selected.options.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.optionName}
                            </span>
                            {oTag && (
                              <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px', background: oTag.bg, color: oTag.color, flexShrink: 0 }}>
                                {oTag.label}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyOption(idx, o)}
                              title={`Copy "${optLine(o)}"`}
                              style={{
                                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '24px', height: '24px', borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: copiedIdx === idx ? '#dcfce7' : 'transparent',
                                color: copiedIdx === idx ? '#16a34a' : 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>
                            {formatCurrency(o.price)}
                          </div>
                          {renderPriceBreakdownLines(getPriceBreakdown(o))}
                          {o.livePrice != null && (
                            <>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Hôm nay ~ <strong style={{ color: (o.livePriceDeltaPct ?? 0) > 0 ? '#15803d' : (o.livePriceDeltaPct ?? 0) < 0 ? '#b91c1c' : 'var(--text-main)' }}>
                                  {formatCurrency(o.livePrice)}
                                </strong>
                                {o.livePriceDeltaPct != null && o.livePriceDeltaPct !== 0 && (
                                  <span style={{ color: o.livePriceDeltaPct > 0 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                                    {' '}({o.livePriceDeltaPct > 0 ? '+' : ''}{o.livePriceDeltaPct}%)
                                  </span>
                                )}
                              </div>
                              {renderPriceBreakdownLines(getLivePriceBreakdown(o), { live: true })}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Không có phương án</div>
                )}
              </div>
            </div>
          </div>
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
