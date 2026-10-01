import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X, History, Copy, Check, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { ProductSpecModalProps } from '../types';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getPriceBreakdown, getLivePriceBreakdown } from '../utils/priceBreakdown';
import { ImageLightbox } from './ImageLightbox';
import { formatPriceRange, formatOptionCopyLine } from '../utils/quoteOption';
import { useModalA11y } from '../hooks/useModalA11y';
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

// Chỉ phương án khách CHỐT THẬT (CLOSED) mới gắn tag. SELECTED ("Sale đang nghiêng về") không gắn.
const STATUS_TAG: Record<string, { label: string; className: string }> = {
  CLOSED: { label: 'Đã chốt', className: 'bg-[#dcfce7] text-[#15803d]' },
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN') : '—';

export const ProductSpecModal: React.FC<ProductSpecModalProps> = ({ item, onClose }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  // Khi ImageLightbox (zoomOpen) đang mở thì để nó tự xử lý Esc — tắt hành vi Esc/khoá-cuộn của
  // modal này để Esc lần đầu chỉ đóng lightbox, không đóng luôn cả modal.
  const dialogRef = useModalA11y(onClose, !zoomOpen);

  const images = item.images ?? [];
  const mainImgUrl = images[activeIdx]?.imageUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

  // Copy giá "sống" (Hôm nay ~) của phương án — fallback về giá gốc nếu option chưa có livePrice.
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  useEffect(() => { setCopiedIdx(null); setCopiedAll(false); setActiveIdx(0); }, [item.key]);

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

  return createPortal(
    <>
    <div className={modalBackdropCls} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Thông số sản phẩm — ${item.productName}`}
        tabIndex={-1}
        className={clsx(
          modalCardCls,
          'w-[min(900px,96vw)] max-w-[min(900px,96vw)] h-auto max-h-[92vh] overflow-hidden flex flex-col',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(modalHeaderCls, 'shrink-0')}>
          <div className="min-w-0">
            <h2 className="text-[18px] overflow-hidden text-ellipsis whitespace-nowrap">{item.productName}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className={modalCloseIconBtnCls}>
            <X size={18} />
          </button>
        </div>

        <div
          className="grid [grid-template-columns:minmax(240px,3fr)_minmax(0,5fr)] [grid-template-rows:minmax(0,1fr)] flex-1 min-h-0 overflow-hidden max-[860px]:!flex max-[860px]:!flex-col max-[860px]:!overflow-y-auto"
        >
          {/* Cột 1 — hình ảnh + thông số sản phẩm */}
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

            <dl className="w-full mt-[18px] flex flex-col [&>div]:flex [&>div]:justify-between [&>div]:gap-[12px] [&>div]:py-[8px] [&>div]:border-t [&>div]:border-border [&>div:last-child]:border-b [&>div:last-child]:border-border [&_dt]:shrink-0 [&_dt]:pt-[1px] [&_dt]:text-[13px] [&_dt]:font-bold [&_dt]:tracking-[0.5px] [&_dt]:uppercase [&_dt]:text-faint [&_dd]:min-w-0 [&_dd]:text-[14.5px] [&_dd]:font-bold [&_dd]:text-[#0f172a] [&_dd]:text-right">
              <div><dt>Mã sản phẩm</dt><dd>{item.productCode || '—'}</dd></div>
              <div><dt>Chất liệu</dt><dd>{item.matStr || '—'}</dd></div>
              <div><dt>Khối lượng</dt><dd>{item.weightDisplay || '—'}</dd></div>
              <div><dt>Đá</dt><dd>{item.stoneDisplay || 'Không đính đá'}</dd></div>
              <div><dt>Khoảng giá đã báo</dt><dd>{formatPriceRange(item.priceMin, item.priceMax, 0)}</dd></div>
            </dl>
          </section>

          {/* Cột 2 — lịch sử báo giá: giá từng phương án lúc báo và hôm nay */}
          <section className={clsx(specColCls, 'max-[860px]:order-2')}>
            <div className={specEyebrowCls}>
              <span className={specEyebrowLabelCls}><History size={13} /> Lịch sử báo giá</span>
              {item.options.length > 1 && (
                <button
                  type="button"
                  className="flex items-center gap-[5px] shrink-0 py-[4px] px-[9px] text-[13px] font-bold tracking-[0.3px] text-muted bg-white border border-border rounded-[7px] cursor-pointer data-[copied]:text-[#15803d] data-[copied]:bg-[#dcfce7] data-[copied]:border-[#bbf7d0]"
                  data-copied={copiedAll || undefined}
                  onClick={() => handleCopyAll(item.options)}
                  title="Copy giá hôm nay của tất cả phương án"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />} {copiedAll ? 'Đã copy' : 'Copy hết'}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-[3px] pb-[12px] mb-[4px] border-b border-border">
              <div className="flex items-baseline justify-between gap-[8px]">
                <span className="text-[13.5px] font-bold text-muted [font-variant-numeric:tabular-nums] tracking-[0.2px]">{item.code}</span>
                <span className="shrink-0 text-[15px] font-extrabold text-[#0f172a] [font-variant-numeric:tabular-nums]">
                  Báo giá ngày {fmtDate(item.quotedAt)}
                </span>
              </div>
              <div className={specHistCardLineCls}>Sale <strong>{item.saleName || '—'}</strong></div>
              <div className={specHistCardLineCls}>Báo giá <strong>{item.pricerName || '—'}</strong></div>
            </div>

            {item.options.length > 0 ? (
              <div className="flex flex-col">
                {item.options.map((o, idx) => {
                  const oTag = o.selectionStatus ? STATUS_TAG[o.selectionStatus] : undefined;
                  const dp = o.livePriceDeltaPct ?? 0;
                  const deltaCls = dp > 0 ? 'text-[#15803d]' : dp < 0 ? 'text-[#b91c1c]' : 'text-muted';
                  const hasLive = o.livePrice != null;
                  const bdQ = getPriceBreakdown(o);
                  const bdL = getLivePriceBreakdown(o);
                  const money = (v: number | null | undefined) => (v == null ? '—' : formatCurrency(v));
                  // Nhãn cột trái của bảng giá (Tổng / Kim loại / Đá)
                  const rowLabelCls = 'text-left text-[12.5px] font-bold uppercase tracking-[0.3px]';
                  const numCls = 'text-right pl-[10px] whitespace-nowrap';
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-[6px] py-[14px] first:pt-[2px] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border"
                    >
                      <div className="flex items-center gap-[6px]">
                        <span className="flex-1 min-w-0 text-[15px] text-muted truncate">{o.optionName}</span>
                        {oTag && (
                          <span
                            className={clsx(
                              'shrink-0 py-[2px] px-[7px] text-[12.5px] font-extrabold tracking-[0.3px] rounded-full',
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
                      <table className="w-full text-[14.5px] [font-variant-numeric:tabular-nums] border-collapse [&_td]:py-[2px] [&_th]:py-[2px]">
                        <thead>
                          <tr className="text-[12px] font-extrabold uppercase tracking-[0.4px] text-faint">
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
                            'flex items-center justify-end gap-[3px] text-[13.5px] font-bold [&_svg]:shrink-0',
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
              <div className={specEmptyCls}>Chưa có lịch sử báo giá</div>
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
