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
import { cardStyle } from '../styles/card';
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
    style={{
      position: 'absolute',
      [direction === 'prev' ? 'left' : 'right']: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(15, 23, 42, 0.65)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'background 0.15s ease, transform 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)';
      e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)';
      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
    }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={16} /> 
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {selectedReq.code || `#RQ-${selectedReq.id}`}
              </h1>
              {getStatusBadge(selectedReq.status)}
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Tạo lúc {selectedReq.createdAt ? new Date(selectedReq.createdAt).toLocaleString('vi-VN') : '---'}
            </p>
          </div>
        </div>

        {/* Trang chi tiết chỉ để xem — mọi thao tác đổi trạng thái (tiếp nhận/báo giá/từ chối/
            trả lại/sửa/xóa/đánh dấu chốt) đã chuyển hết ra bảng danh sách, không còn nút nào ở
            đây gọi API thay đổi dữ liệu nữa. */}
      </div>

      {/* Main 2-Column Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column (2/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Reject or Return Reasons Warning Alert */}
          {(selectedReq.status === 'REJECTED' ) && selectedReq.rejectReason && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#be123c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} /> LÝ DO TỪ CHỐI HẲN
              </div>
              <p style={{ fontSize: '13px', color: '#9f1239', margin: '6px 0 0 0', lineHeight: '1.5' }}>
                {selectedReq.rejectReason}
              </p>
            </div>
          )}

          {selectedReq.status === 'NEED_MORE_INFO' && selectedReq.returnReason && (
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} /> YÊU CẦU BỔ SUNG THÔNG TIN
              </div>
              <p style={{ fontSize: '13px', color: '#9a3412', margin: '6px 0 0 0', lineHeight: '1.5' }}>
                {selectedReq.returnReason}
              </p>
            </div>
          )}

          {/* Cảnh báo giá chưa được xác nhận cho Sale */}
          {selectedReq && (selectedReq.status !== 'QUOTED' && selectedReq.status !== 'CLOSED') && priceVal > 0 && currentRole === 'SALE' && (
            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)' }}>
              <AlertTriangle size={24} color="#ea580c" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#c2410c' }}>
                  GIÁ CHƯA ĐƯỢC XÁC NHẬN BỞI ADMIN / ORDER
                </div>
                <p style={{ fontSize: '12.5px', color: '#9a3412', margin: '4px 0 0 0', lineHeight: '1.5', fontWeight: 600 }}>
                  <strong>Lưu ý:</strong> Mức giá bên dưới chỉ là giá tạm tính / ước tính. Giá <strong>chưa được xác nhận, tuyệt đối không được báo cho khách</strong> cho đến khi đơn chuyển sang trạng thái &quot;ĐÃ BÁO GIÁ&quot;.
                </p>
              </div>
            </div>
          )}


          {/* Product Overview Card & Gallery */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0' }}>
              {selectedReq.productName || 'Sản phẩm mẫu'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
              {/* Media Preview & Thumbnails (video trước, rồi ảnh) */}
              <div>
                <div
                  style={{
                    width: '100%',
                    height: '230px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: currentMedia?.type === 'video' ? '#000' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: currentMedia?.type === 'image' ? 'zoom-in' : 'default',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onClick={() => {
                    if (currentMedia?.type === 'image') setLightboxOpen(true);
                  }}
                  title={currentMedia?.type === 'image' ? 'Bấm để xem ảnh phóng to' : undefined}
                >
                  {currentMedia?.type === 'video' ? (
                    <video
                      controls
                      src={currentMedia.url}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                    />
                  ) : (
                    <img
                      src={currentMedia?.url}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.25s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  )}

                  {mediaList.length > 1 && (
                    <>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          padding: '5px 12px',
                          borderRadius: '20px',
                          border: '1px solid rgba(255,255,255,0.25)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          pointerEvents: 'none',
                        }}
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {mediaList.map((m, idx) => {
                      const selected = currentMediaIdx === idx;
                      const commonStyle: React.CSSProperties = {
                        width: '52px',
                        height: '52px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        background: m.type === 'video' ? '#000' : '#ffffff',
                        border: selected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        flexShrink: 0,
                      };
                      return m.type === 'video' ? (
                        <div
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          style={{ ...commonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                          style={commonStyle}
                          onMouseEnter={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = '#94a3b8';
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          title={`Xem ảnh ${idx - imageOffset + 1}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product Spec Badges & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Chất liệu & thông số đá quý có độ dài nội dung biến thiên mạnh (VD danh sách
                          nhiều viên đá) — span nguyên hàng để không tạo khoảng trắng thừa so với ô 2 cột. */}
                      <SpecBadge fullWidth icon={<Gem size={14} color="#d97706" />} label="CHẤT LIỆU" value={materialsList.join(', ')} />

                      <SpecBadge
                        fullWidth
                        icon={<Sparkles size={14} color="#059669" />}
                        label="THÔNG SỐ ĐÁ QUÝ"
                        value={stoneDisplay}
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
                        valueStyle={{ color: hasCloseRate ? '#0f172a' : '#94a3b8', fontStyle: hasCloseRate ? 'normal' : 'italic' }}
                        title={hasCloseRate ? undefined : 'Sale chưa nhập tỷ lệ chốt dự kiến cho yêu cầu này'}
                      />
                    </div>
                  );
                })()}

                {/* Additional Description / Customer Notes */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    GHI CHÚ / MÔ TẢ YÊU CẦU CỦA KHÁCH HÀNG
                  </span>
                  <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: '1.5' }}>
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
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#d97706" /> Các Phương Án Báo Giá ({pricedOptions.length})
                </h3>
                {pricedOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleCopyAllOptions(pricedOptions)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: copiedAllOpt ? '#dcfce7' : '#ffffff',
                      color: copiedAllOpt ? '#16a34a' : '#334155',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {copiedAllOpt ? <Check size={13} /> : <Copy size={13} />} {copiedAllOpt ? 'Đã copy hết' : 'Copy hết'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Financial Cost Breakdown Card */}
          <div
            style={{
              background: '#F3F4F6',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={16} color="#4b5563" /> Bảng Kê Giá & VAT
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                {selectedReq.code || `#${selectedReq.id}`}
              </span>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', marginTop: '4px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>
                TỔNG BÁO GIÁ CHỐT
              </span>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 900,
                  color: priceVal > 0 ? (selectedReq.status === 'QUOTED' || selectedReq.status === 'CLOSED' ? '#16a34a' : '#94a3b8') : '#d97706',
                  fontStyle: priceVal > 0 && selectedReq.status !== 'QUOTED' && selectedReq.status !== 'CLOSED' ? 'italic' : 'normal',
                  opacity: priceVal > 0 && selectedReq.status !== 'QUOTED' && selectedReq.status !== 'CLOSED'  ? 0.75 : 1,
                  marginTop: '4px'
                }}
              >
                {priceVal > 0 ? formatCurrency(priceVal) : 'Chưa có giá chốt'}
              </div>
              {priceVal > 0 && renderPriceBreakdownLines(
                getPriceBreakdown({ priceBreakdown: finalOption?.priceBreakdown }),
              )}
              
              {/* Sale chỉ cần biết có VAT hay không, không cần xem % chi tiết (ORDER/ADMIN mới xem chi tiết bên dưới) */}
              {currentRole === 'SALE' && finalOption && finalOption.vat != null && (
                <div style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: 700, color: finalOption.vat > 0 ? '#0f172a' : '#94a3b8' }}>
                  {finalOption.vat > 0 ? 'Có VAT' : 'Không VAT'}
                </div>
              )}

              {/* Chi tiết cấu thành giá — chỉ ORDER/ADMIN xem, vẫn hiện kể cả khi đã CLOSED (Sale chỉ thấy tổng) */}
              {(currentRole === 'ORDER' || currentRole === 'ADMIN') && finalOption &&
               (finalOption.weightChi != null || finalOption.totalMetalCost != null || finalOption.laborCost != null || finalOption.stonePrice != null || finalOption.stoneCost != null || finalOption.vat != null) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', fontSize: '11.5px', color: '#475569' }}>
                  {finalOption.materials && finalOption.materials.length > 1 ? (
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', marginBottom: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 800, color: '#475569', marginBottom: '3px' }}>Chi tiết từng kim loại:</div>
                      {finalOption.materials.map((m: QuoteOptionMaterial, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', marginTop: '2px' }}>
                          <span>• {m.materialName || m.material?.name || 'Kim loại'}:</span>
                          <strong>{m.weightChi != null ? `${m.weightChi} chỉ` : '---'}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {finalOption.materialName && (
                    <SpecRow label="Chất liệu" value={finalOption.materialName} valueStyle={{ textAlign: 'right' }} />
                  )}
                  {finalOption.weightChi != null && (
                    <SpecRow label="Tổng khối lượng" value={`${finalOption.weightChi} chỉ`} />
                  )}
                  {finalOption.costBreakdown ? (
                    <>
                      <SpecRow label="Giá kim loại (giá gốc)" value={formatCurrency(Number(finalOption.metalRawCost))} />
                      {finalOption.laborCost != null && (
                        <SpecRow label="Công chế tác" value={formatCurrency(Number(finalOption.laborCost))} />
                      )}
                      <SpecRow
                        label="VAT kim loại"
                        value={formatCurrency(finalOption.costBreakdown.metalVatAmount)}
                      />
                      <SpecRow
                        label="Tiền lãi kim loại"
                        labelStyle={{ color: '#15803d', fontWeight: 700 }}
                        valueStyle={{ color: '#15803d' }}
                        value={formatCurrency(finalOption.costBreakdown.metalProfit)}
                      />
                    </>
                  ) : finalOption.totalMetalCost != null && (
                    <SpecRow
                      label={<>Giá kim loại {finalOption.stonePrice != null && '(đã gồm công, lãi, VAT)'}</>}
                      value={formatCurrency(Number(finalOption.totalMetalCost))}
                    />
                  )}
                  <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />
                  {finalOption.costBreakdown && finalOption.stonePrice != null && finalOption.stoneCost != null ? (
                    <>
                      <SpecRow label="Đá quý (giá gốc)" value={formatCurrency(Number(finalOption.stoneCost))} />
                      <SpecRow label="VAT đá quý" value={formatCurrency(finalOption.costBreakdown.stoneVatAmount)} />
                      <SpecRow
                        label="Tiền lãi đá quý"
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
                  {finalOption.totalMetalCost == null && finalOption.laborCost != null && (
                    <SpecRow label="Tiền công" value={formatCurrency(Number(finalOption.laborCost))} />
                  )}
                  {finalOption.totalMetalCost == null && finalOption.vat != null && (
                    <SpecRow label="VAT" value={`${finalOption.vat}%`} />
                  )}
                  {finalOption.totalMetalCost != null && finalOption.metalRawCost == null && (finalOption.laborCost != null || finalOption.vat != null) && (
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
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
          <div style={cardStyle}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              Thông Tin Đơn Yêu Cầu
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>THÔNG TIN KHÁCH HÀNG</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon size={15} color="#2563eb" /> {selectedReq.customerName || selectedReq.customer?.name || 'Khách hàng lẻ'}
                </div>
                {selectedReq.customer?.phone && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="#64748b" /> SĐT: {selectedReq.customer.phone}
                  </div>
                )}
                {selectedReq.customer?.province && (
                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} color="#1d4ed8" /> Tỉnh/TP: {selectedReq.customer.province.name}
                  </div>
                )}
                {(selectedReq.customer?.address || selectedReq.customer?.ward) && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#ea580c" /> Địa chỉ: {[selectedReq.customer?.address, selectedReq.customer?.ward?.name].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div style={{ height: '1px', background: '#f1f5f9' }} />

              {/* Ngày mong muốn nhận hàng là mối quan tâm của khách hàng, không phải dữ liệu xử lý
                  nội bộ — nhóm chung với thông tin khách hàng ở trên thay vì kẹp giữa các mốc thời
                  gian nội bộ bên dưới. */}
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>NGÀY MONG MUỐN NHẬN HÀNG</span>
                <div style={{ fontWeight: 800, color: '#e11d48', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} /> {selectedReq.desiredDate || selectedReq.desiredLeadTime || 'Gấp trong 3 ngày'}
                </div>
              </div>

              {/* Ranh giới rõ ràng hơn giữa mối quan tâm của khách hàng (trên) và dữ liệu xử lý nội
                  bộ (dưới) — nhãn nhóm riêng thay vì chỉ 1 divider mảnh như giữa các field cùng nhóm. */}
              <div style={{ marginTop: '4px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Xử Lý Nội Bộ
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>NGƯỜI TẠO YÊU CẦU</span>
                <div style={{ fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                  {selectedReq.requester?.name || selectedReq.createdBy?.name || 'Kinh Doanh'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} color="#64748b" /> {selectedReq.requester?.department?.name || 'Store VCB'}
                </div>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9' }} />

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CHUYÊN VIÊN BÁO GIÁ</span>
                <div style={{ fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {selectedReq.assignee?.name || 'Chưa phân công'}
                </div>
              </div>

              {(timeToAccept !== null || timeToQuote !== null || timeToReturn !== null || timeToReject !== null) && (
                <>
                  <div style={{ height: '1px', background: '#f1f5f9' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      THỜI GIAN XỬ LÝ
                      <span
                        title={
                          'Nhận xử lý sau: từ lúc tạo yêu cầu đến lúc ORDER tiếp nhận.\n' +
                          'Báo giá sau: từ lúc tiếp nhận đến lúc báo giá.\n' +
                          'Trả lại sau: từ lúc tiếp nhận đến lúc trả lại Sale.\n' +
                          'Từ chối sau: từ lúc tiếp nhận đến lúc từ chối.'
                        }
                        style={{ display: 'inline-flex', cursor: 'help', color: '#94a3b8' }}
                      >
                        <HelpCircle size={12} />
                      </span>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {timeToAccept !== null && (
                        <div style={{ fontWeight: 700, color: '#334155' }}>Nhận xử lý sau {timeToAccept}</div>
                      )}
                      {timeToQuote !== null && (
                        <div style={{ fontWeight: 700, color: '#0f766e' }}>Báo giá sau {timeToQuote}</div>
                      )}
                      {timeToReturn !== null && (
                        <div style={{ fontWeight: 700, color: '#c2410c' }}>Trả lại sau {timeToReturn}</div>
                      )}
                      {timeToReject !== null && (
                        <div style={{ fontWeight: 700, color: '#be123c' }}>Từ chối sau {timeToReject}</div>
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
