import React, { useState, useEffect, useRef } from 'react';
import type { QuoteRequest, DetailPageProps, QuoteOption, QuoteOptionMaterial } from '../types';
import {
  ArrowLeft,
  XCircle,
  RotateCcw,
  Building2,
  Calendar,
  Layers,
  User as UserIcon,
  Phone,
  MapPin,
  BarChart3,
  Gem,
  Tag,
  Ruler,
  Target,
  Scale,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchQuoteRequestById, fetchChatMessages } from '../services/api';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency, formatDuration } from '../utils/currency';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { getPrimaryOption, formatOptionCopyLine } from '../utils/quoteOption';
import { ChatPopup } from '../components/ChatPopup';
import { ImageLightbox } from '../components/ImageLightbox';
import { StatusPill } from '../components/StatusPill';
import { NotFoundPage } from './NotFoundPage';
import { SpecBadge } from '../components/SpecBadge';
import { SpecRow } from '../components/SpecRow';
import { clsx } from 'clsx';
import { cardCls } from '../styles/classNames';
import { OptionCard } from '../components/OptionCard';
import { CHAT_EVENTS } from '../constants/chatEvents';
import { REALTIME_EVENTS } from '../constants/realtimeEvents';

// Nút chuyển ảnh trước/kế tiếp trên lightbox — 2 nút chỉ khác chiều (trái/phải), icon, và hướng
// chỉnh index, còn lại (style/hover) y hệt nhau.
const ImageNavButton: React.FC<{
  direction: 'prev' | 'next';
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ direction, title, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'absolute top-1/2 -translate-y-1/2 bg-[rgba(15,23,42,0.65)] text-surface border-0 rounded-full w-[30px] h-[30px] flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-[background_0.15s_ease,transform_0.15s_ease] hover:bg-[rgba(15,23,42,0.9)] hover:scale-110',
      direction === 'prev' ? 'left-[8px]' : 'right-[8px]',
    )}
    title={title}
  >
    {direction === 'prev' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
  </button>
);

