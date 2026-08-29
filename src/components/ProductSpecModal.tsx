import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, History, Coins, Copy, Check, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { ProductSpecModalProps, QuoteHistoryEntry } from '../types';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getPriceBreakdown, getLivePriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { ImageLightbox } from './ImageLightbox';
import { formatPriceRange } from '../utils/quoteOption';
import { fetchLibraryProductHistory } from '../services/api';

// Cột lịch sử tải từng lô nhỏ, cuộn tới đáy thì tự tải lô kế (infinite scroll) — không nút bấm.
const HISTORY_PAGE_SIZE = 8;

// Chỉ phương án khách CHỐT THẬT (CLOSED) mới gắn tag. SELECTED ("Sale đang nghiêng về") không gắn.
const STATUS_TAG: Record<string, { label: string; bg: string; color: string }> = {
  CLOSED: { label: 'Đã chốt', bg: '#dcfce7', color: '#15803d' },
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN') : '—';

export const ProductSpecModal: React.FC<ProductSpecModalProps> = ({ item, onClose, filters }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Lịch sử báo giá — KHÔNG gửi kèm list nữa (nhóm có thể vài nghìn đơn). Lazy-load theo trang khi
  // mở modal; nút "Tải thêm" tải trang tiếp theo. Truyền cùng bộ lọc ngoài để khớp view đang lọc.
  const [history, setHistory] = useState<QuoteHistoryEntry[]>([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histLoading, setHistLoading] = useState(false);
  const [selIdx, setSelIdx] = useState(0);
  const selected = history[selIdx] ?? history[0];

  // Infinite scroll cột lịch sử. loadingRef chặn tải trùng (state chưa kịp cập nhật giữa 2 render).
  const gridRef = useRef<HTMLDivElement>(null);
  const histColRef = useRef<HTMLElement>(null);
  const histSentinelRef = useRef<HTMLDivElement>(null);
  const histLoadingRef = useRef(false);

  // Ảnh nền modal = ảnh của ĐƠN đang chọn ở cột lịch sử; đơn cũ chưa có ảnh riêng thì fallback ảnh nhóm.
  const images =
    selected?.images && selected.images.length > 0
      ? selected.images
      : item.images && item.images.length > 0
        ? item.images
        : [];
  const mainImgUrl = images[activeIdx]?.imageUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

  // Copy giá "sống" (Hôm nay ~) của phương án — fallback về giá gốc nếu option chưa có livePrice.
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  useEffect(() => { setCopiedIdx(null); setCopiedAll(false); setActiveIdx(0); }, [selIdx]);

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
    histLoadingRef.current = true;
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
        if (cancelled) return;
        histLoadingRef.current = false;
        setHistLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // filters cố ý KHÔNG vào deps — modal mở lại (key theo item) là fetch mới; filters chỉ đọc 1 lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.groupKey, histPage]);

  // Cuộn tới gần đáy cột lịch sử → tải lô kế. Desktop cột tự cuộn (root = cột); mobile cả grid cuộn.
  useEffect(() => {
    if (histPage >= histTotalPages) return;
    const sentinel = histSentinelRef.current;
    if (!sentinel) return;
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    const root = (mobile ? gridRef.current : histColRef.current) ?? null;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || histLoadingRef.current) return;
        histLoadingRef.current = true;
        setHistPage((p) => (p < histTotalPages ? p + 1 : p));
      },
      { root, rootMargin: '160px 0px' },
    );
    io.observe(sentinel);
    return () => io.disconnect();
    // history.length: sau khi nối thêm dữ liệu, dựng lại observer để bắt lại trạng thái giao nhau
    // (IntersectionObserver không tự gọi lại nếu sentinel vẫn nằm trong khung nhìn).
  }, [histPage, histTotalPages, history.length]);

  return createPortal(
    <>
    <div className="modal-backdrop show" onClick={onClose}>
      <div className="modal-card product-spec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="spec-close">
            <X size={18} />
          </button>
        </div>

        <div className="product-spec-grid" ref={gridRef}>
          {/* Cột 1 — hình ảnh sản phẩm của đơn đang chọn */}
          <section className="spec-col spec-col--image">
            <div className="spec-eyebrow">
              <span className="spec-eyebrow__label"><ImageIcon size={13} /> Hình ảnh</span>
            </div>
            <div className="product-spec-image-frame">
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
                <div className="spec-thumbs">
                  {images.map((img, idx) => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt=""
                      className="spec-thumb"
                      data-active={idx === activeIdx || undefined}
                      onClick={() => setActiveIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thông số gộp của nhóm sản phẩm — lấp khoảng trống dưới ảnh, cân với cột phải */}
            <dl className="spec-meta">
              <div><dt>Chất liệu</dt><dd>{item.matStr || '—'}</dd></div>
              <div><dt>Khối lượng</dt><dd>{item.weightDisplay || '—'}</dd></div>
              <div><dt>Đá</dt><dd>{item.stoneDisplay || 'Không đính đá'}</dd></div>
              <div><dt>Số đơn đã báo</dt><dd>{item.duplicateCount ?? (history.length || '—')}</dd></div>
              <div><dt>Khoảng giá đã báo</dt><dd>{formatPriceRange(item.priceMin, item.priceMax, 0)}</dd></div>
            </dl>
          </section>

          {/* Cột 2 — lịch sử báo giá (mới → cũ); chọn 1 đơn để đổi ảnh + bảng giá */}
          <section className="spec-col spec-col--history" ref={histColRef}>
            <div className="spec-eyebrow">
              <span className="spec-eyebrow__label"><History size={13} /> Lịch sử báo giá</span>
            </div>
            {history.length === 0 ? (
              <div className="spec-empty">{histLoading ? 'Đang tải lịch sử…' : 'Chưa có lịch sử báo giá'}</div>
            ) : (
              <div className="spec-hist-list">
                {history.map((h, idx) => (
                  <button
                    key={h.requestId}
                    type="button"
                    className="spec-hist-card"
                    aria-selected={idx === selIdx}
                    onClick={() => setSelIdx(idx)}
                  >
                    <div className="spec-hist-card__top">
                      <span className="spec-hist-card__code">{h.code}</span>
                      <span className="spec-hist-card__date">
                        {fmtDate(h.quotedDate ?? h.quotedAt)}
                        {h.weightDisplay ? ` · ${h.weightDisplay}` : ''}
                      </span>
                    </div>
                    <div className="spec-hist-card__line">Sale <strong>{h.saleName || '—'}</strong></div>
                    <div className="spec-hist-card__line">Báo giá <strong>{h.pricerName || '—'}</strong></div>
                    <div className="spec-hist-card__line" title={item.stoneDisplay || 'Không đính đá'}>
                      Đá <strong>{item.stoneDisplay || 'Không đính đá'}</strong>
                    </div>
                    <div className="spec-hist-card__total">
                      Đã báo <strong>{formatPriceRange(h.priceMin, h.priceMax, h.options[0]?.price ?? 0)}</strong>
                    </div>
                  </button>
                ))}
                {histPage < histTotalPages && (
                  <div ref={histSentinelRef} className="spec-hist-more">
                    {histLoading ? 'Đang tải thêm…' : ''}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Cột 3 — bảng giá theo phương án chất liệu của đơn đang chọn */}
          <section className="spec-col spec-col--prices">
            <div className="spec-eyebrow">
              <span className="spec-eyebrow__label"><Coins size={13} /> Giá phương án</span>
              {selected && selected.options.length > 1 && (
                <button
                  type="button"
                  className="spec-copyall"
                  data-copied={copiedAll || undefined}
                  onClick={() => handleCopyAll(selected.options)}
                  title="Copy giá hôm nay của tất cả phương án"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />} {copiedAll ? 'Đã copy' : 'Copy hết'}
                </button>
              )}
            </div>
            {selected && selected.options.length > 0 ? (
              <div className="spec-opt-list">
                {selected.options.map((o, idx) => {
                  const oTag = o.selectionStatus ? STATUS_TAG[o.selectionStatus] : undefined;
                  const dp = o.livePriceDeltaPct ?? 0;
                  const deltaCls = dp > 0 ? 'spec-delta--up' : dp < 0 ? 'spec-delta--down' : 'spec-delta--flat';
                  return (
                    <div key={idx} className="spec-opt">
                      <div className="spec-opt__head">
                        <span className="spec-opt__name">{o.optionName}</span>
                        {oTag && (
                          <span className="spec-badge" style={{ background: oTag.bg, color: oTag.color }}>
                            {oTag.label}
                          </span>
                        )}
                        <button
                          type="button"
                          className="spec-iconbtn"
                          data-copied={copiedIdx === idx || undefined}
                          onClick={() => handleCopyOption(idx, o)}
                          title={`Copy "${optLine(o)}"`}
                        >
                          {copiedIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="spec-price">{formatCurrency(o.price)}</div>
                      {renderPriceBreakdownLines(getPriceBreakdown(o))}
                      {o.livePrice != null && (
                        <div className="spec-today">
                          <div className="spec-today__row">
                            <span className="spec-today__label">Hôm nay</span>
                            <span className={`spec-delta ${deltaCls}`}>
                              {dp > 0 ? <ArrowUp size={12} /> : dp < 0 ? <ArrowDown size={12} /> : null}
                              {formatCurrency(o.livePrice)}
                              {dp !== 0 && (
                                <span className="spec-delta__pct">{dp > 0 ? '+' : ''}{dp}%</span>
                              )}
                            </span>
                          </div>
                          {renderPriceBreakdownLines(getLivePriceBreakdown(o), { live: true })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="spec-empty">Không có phương án</div>
            )}
          </section>
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
