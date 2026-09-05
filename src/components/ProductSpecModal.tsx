import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X, History, Coins, Copy, Check, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { ProductSpecModalProps, QuoteHistoryEntry } from '../types';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getPriceBreakdown, getLivePriceBreakdown } from '../utils/priceBreakdown';
import { ImageLightbox } from './ImageLightbox';
import { formatPriceRange, formatOptionCopyLine } from '../utils/quoteOption';
import { fetchLibraryProductHistory } from '../services/api';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalCloseIconBtnCls,
  specColCls,
  specEyebrowCls,
  specEyebrowLabelCls,
  specEmptyCls,
  specHistCardLineCls,
} from '../styles/classNames';

// Cột lịch sử tải từng lô nhỏ, cuộn tới đáy thì tự tải lô kế (infinite scroll) — không nút bấm.
const HISTORY_PAGE_SIZE = 8;

// Chỉ phương án khách CHỐT THẬT (CLOSED) mới gắn tag. SELECTED ("Sale đang nghiêng về") không gắn.
const STATUS_TAG: Record<string, { label: string; className: string }> = {
  CLOSED: { label: 'Đã chốt', className: 'bg-[#dcfce7] text-[#15803d]' },
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
  // Ngày báo giá của đơn đang chọn — hiện 1 lần ở đầu cột "Giá phương án" (mọi phương án cùng ngày).
  const quotedWhen =
    selected?.quotedDate || selected?.quotedAt
      ? fmtDate(selected?.quotedDate ?? selected?.quotedAt)
      : '';

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

  const handleCopyOption = (idx: number, o: any) => {
    navigator.clipboard.writeText(formatOptionCopyLine(o, { useLive: true })).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAll = (opts: any[]) => {
    navigator.clipboard.writeText(opts.map(o => formatOptionCopyLine(o, { useLive: true })).join('\n')).then(() => {
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
    <div className={modalBackdropCls} onClick={onClose}>
      <div
        className={clsx(
          modalCardCls,
          'w-[min(1000px,96vw)] max-w-[min(1000px,96vw)] h-auto max-h-[92vh] overflow-hidden flex flex-col',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(modalHeaderCls, 'shrink-0')}>
          <div className="min-w-0">
            <h2 className="text-[15px] overflow-hidden text-ellipsis whitespace-nowrap">{item.productName}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className={modalCloseIconBtnCls}>
            <X size={18} />
          </button>
        </div>

        <div
          className="grid [grid-template-columns:minmax(240px,3fr)_minmax(0,3.5fr)_minmax(0,3.5fr)] [grid-template-rows:minmax(0,1fr)] flex-1 min-h-0 overflow-hidden max-[860px]:!flex max-[860px]:!flex-col max-[860px]:!overflow-y-auto"
          ref={gridRef}
        >
          {/* Cột 1 — hình ảnh sản phẩm của đơn đang chọn */}
          <section className={clsx(specColCls, 'items-center bg-[#fafafa] max-[860px]:order-1')}>
            <div className={specEyebrowCls}>
              <span className={specEyebrowLabelCls}><ImageIcon size={13} /> Hình ảnh</span>
            </div>
            <div className="w-full max-w-[300px] aspect-square shrink-0 relative bg-[#f1f5f9] rounded-[14px] overflow-hidden max-[860px]:!max-w-[260px]">
              <img
                src={mainImgUrl}
                alt=""
                onClick={() => images.length > 0 && setZoomOpen(true)}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                }}
                className={clsx("w-full h-full object-cover", images.length > 0 ? "cursor-zoom-in" : "cursor-default")}
              />
              {images.length > 1 && (
                <div className="absolute left-[10px] right-[10px] bottom-[10px] flex gap-[6px] overflow-x-auto">
                  {images.map((img, idx) => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt=""
                      className="w-[44px] h-[44px] shrink-0 rounded-[8px] object-cover cursor-pointer border-2 border-[rgba(255,255,255,0.8)] opacity-70 shadow-[0_2px_6px_rgba(0,0,0,0.25)] data-[active]:opacity-100 data-[active]:border-white data-[active]:shadow-[0_0_0_2px_#0f172a]"
                      data-active={idx === activeIdx || undefined}
                      onClick={() => setActiveIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thông số gộp của nhóm sản phẩm — lấp khoảng trống dưới ảnh, cân với cột phải */}
            <dl className="w-full mt-[18px] flex flex-col [&>div]:flex [&>div]:justify-between [&>div]:gap-[12px] [&>div]:py-[8px] [&>div]:border-t [&>div]:border-border [&>div:last-child]:border-b [&>div:last-child]:border-border [&_dt]:shrink-0 [&_dt]:pt-[1px] [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:tracking-[0.5px] [&_dt]:uppercase [&_dt]:text-faint [&_dd]:min-w-0 [&_dd]:text-[11.5px] [&_dd]:font-bold [&_dd]:text-[#0f172a] [&_dd]:text-right">
              <div><dt>Chất liệu</dt><dd>{item.matStr || '—'}</dd></div>
              <div><dt>Khối lượng</dt><dd>{item.weightDisplay || '—'}</dd></div>
              <div><dt>Đá</dt><dd>{item.stoneDisplay || 'Không đính đá'}</dd></div>
              <div><dt>Số đơn đã báo</dt><dd>{item.duplicateCount ?? (history.length || '—')}</dd></div>
              <div><dt>Khoảng giá đã báo</dt><dd>{formatPriceRange(item.priceMin, item.priceMax, 0)}</dd></div>
            </dl>
          </section>

          {/* Cột 2 — lịch sử báo giá (mới → cũ); chọn 1 đơn để đổi ảnh + bảng giá */}
          <section className={clsx(specColCls, 'max-[860px]:order-3')} ref={histColRef}>
            <div className={specEyebrowCls}>
              <span className={specEyebrowLabelCls}><History size={13} /> Lịch sử báo giá</span>
            </div>
            {history.length === 0 ? (
              <div className={specEmptyCls}>{histLoading ? 'Đang tải lịch sử…' : 'Chưa có lịch sử báo giá'}</div>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {history.map((h, idx) => (
                  <button
                    key={h.requestId}
                    type="button"
                    className="flex flex-col gap-[3px] py-[12px] px-[13px] font-[inherit] text-left bg-white border border-border border-l-[3px] border-l-transparent rounded-[10px] cursor-pointer transition-[border-color,background] duration-[120ms] hover:border-[#94a3b8] aria-selected:bg-[#f1f5f9] aria-selected:border-[#0f172a] aria-selected:border-l-[#0f172a]"
                    aria-selected={idx === selIdx}
                    onClick={() => setSelIdx(idx)}
                  >
                    <div className="flex items-baseline justify-between gap-[8px] mb-[1px]">
                      <span className="text-[10.5px] font-bold text-muted [font-variant-numeric:tabular-nums] tracking-[0.2px]">{h.code}</span>
                      <span className="shrink-0 text-[12px] font-extrabold text-[#0f172a] [font-variant-numeric:tabular-nums] text-right">
                        {fmtDate(h.quotedDate ?? h.quotedAt)}
                        {h.weightDisplay ? ` · ${h.weightDisplay}` : ''}
                      </span>
                    </div>
                    <div className={specHistCardLineCls}>Sale <strong>{h.saleName || '—'}</strong></div>
                    <div className={specHistCardLineCls}>Báo giá <strong>{h.pricerName || '—'}</strong></div>
                    <div className={specHistCardLineCls} title={item.stoneDisplay || 'Không đính đá'}>
                      Đá <strong>{item.stoneDisplay || 'Không đính đá'}</strong>
                    </div>
                    <div className="mt-[5px] pt-[6px] border-t border-dashed border-border text-[11.5px] text-muted [&_strong]:text-[#0f172a] [&_strong]:font-extrabold">
                      Đã báo <strong>{formatPriceRange(h.priceMin, h.priceMax, h.options[0]?.price ?? 0)}</strong>
                    </div>
                  </button>
                ))}
                {histPage < histTotalPages && (
                  <div
                    ref={histSentinelRef}
                    className="flex items-center justify-center min-h-[34px] mt-[2px] text-[10.5px] font-bold tracking-[0.5px] uppercase text-faint"
                  >
                    {histLoading ? 'Đang tải thêm…' : ''}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Cột 3 — bảng giá theo phương án chất liệu của đơn đang chọn */}
          <section className={clsx(specColCls, 'max-[860px]:order-2')}>
            <div className={specEyebrowCls}>
              <span className={specEyebrowLabelCls}><Coins size={13} /> Giá phương án</span>
              {selected && selected.options.length > 1 && (
                <button
                  type="button"
                  className="flex items-center gap-[5px] shrink-0 py-[4px] px-[9px] text-[10px] font-bold tracking-[0.3px] text-muted bg-white border border-border rounded-[7px] cursor-pointer data-[copied]:text-[#15803d] data-[copied]:bg-[#dcfce7] data-[copied]:border-[#bbf7d0]"
                  data-copied={copiedAll || undefined}
                  onClick={() => handleCopyAll(selected.options)}
                  title="Copy giá hôm nay của tất cả phương án"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />} {copiedAll ? 'Đã copy' : 'Copy hết'}
                </button>
              )}
            </div>
            {selected && selected.options.length > 0 ? (
              <div className="flex flex-col">
                {quotedWhen && (
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-faint mb-[10px]">
                    Báo giá ngày {quotedWhen}
                  </div>
                )}
                {selected.options.map((o, idx) => {
                  const oTag = o.selectionStatus ? STATUS_TAG[o.selectionStatus] : undefined;
                  const dp = o.livePriceDeltaPct ?? 0;
                  const deltaCls = dp > 0 ? 'text-[#15803d]' : dp < 0 ? 'text-[#b91c1c]' : 'text-muted';
                  const hasLive = o.livePrice != null;
                  const bdQ = getPriceBreakdown(o);
                  const bdL = getLivePriceBreakdown(o);
                  const money = (v: number | null | undefined) => (v == null ? '—' : formatCurrency(v));
                  // Nhãn cột trái của bảng giá (Tổng / Kim loại / Đá)
                  const rowLabelCls = 'text-left text-[9.5px] font-bold uppercase tracking-[0.3px]';
                  const numCls = 'text-right pl-[10px] whitespace-nowrap';
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-[6px] py-[14px] first:pt-[2px] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border"
                    >
                      <div className="flex items-center gap-[6px]">
                        <span className="flex-1 min-w-0 text-[12px] text-muted truncate">{o.optionName}</span>
                        {oTag && (
                          <span
                            className={clsx(
                              'shrink-0 py-[2px] px-[7px] text-[9.5px] font-extrabold tracking-[0.3px] rounded-full',
                              oTag.className,
                            )}
                          >
                            {oTag.label}
                          </span>
                        )}
                        <button
                          type="button"
                          className="shrink-0 flex items-center justify-center w-[24px] h-[24px] text-muted bg-white border border-border rounded-[7px] cursor-pointer data-[copied]:text-[#15803d] data-[copied]:bg-[#dcfce7] data-[copied]:border-[#bbf7d0]"
                          data-copied={copiedIdx === idx || undefined}
                          onClick={() => handleCopyOption(idx, o)}
                          title={`Copy "${formatOptionCopyLine(o, { useLive: true })}"`}
                        >
                          {copiedIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                      <table className="w-full text-[11.5px] [font-variant-numeric:tabular-nums] border-collapse [&_td]:py-[2px] [&_th]:py-[2px]">
                        <thead>
                          <tr className="text-[9px] font-extrabold uppercase tracking-[0.4px] text-faint">
                            <th className="font-[inherit]" />
                            <th className={clsx(numCls, 'font-[inherit]')}>Lúc báo giá</th>
                            {hasLive && <th className={clsx(numCls, 'font-[inherit]')}>Hôm nay</th>}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="font-extrabold text-[#0f172a] [&_td]:border-b [&_td]:border-[#f1f5f9]">
                            <td className={clsx(rowLabelCls, 'text-muted')}>Tổng</td>
                            <td className={numCls}>{money(o.price)}</td>
                            {hasLive && <td className={numCls}>{money(o.livePrice)}</td>}
                          </tr>
                          <tr className="text-muted">
                            <td className={rowLabelCls}>Kim loại</td>
                            <td className={numCls}>{money(bdQ?.material)}</td>
                            {hasLive && <td className={numCls}>{money(bdL?.material)}</td>}
                          </tr>
                          <tr className="text-muted">
                            <td className={rowLabelCls}>Đá</td>
                            <td className={numCls}>{money(bdQ?.stone)}</td>
                            {hasLive && <td className={numCls}>{money(bdL?.stone)}</td>}
                          </tr>
                        </tbody>
                      </table>
                      {hasLive && dp !== 0 && (
                        <div
                          className={clsx(
                            'flex items-center justify-end gap-[3px] text-[10.5px] font-bold [&_svg]:shrink-0',
                            deltaCls,
                          )}
                        >
                          {dp > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                          {Math.abs(dp)}% so với lúc báo giá
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={specEmptyCls}>Không có phương án</div>
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