export const DetailPage: React.FC<DetailPageProps> = ({
  selectedReq: initialSelectedReq,
  currentRole,
  currentUser,
  socket,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const onBack = () => navigate('/requests');

  const [loadedReq, setLoadedReq] = useState<QuoteRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSelectedReq);

  // Đảm bảo record được chọn luôn khớp chính xác với ID trên đường dẫn URL khi F5/reload
  const selectedReq =
    (initialSelectedReq && (initialSelectedReq.id === id || initialSelectedReq.code === id))
      ? initialSelectedReq
      : (loadedReq || (id ? null : initialSelectedReq));

  useEffect(() => {
    if (!id) return;
    const propMatches =
      initialSelectedReq &&
      (initialSelectedReq.id === id || initialSelectedReq.code === id) &&
      Array.isArray(initialSelectedReq.options);
    if (propMatches) {
      setLoadedReq(initialSelectedReq);
      setIsLoading(false);
      return; // đã đủ dữ liệu — không gọi API
    }
    setIsLoading(true);
    let isMounted = true;
    fetchQuoteRequestById(id)
      .then((data) => { if (isMounted) { if (data) setLoadedReq(data); setIsLoading(false); } })
      .catch((err) => { console.error('Không thể tải chi tiết yêu cầu:', err); if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialSelectedReq?.id, initialSelectedReq?.code, initialSelectedReq?.options]);

  const rawImages = selectedReq?.images || [];
  const imagesList =
    rawImages.length > 0
      ? rawImages
          .map((img: string | { imageUrl: string }) => (typeof img === 'string' ? img : img.imageUrl))
          .filter(Boolean)
      : [UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE];

  // Video (nếu có) gộp chung một carousel với ảnh và đứng TRƯỚC; không có video thì ảnh hiện đầu.
  const videoUrl = selectedReq?.videoUrl || null;
  const mediaList: { type: 'video' | 'image'; url: string }[] = [
    ...(videoUrl ? [{ type: 'video' as const, url: videoUrl }] : []),
    ...imagesList.map((url) => ({ type: 'image' as const, url })),
  ];
  const imageOffset = videoUrl ? 1 : 0; // lệch index giữa mediaList và imagesList (cho lightbox)

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentMediaIdx = Math.min(activeImageIndex, Math.max(0, mediaList.length - 1));
  const currentMedia = mediaList[currentMediaIdx] || mediaList[0];

  const [copiedOptIdx, setCopiedOptIdx] = useState<number | null>(null);
  const [copiedAllOpt, setCopiedAllOpt] = useState(false);

  // Reset về ảnh đầu tiên khi chuyển sang đơn khác
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedReq?.id]);

  // Xem ảnh phóng to — logic zoom/pan/phím tắt dùng chung ở <ImageLightbox>, ở đây chỉ giữ cờ mở/đóng
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // 1. Tự động cập nhật dữ liệu trang chi tiết khi có sự kiện Realtime (Status thay đổi / Option bị xóa...)
  useEffect(() => {
    if (!socket) return;
    const handleStatusChanged = (data: { quoteRequestId: string; status: string }) => {
      const currentReqId = selectedReq?.id || id;
      if (data.quoteRequestId === currentReqId || data.quoteRequestId === id) {
        if (id) {
          fetchQuoteRequestById(id)
            .then((fresh) => setLoadedReq(fresh))
            .catch(() => {});
        }
      }
    };
    socket.on(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);
    return () => {
      socket.off(REALTIME_EVENTS.STATUS_CHANGED, handleStatusChanged);
    };
  }, [socket, id, selectedReq?.id]);

  // Chat chỉ dành cho đúng 2 người liên quan tới yêu cầu (requester + assignee)
  const isChatParticipant =
    !!selectedReq &&
    (currentUser.id === selectedReq.requesterId || currentUser.id === selectedReq.assigneeId);

  // 2. Chat phòng: Join room và lắng nghe tin nhắn mới qua socket dùng chung
  useEffect(() => {
    if (!socket || !selectedReq?.id || !selectedReq?.assigneeId || !isChatParticipant) return;

    const joinRoom = () => {
      socket.emit(CHAT_EVENTS.JOIN_REQUEST, { quoteRequestId: selectedReq.id });
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    fetchChatMessages(selectedReq.id)
      .then((res) => setChatUnreadCount(res.unreadCount))
      .catch(() => {});

    const handleNewMessage = (msg: { quoteRequestId: string }) => {
      if (msg.quoteRequestId !== selectedReq.id) return;
      setChatUnreadCount((prev) => (isChatOpenRef.current ? prev : prev + 1));
    };
    socket.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);

    return () => {
      socket.off('connect', joinRoom);
      socket.off(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    };
  }, [socket, selectedReq?.id, selectedReq?.assigneeId, isChatParticipant]);

  const handleCopyOptionPrice = (idx: number, opt: QuoteOption) => {
    const text = formatOptionCopyLine(opt);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOptIdx(idx);
      setTimeout(() => setCopiedOptIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAllOptions = (options: QuoteOption[]) => {
    const text = options.map((opt) => formatOptionCopyLine(opt)).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAllOpt(true);
      setTimeout(() => setCopiedAllOpt(false), 1500);
    }).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <RotateCcw className="animate-spin text-blue-500" size={32} />
          <p>Đang tải chi tiết yêu cầu báo giá...</p>
        </div>
      </div>
    );
  }

  if (!selectedReq) {
    return (
      <NotFoundPage
        title="Không tìm thấy yêu cầu báo giá"
        description="Yêu cầu báo giá này không tồn tại trên hệ thống, đã bị xóa hoặc bạn không có quyền truy cập."
        backTo="/requests"
        backLabel="Quay lại danh sách"
      />
    );
  }


  // Price calculations
  const priceVal = selectedReq.quotedPrice ? Number(selectedReq.quotedPrice) : 0;

  // Ẩn option nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu, quotedPrice null)
  // khỏi đếm số/danh sách/copy-hết — chỉ phương án đã tính giá thật mới coi là 1 phương án báo giá.
  const pricedOptions = selectedReq.options?.filter((o) => o.quotedPrice != null) || [];

  const finalOption = getPrimaryOption(selectedReq);


  const STATUS_BADGE_LABELS: Record<string, string> = {
    PENDING: 'YÊU CẦU MỚI',
    PROCESSING: 'ĐANG XỬ LÝ',
    QUOTED: 'ĐÃ BÁO GIÁ',
    REJECTED: 'BỊ TỪ CHỐI',
    NEED_MORE_INFO: 'CẦN BỔ SUNG',
    CLOSED: 'ĐÃ CHỐT ĐƠN',
  };

  const getStatusBadge = (status: string) => (
    <StatusPill
      status={status}
      label={STATUS_BADGE_LABELS[status] || status}
      iconSize={14}
      // động — props component ngoài
      style={{ padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}
    />
  );

  const timeToAccept = selectedReq.createdAt && selectedReq.acceptedAt
    ? formatDuration(new Date(selectedReq.createdAt).getTime(), new Date(selectedReq.acceptedAt).getTime())
    : null;
  const timeToQuote = selectedReq.acceptedAt && selectedReq.quotedDate
    ? formatDuration(new Date(selectedReq.acceptedAt).getTime(), new Date(selectedReq.quotedDate).getTime())
    : null;
  const timeToReturn = selectedReq.acceptedAt && selectedReq.returnedAt
    ? formatDuration(new Date(selectedReq.acceptedAt).getTime(), new Date(selectedReq.returnedAt).getTime())
    : null;
  const timeToReject = selectedReq.status === 'REJECTED' && (selectedReq.acceptedAt || selectedReq.createdAt) && selectedReq.updatedAt
    ? formatDuration(new Date(selectedReq.acceptedAt || selectedReq.createdAt).getTime(), new Date(selectedReq.updatedAt).getTime())
    : null;

  // Đọc chất liệu từ phương án đang hiển thị (finalOption) — không lấy field cấp request
  // (selectedReq.materials/material chỉ là bản tóm tắt của phương án đại diện, có thể trống nếu
  // phương án đó chưa gắn chất liệu). "Vàng Trắng 18K" cũ là placeholder demo, hiện SAI cho mọi đơn
  // khi thiếu data thật — đổi thành nhãn rõ ràng là chưa có dữ liệu.
  const materialsList =
    finalOption?.materials && finalOption.materials.length > 0
      ? finalOption.materials.map((m) => m.materialName || m.material?.name).filter((n): n is string => !!n)
      : finalOption?.materialName
        ? [finalOption.materialName]
        : selectedReq.materials && selectedReq.materials.length > 0
          ? selectedReq.materials.map((m) => m.name)
          : selectedReq.material
            ? [selectedReq.material.name]
            : ['Chưa rõ chất liệu'];

  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-[16px]">
        <div className="flex items-center gap-[14px]">
          <button
            type="button"
            onClick={onBack}
            className="bg-surface border border-[#cbd5e1] rounded-[10px] py-[8px] px-[16px] text-[13px] font-bold text-[#334155] cursor-pointer flex items-center gap-[6px] shadow-sm transition-[all_0.15s_ease]"
          >
            <ArrowLeft size={16} /> 
          </button>

          <div>
            <div className="flex items-center gap-[10px]">
              <h1 className="text-[22px] font-black text-text m-0">
                {selectedReq.code || `#RQ-${selectedReq.id}`}
              </h1>
              {getStatusBadge(selectedReq.status)}
            </div>
            <p className="text-[13px] text-muted mt-[4px] mr-0 mb-0 ml-0">
              Tạo lúc {selectedReq.createdAt ? new Date(selectedReq.createdAt).toLocaleString('vi-VN') : '---'}
            </p>
          </div>
        </div>

        {/* Trang chi tiết chỉ để xem — mọi thao tác đổi trạng thái (tiếp nhận/báo giá/từ chối/
            trả lại/sửa/xóa/đánh dấu chốt) đã chuyển hết ra bảng danh sách, không còn nút nào ở
            đây gọi API thay đổi dữ liệu nữa. */}
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-[2fr_1fr] gap-[24px] items-start">
        {/* Left Column (2/3 width) */}
        <div className="flex flex-col gap-[20px]">
          {/* Reject or Return Reasons Warning Alert */}
          {(selectedReq.status === 'REJECTED' ) && selectedReq.rejectReason && (
            <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[12px] py-[16px] px-[20px]">
              <div className="text-[13px] font-extrabold text-[#be123c] flex items-center gap-[8px]">
                <XCircle size={18} /> LÝ DO TỪ CHỐI HẲN
              </div>
              <p className="text-[13px] text-[#9f1239] mt-[6px] mr-0 mb-0 ml-0 leading-[1.5]">
                {selectedReq.rejectReason}
              </p>
            </div>
          )}

          {selectedReq.status === 'NEED_MORE_INFO' && selectedReq.returnReason && (
            <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-[12px] py-[16px] px-[20px]">
              <div className="text-[13px] font-extrabold text-[#c2410c] flex items-center gap-[8px]">
                <RotateCcw size={18} /> YÊU CẦU BỔ SUNG THÔNG TIN
              </div>
              <p className="text-[13px] text-[#9a3412] mt-[6px] mr-0 mb-0 ml-0 leading-[1.5]">
                {selectedReq.returnReason}
              </p>
            </div>
          )}

          {/* Cảnh báo giá chưa được xác nhận cho Sale */}
          {selectedReq && (selectedReq.status !== 'QUOTED' && selectedReq.status !== 'CLOSED') && priceVal > 0 && currentRole === 'SALE' && (
            <div className="bg-[#fff7ed] border-[1.5px] border-[#fed7aa] rounded-[12px] py-[16px] px-[20px] flex items-center gap-[14px] shadow-[0_2px_6px_rgba(234,88,12,0.08)]">
              <AlertTriangle size={24} color="#ea580c" className="shrink-0" />
              <div>
                <div className="text-[13.5px] font-extrabold text-[#c2410c]">
                  GIÁ CHƯA ĐƯỢC XÁC NHẬN BỞI ADMIN / ORDER
                </div>
                <p className="text-[12.5px] text-[#9a3412] mt-[4px] mr-0 mb-0 ml-0 leading-[1.5] font-semibold">
                  <strong>Lưu ý:</strong> Mức giá bên dưới chỉ là giá tạm tính / ước tính. Giá <strong>chưa được xác nhận, tuyệt đối không được báo cho khách</strong> cho đến khi đơn chuyển sang trạng thái &quot;ĐÃ BÁO GIÁ&quot;.
                </p>
              </div>
            </div>
          )}


          {/* Product Overview Card & Gallery */}
          <div className={cardCls}>
            <h2 className="text-[18px] font-black text-text mb-[16px]">
              {selectedReq.productName || 'Sản phẩm mẫu'}
            </h2>

            <div className="grid grid-cols-[260px_1fr] gap-[20px]">
              {/* Media Preview & Thumbnails (video trước, rồi ảnh) */}
              <div>
                <div
                  className={clsx(
                    'w-full h-[230px] rounded-[12px] overflow-hidden border border-border relative shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
                    currentMedia?.type === 'video' ? 'bg-[#000] cursor-default' : 'bg-surface cursor-zoom-in',
                  )}
                  onClick={() => {
                    if (currentMedia?.type === 'image') setLightboxOpen(true);
                  }}
                  title={currentMedia?.type === 'image' ? 'Bấm để xem ảnh phóng to' : undefined}
                >
                  {currentMedia?.type === 'video' ? (
                    <video
                      controls
                      src={currentMedia.url}
                      className="w-full h-full object-contain bg-[#000]"
                    />
                  ) : (
                    <img
                      src={currentMedia?.url}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                      }}
                      className="w-full h-full object-cover transition-transform duration-250 ease hover:scale-[1.03]"
                    />
                  )}

                  {mediaList.length > 1 && (
                    <>
                      <span
                        className="absolute bottom-[10px] right-[10px] bg-[rgba(15,23,42,0.85)] backdrop-blur-[4px] text-surface text-[12.5px] font-extrabold py-[5px] px-[12px] rounded-[20px] border border-[rgba(255,255,255,0.25)] shadow-[0_2px_6px_rgba(0,0,0,0.25)] flex items-center gap-[5px] pointer-events-none"
                      >
                        {currentMedia?.type === 'video' ? <Play size={13} /> : <ImageIcon size={13} />}{' '}
                        {currentMediaIdx + 1} / {mediaList.length}
                      </span>

                      <ImageNavButton
                        direction="prev"
                        title="Trước"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex(currentMediaIdx > 0 ? currentMediaIdx - 1 : mediaList.length - 1);
                        }}
                      />

                      <ImageNavButton
                        direction="next"
                        title="Kế tiếp"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex(currentMediaIdx < mediaList.length - 1 ? currentMediaIdx + 1 : 0);
                        }}
                      />
                    </>
                  )}
                </div>

                {mediaList.length > 1 && (
                  <div className="flex gap-[8px] mt-[10px] overflow-x-auto pb-[4px]">
                    {mediaList.map((m, idx) => {
                      const selected = currentMediaIdx === idx;
                      const thumbCls = clsx(
                        'w-[52px] h-[52px] rounded-[8px] object-cover cursor-pointer transition-[border-color_0.15s_ease,box-shadow_0.15s_ease] shrink-0',
                        m.type === 'video' ? 'bg-[#000]' : 'bg-surface',
                        selected
                          ? 'border-2 border-primary shadow-[0_0_0_2px_rgba(37,99,235,0.25)]'
                          : 'border border-[#cbd5e1] hover:border-[#94a3b8]',
                      );
                      return m.type === 'video' ? (
                        <div
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={clsx(thumbCls, 'flex items-center justify-center')}
                          title="Xem video"
                        >
                          <Play size={18} color="#ffffff" />
                        </div>
                      ) : (
                        <img
                          key={idx}
                          src={m.url}
                          alt=""
                          onClick={() => setActiveImageIndex(idx)}
                          onDoubleClick={() => {
                            setActiveImageIndex(idx);
                            setLightboxOpen(true);
                          }}
                          className={thumbCls}
                          title={`Xem ảnh ${idx - imageOffset + 1}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Spec Badges & Details */}
              <div className="flex flex-col gap-[14px]">
                {/* Product Spec Badges (6 Badges Grid) */}
                {(() => {
                  const activeOpt = finalOption || selectedReq.options?.[0];

                  const weightVal = activeOpt?.weightChi ?? selectedReq.weightChi;
                  const weightDisplay = weightVal != null && Number(weightVal) > 0 ? `${weightVal} chỉ` : 'Theo yêu cầu';

                  let stoneDisplay = 'Không đính đá';
                  if (activeOpt?.stones && activeOpt.stones.length > 0) {
                    const totalStones = activeOpt.stones.reduce((sum, s) => sum + (s.quantity || 1), 0);
                    const names = activeOpt.stones.map((s) => `${s.quantity}v ${s.stoneName || s.stone?.name || 'đá'}`).join(', ');
                    stoneDisplay = `${totalStones} viên (${names})`;
                  } else if (activeOpt?.stoneDescription) {
                    stoneDisplay = activeOpt.stoneDescription;
                  } else if (activeOpt?.stoneCost && Number(activeOpt.stoneCost) > 0) {
                    stoneDisplay = 'Có đính đá';
                  }

                  const hasCloseRate = selectedReq.closeRatePct !== undefined && selectedReq.closeRatePct !== null;

                  return (
                    <div className="grid grid-cols-2 gap-[12px]">
                      {/* Chất liệu & thông số đá quý có độ dài nội dung biến thiên mạnh (VD danh sách
                          nhiều viên đá) — span nguyên hàng để không tạo khoảng trắng thừa so với ô 2 cột. */}
                      <SpecBadge fullWidth icon={<Gem size={14} color="#d97706" />} label="CHẤT LIỆU" value={materialsList.join(', ')} />

                      <SpecBadge
                        fullWidth
                        icon={<Sparkles size={14} color="#059669" />}
                        label="THÔNG SỐ ĐÁ QUÝ"
                        value={stoneDisplay}
                        // động — component ngoài
                        valueStyle={{ color: stoneDisplay === 'Không đính đá' ? '#64748b' : '#0f172a' }}
                      />

                      <SpecBadge icon={<Tag size={14} color="#2563eb" />} label="DANH MỤC" value={selectedReq.category?.name || 'Chưa phân loại'} />

                      <SpecBadge icon={<Scale size={14} color="#8b5cf6" />} label="KHỐI LƯỢNG (CHỈ)" value={weightDisplay} />

                      <SpecBadge
                        icon={<Ruler size={14} color="#16a34a" />}
                        label="SỐ ĐO KÍCH THƯỚC"
                        value={selectedReq.customerMeasurements || 'Theo yêu cầu tiêu chuẩn'}
                      />

                      <SpecBadge
                        icon={<Target size={14} color="#ea580c" />}
                        label="TỶ LỆ CHỐT DỰ KIẾN"
                        value={hasCloseRate ? `${selectedReq.closeRatePct}%` : 'Chưa xác định'}
                        // động — component ngoài
                        valueStyle={{ color: hasCloseRate ? '#0f172a' : '#94a3b8', fontStyle: hasCloseRate ? 'normal' : 'italic' }}
                        title={hasCloseRate ? undefined : 'Sale chưa nhập tỷ lệ chốt dự kiến cho yêu cầu này'}
                      />
                    </div>
                  );
                })()}

                {/* Additional Description / Customer Notes */}
                <div className="bg-page border border-border rounded-[10px] p-[14px]">
                  <span className="text-[11px] font-extrabold text-muted uppercase block mb-[4px]">
                    GHI CHÚ / MÔ TẢ YÊU CẦU CỦA KHÁCH HÀNG
                  </span>
                  <p className="text-[12.5px] text-[#334155] m-0 leading-[1.5]">
                    {selectedReq.desiredLeadTime || 'Không có ghi chú thêm.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Multiple Quote Options — chỉ hiện sau khi đã báo giá chính thức (qua khỏi YÊU CẦU MỚI),
              đã chốt với khách (CLOSED) thì thôi, chỉ còn giá cuối. Ẩn ở PENDING vì lúc đó "option"
              (nếu có) chỉ là giá Sale tự ước tính lúc tạo yêu cầu qua Calculator, chưa ai duyệt. */}
          {selectedReq.status !== 'CLOSED' && selectedReq.status !== 'PENDING' && pricedOptions.length > 0 && (
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[16px] font-extrabold text-text m-0 flex items-center gap-[8px]">
                  <Layers size={18} color="#d97706" /> Các Phương Án Báo Giá ({pricedOptions.length})
                </h3>
                {pricedOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleCopyAllOptions(pricedOptions)}
                    className={clsx(
                      'flex items-center gap-[6px] py-[6px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[12px] font-bold cursor-pointer',
                      copiedAllOpt ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-surface text-[#334155]',
                    )}
                  >
                    {copiedAllOpt ? <Check size={13} /> : <Copy size={13} />} {copiedAllOpt ? 'Đã copy hết' : 'Copy hết'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-[8px]">
                {pricedOptions.map((opt, idx) => (
                  <OptionCard
                    key={opt.id || idx}
                    opt={opt}
                    idx={idx}
                    isFinalStatus={selectedReq.status === 'QUOTED' || selectedReq.status === 'CLOSED'}
                    copied={copiedOptIdx === idx}
                    onCopy={() => handleCopyOptionPrice(idx, opt)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width) */}
        {/* Right Column (1/3 width) */}
        <div className="flex flex-col gap-[20px]">
          {/* Financial Cost Breakdown Card */}
          <div
            className="bg-[#F3F4F6] text-[#111827] border border-[#e5e7eb] rounded-[16px] p-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col gap-[16px]"
          >
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-[12px]">
              <span className="text-[14px] font-extrabold text-[#111827] flex items-center gap-[6px]">
                <BarChart3 size={16} color="#4b5563" /> Bảng Kê Giá & VAT
              </span>
              <span className="text-[11px] font-mono text-[#4b5563] bg-surface py-[2px] px-[8px] rounded-[6px] border border-[#e5e7eb]">
                {selectedReq.code || `#${selectedReq.id}`}
              </span>
            </div>

            <div className="bg-surface rounded-[12px] p-[16px] border border-[#e5e7eb] mt-[4px]">
              <span className="text-[10.5px] font-extrabold text-[#6b7280] tracking-[0.5px] uppercase block">
                TỔNG BÁO GIÁ CHỐT
              </span>
              <div
                className={clsx(
                  'text-[26px] font-black mt-[4px]',
                  priceVal > 0
                    ? (selectedReq.status === 'QUOTED' || selectedReq.status === 'CLOSED'
                        ? 'text-[#16a34a] not-italic opacity-100'
                        : 'text-[#94a3b8] italic opacity-75')
                    : 'text-[#d97706] not-italic opacity-100',
                )}
              >
                {priceVal > 0 ? formatCurrency(priceVal) : 'Chưa có giá chốt'}
              </div>
              {priceVal > 0 && renderPriceBreakdownLines(
                getPriceBreakdown({ priceBreakdown: finalOption?.priceBreakdown }),
              )}
              
              {/* Sale chỉ cần biết có VAT hay không, không cần xem % chi tiết (ORDER/ADMIN mới xem chi tiết bên dưới) */}
              {priceVal > 0 && currentRole === 'SALE' && finalOption && finalOption.vat != null && (
                <div className={clsx('mt-[8px] text-[11.5px] font-bold', finalOption.vat > 0 ? 'text-[#0f172a]' : 'text-[#94a3b8]')}>
                  {finalOption.vat > 0 ? 'Có VAT' : 'Không VAT'}
                </div>
              )}

              {/* Chi tiết cấu thành giá — chỉ ORDER/ADMIN xem, vẫn hiện kể cả khi đã CLOSED (Sale chỉ thấy tổng).
                  Chưa có giá chốt thì chưa có gì đáng tin để hiện — ẩn hết, chỉ để lại "Chưa có giá chốt". */}
              {priceVal > 0 && (currentRole === 'ORDER' || currentRole === 'ADMIN') && finalOption &&
               (finalOption.weightChi != null || finalOption.totalMetalCost != null || finalOption.laborCost != null || finalOption.stonePrice != null || finalOption.stoneCost != null || finalOption.vat != null) && (
                <div className="flex flex-col gap-[5px] mt-[10px] pt-[10px] border-t border-dashed border-border text-[11.5px] text-[#475569]">
                  {finalOption.materials && finalOption.materials.length > 1 ? (
                    <div className="bg-page py-[6px] px-[8px] rounded-[6px] mb-[4px] border border-border">
                      <div className="font-extrabold text-[#475569] mb-[3px]">Chi tiết từng kim loại:</div>
                      {finalOption.materials.map((m: QuoteOptionMaterial, idx: number) => (
                        <div key={idx} className="flex justify-between text-[#334155] mt-[2px]">
                          <span>• {m.materialName || m.material?.name || 'Kim loại'}:</span>
                          <strong>{m.weightChi != null ? `${m.weightChi} chỉ` : '---'}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {finalOption.materialName && (
                    // động — component ngoài
                    <SpecRow label="Chất liệu" value={finalOption.materialName} valueStyle={{ textAlign: 'right' }} />
                  )}
                  {finalOption.weightChi != null && (
                    <SpecRow label="Tổng khối lượng" value={`${finalOption.weightChi} chỉ`} />
                  )}
                  {finalOption.costBreakdown ? (
                    <>
                      {Number(finalOption.metalRawCost) > 0 && (
                        <SpecRow label="Giá kim loại (giá gốc)" value={formatCurrency(Number(finalOption.metalRawCost))} />
                      )}
                      {finalOption.laborCost != null && (
                        <SpecRow label="Công chế tác" value={formatCurrency(Number(finalOption.laborCost))} />
                      )}
                      {Number(finalOption.metalRawCost) > 0 && (
                        <>
                          <SpecRow
                            label="VAT kim loại"
                            value={formatCurrency(finalOption.costBreakdown.metalVatAmount)}
                          />
                          <SpecRow
                            label="Tiền lãi kim loại"
                            // động — component ngoài
                            labelStyle={{ color: '#15803d', fontWeight: 700 }}
                            valueStyle={{ color: '#15803d' }}
                            value={formatCurrency(finalOption.costBreakdown.metalProfit)}
                          />
                        </>
                      )}
                    </>
                  ) : finalOption.totalMetalCost != null && (
                    <SpecRow
                      label={<>Giá kim loại {finalOption.stonePrice != null && '(đã gồm công, lãi, VAT)'}</>}
                      value={formatCurrency(Number(finalOption.totalMetalCost))}
                    />
                  )}
                  <div className="border-t border-dashed border-border my-[4px]" />
                  {finalOption.costBreakdown && finalOption.stonePrice != null && finalOption.stoneCost != null ? (
                    <>
                      <SpecRow label="Đá quý (giá gốc)" value={formatCurrency(Number(finalOption.stoneCost))} />
                      <SpecRow label="VAT đá quý" value={formatCurrency(finalOption.costBreakdown.stoneVatAmount)} />
                      <SpecRow
                        label="Tiền lãi đá quý"
                        // động — component ngoài
                        labelStyle={{ color: '#15803d', fontWeight: 700 }}
                        valueStyle={{ color: '#15803d' }}
                        value={formatCurrency(finalOption.costBreakdown.stoneProfit)}
                      />
                    </>
                  ) : (finalOption.stonePrice != null || finalOption.stoneCost != null) && (
                    <SpecRow
                      label={<>Tiền đá {finalOption.stonePrice != null && '(đã tính lãi)'}</>}
                      value={formatCurrency(Number(finalOption.stonePrice ?? finalOption.stoneCost))}
                    />
                  )}
                  {!finalOption.costBreakdown && finalOption.totalMetalCost == null && finalOption.laborCost != null && (
                    <SpecRow label="Tiền công" value={formatCurrency(Number(finalOption.laborCost))} />
                  )}
                  {!finalOption.costBreakdown && finalOption.totalMetalCost == null && finalOption.vat != null && (
                    <SpecRow label="VAT" value={`${finalOption.vat}%`} />
                  )}
                  {finalOption.totalMetalCost != null && finalOption.metalRawCost == null && (finalOption.laborCost != null || finalOption.vat != null) && (
                    <div className="text-[10.5px] text-[#94a3b8] italic mt-[2px]">
                      {finalOption.laborCost != null && `Trong đó tiền công vốn: ${formatCurrency(Number(finalOption.laborCost))}`}
                      {finalOption.laborCost != null && finalOption.vat != null && ' · '}
                      {finalOption.vat != null && `VAT ${finalOption.vat}%`}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Customer & Request Meta Card */}
          <div className={cardCls}>
            <h3 className="text-[15px] font-extrabold text-[#0f172a] mb-[14px] border-b border-[#f1f5f9] pb-[10px]">
              Thông Tin Đơn Yêu Cầu
            </h3>

            <div className="flex flex-col gap-[12px] text-[13px]">
              <div>
                <span className="text-[11px] text-[#64748b] font-bold uppercase">THÔNG TIN KHÁCH HÀNG</span>
                <div className="font-extrabold text-[#0f172a] text-[14px] mt-[2px] flex items-center gap-[6px]">
                  <UserIcon size={15} color="#2563eb" /> {selectedReq.customerName || selectedReq.customer?.name || 'Khách hàng lẻ'}
                </div>
                {selectedReq.customer?.phone && (
                  <div className="text-[12px] text-[#475569] mt-[4px] flex items-center gap-[6px]">
                    <Phone size={13} color="#64748b" /> SĐT: {selectedReq.customer.phone}
                  </div>
                )}
                {selectedReq.customer?.province && (
                  <div className="text-[12px] text-[#475569] font-bold mt-[4px] flex items-center gap-[6px]">
                    <Building2 size={13} color="#1d4ed8" /> Tỉnh/TP: {selectedReq.customer.province.name}
                  </div>
                )}
                {(selectedReq.customer?.address || selectedReq.customer?.ward) && (
                  <div className="text-[12px] text-[#475569] mt-[4px] flex items-center gap-[6px]">
                    <MapPin size={13} color="#ea580c" /> Địa chỉ: {[selectedReq.customer?.address, selectedReq.customer?.ward?.name].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-[#f1f5f9]" />

              {/* Ngày mong muốn nhận hàng là mối quan tâm của khách hàng, không phải dữ liệu xử lý
                  nội bộ — nhóm chung với thông tin khách hàng ở trên thay vì kẹp giữa các mốc thời
                  gian nội bộ bên dưới. */}
              <div>
                <span className="text-[11px] text-[#64748b] font-bold uppercase">NGÀY MONG MUỐN NHẬN HÀNG</span>
                <div className="font-extrabold text-[#e11d48] mt-[2px] flex items-center gap-[6px]">
                  <Calendar size={15} /> {selectedReq.desiredDate || selectedReq.desiredLeadTime || 'Gấp trong 3 ngày'}
                </div>
              </div>

              {/* Ranh giới rõ ràng hơn giữa mối quan tâm của khách hàng (trên) và dữ liệu xử lý nội
                  bộ (dưới) — nhãn nhóm riêng thay vì chỉ 1 divider mảnh như giữa các field cùng nhóm. */}
              <div className="mt-[4px] pt-[14px] border-t border-border">
                <span className="text-[10px] font-extrabold text-[#94a3b8] uppercase tracking-[0.6px]">
                  Xử Lý Nội Bộ
                </span>
              </div>

              <div>
                <span className="text-[11px] text-[#64748b] font-bold uppercase">NGƯỜI TẠO YÊU CẦU</span>
                <div className="font-extrabold text-[#334155] mt-[2px]">
                  {selectedReq.requester?.name || selectedReq.createdBy?.name || 'Kinh Doanh'}
                </div>
                <div className="text-[11.5px] text-[#64748b] mt-[2px] flex items-center gap-[6px]">
                  <Building2 size={13} color="#64748b" /> {selectedReq.requester?.department?.name || 'Store VCB'}
                </div>
              </div>

              <div className="h-[1px] bg-[#f1f5f9]" />

              <div>
                <span className="text-[11px] text-[#64748b] font-bold uppercase">CHUYÊN VIÊN BÁO GIÁ</span>
                <div className="font-extrabold text-[#2563eb] mt-[2px]">
                  {selectedReq.assignee?.name || 'Chưa phân công'}
                </div>
              </div>

              {(timeToAccept !== null || timeToQuote !== null || timeToReturn !== null || timeToReject !== null) && (
                <>
                  <div className="h-[1px] bg-[#f1f5f9]" />
                  <div>
                    <span className="text-[11px] text-[#64748b] font-bold uppercase inline-flex items-center gap-[4px]">
                      THỜI GIAN XỬ LÝ
                      <span
                        title={
                          'Nhận xử lý sau: từ lúc tạo yêu cầu đến lúc ORDER tiếp nhận.\n' +
                          'Báo giá sau: từ lúc tiếp nhận đến lúc báo giá.\n' +
                          'Trả lại sau: từ lúc tiếp nhận đến lúc trả lại Sale.\n' +
                          'Từ chối sau: từ lúc tiếp nhận đến lúc từ chối.'
                        }
                        className="inline-flex cursor-help text-[#94a3b8]"
                      >
                        <HelpCircle size={12} />
                      </span>
                    </span>
                    <div className="flex flex-col gap-[4px] mt-[4px]">
                      {timeToAccept !== null && (
                        <div className="font-bold text-[#334155]">Nhận xử lý sau {timeToAccept}</div>
                      )}
                      {timeToQuote !== null && (
                        <div className="font-bold text-[#0f766e]">Báo giá sau {timeToQuote}</div>
                      )}
                      {timeToReturn !== null && (
                        <div className="font-bold text-[#c2410c]">Trả lại sau {timeToReturn}</div>
                      )}
                      {timeToReject !== null && (
                        <div className="font-bold text-[#be123c]">Từ chối sau {timeToReject}</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && currentMedia?.type === 'image' && (
        <ImageLightbox
          images={imagesList}
          activeIndex={Math.max(0, currentMediaIdx - imageOffset)}
          onIndexChange={(i) => setActiveImageIndex(i + imageOffset)}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {selectedReq.assigneeId && isChatParticipant && socket && (
        <ChatPopup
          key={selectedReq.id}
          quoteRequestId={selectedReq.id}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          socket={socket}
          unreadCount={chatUnreadCount}
          onOpenChange={(open) => { setIsChatOpen(open); if (open) setChatUnreadCount(0); }}
        />
      )}
    </div>
  );
};
