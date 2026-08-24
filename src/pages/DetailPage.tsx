import React, { useState, useEffect, useRef } from 'react';
import type { QuoteRequest, DetailPageProps } from '../types';
import {
  ArrowLeft,
  XCircle,
  RotateCcw,
  FilePlus,
  Clock,
  CheckCircle,
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
  Award,
  Scale,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchQuoteRequestById, fetchChatMessages } from '../services/api';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { UI_CONSTANTS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { cleanOptionLabel, stripAppliedPct } from '../utils/quoteOption';
import { ChatPopup } from '../components/ChatPopup';
import { ImageLightbox } from '../components/ImageLightbox';
import { CHAT_EVENTS } from '../constants/chatEvents';
import { REALTIME_EVENTS } from '../constants/realtimeEvents';

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
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // Đảm bảo record được chọn luôn khớp chính xác với ID trên đường dẫn URL khi F5/reload
  const selectedReq =
    (initialSelectedReq && (initialSelectedReq.id === id || initialSelectedReq.code === id))
      ? initialSelectedReq
      : (loadedReq || (id ? null : initialSelectedReq));

  useEffect(() => {
    if (!id) return;
    if (initialSelectedReq && (initialSelectedReq.id === id || initialSelectedReq.code === id)) {
      setLoadedReq(initialSelectedReq);
    }
    let isMounted = true;
    if (!initialSelectedReq || (initialSelectedReq.id !== id && initialSelectedReq.code !== id)) {
      setIsFetchingDetail(true);
    }
    fetchQuoteRequestById(id)
      .then((data) => {
        if (isMounted && data) {
          setLoadedReq(data);
        }
      })
      .catch((err) => {
        console.error('Không thể tải chi tiết yêu cầu:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsFetchingDetail(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [id, initialSelectedReq?.id, initialSelectedReq?.code]);

  const rawImages = selectedReq?.images || [];
  const imagesList =
    rawImages.length > 0
      ? rawImages
          .map((img: any) => (typeof img === 'string' ? img : img.imageUrl))
          .filter(Boolean)
      : [UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentImageIdx = Math.min(activeImageIndex, Math.max(0, imagesList.length - 1));
  const mainImageUrl = imagesList[currentImageIdx] || imagesList[0];

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

  const handleCopyOptionPrice = (idx: number, opt: { optionName: string; materialName?: string; quotedPrice: number }) => {
    const text = `${cleanOptionLabel(opt)}: ${formatCurrency(Number(opt.quotedPrice))}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOptIdx(idx);
      setTimeout(() => setCopiedOptIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAllOptions = (options: { optionName: string; materialName?: string; quotedPrice: number }[]) => {
    const text = options
      .map((opt) => `${cleanOptionLabel(opt)}: ${formatCurrency(Number(opt.quotedPrice))}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAllOpt(true);
      setTimeout(() => setCopiedAllOpt(false), 1500);
    }).catch(() => {});
  };

  if (isFetchingDetail && !selectedReq) {
    return <LoadingOverlay show message="Đang tải thông tin chi tiết yêu cầu báo giá..." />;
  }

  if (!selectedReq) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Không tìm thấy thông tin yêu cầu</h2>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '16px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  // Price calculations
  const priceVal = selectedReq.quotedPrice ? Number(selectedReq.quotedPrice) : 0;

  // Ẩn option nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu, quotedPrice null)
  // khỏi đếm số/danh sách/copy-hết — chỉ phương án đã tính giá thật mới coi là 1 phương án báo giá.
  const pricedOptions = selectedReq.options?.filter((o) => o.quotedPrice != null) || [];

  // Phương án đã chốt (hoặc đang được chọn trong DB) — dùng để hiện chi tiết cấu thành giá cho ORDER/ADMIN
  const finalOption =
    selectedReq.options?.find((o) => o.selectionStatus === 'CLOSED' || o.selectionStatus === 'SELECTED') ||
    pricedOptions[pricedOptions.length - 1] ||
    selectedReq.options?.[0] ||
    null;

  // Tên phương án đang được tính vào TỔNG BÁO GIÁ CHỐT ở sidebar — dùng để tạo liên kết
  // trực quan giữa số tiền ở sidebar và dòng phương án tương ứng trong "Các Phương Án Báo Giá".
  const finalOptionIndexInList = pricedOptions.findIndex((o) => o.id === finalOption?.id);
  const finalOptionLabel = finalOption
    ? cleanOptionLabel(finalOption) ||
      stripAppliedPct(finalOption.optionName) ||
      (finalOptionIndexInList >= 0 ? `Phương án ${finalOptionIndexInList + 1}` : '')
    : '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="status-pill new" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <FilePlus size={14} /> YÊU CẦU MỚI
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="status-pill process" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <Clock size={14} /> ĐANG XỬ LÝ
          </span>
        );
      case 'QUOTED':
        return (
          <span className="status-pill done" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <CheckCircle size={14} /> ĐÃ BÁO GIÁ
          </span>
        );
      case 'REJECTED':
        return (
          <span className="status-pill reject" style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <XCircle size={14} /> BỊ TỪ CHỐI
          </span>
        );
      case 'NEED_MORE_INFO':
        return (
          <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <RotateCcw size={14} /> CẦN BỔ SUNG
          </span>
        );
      case 'CLOSED':
        return (
          <span className="status-pill closed" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '5px 14px', fontSize: '12.5px', fontWeight: 800 }}>
            <Award size={14} /> ĐÃ CHỐT ĐƠN
          </span>
        );
      default:
        return <span className="status-pill new">{status}</span>;
    }
  };

  const diffDays = (from?: string, to?: string): string | null => {
    if (!from || !to) return null;
    const ms = new Date(to).getTime() - new Date(from).getTime();
    if (Number.isNaN(ms) || ms < 0) return null;
    const seconds = ms / 1000;
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))} giây`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} phút`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.max(1, Math.round(hours))} giờ`;
    return `${Math.round(hours / 24)} ngày`;
  };

  const timeToAccept = diffDays(selectedReq.createdAt, selectedReq.acceptedAt);
  const timeToQuote = diffDays(selectedReq.acceptedAt, selectedReq.quotedDate);
  const timeToReturn = diffDays(selectedReq.acceptedAt, selectedReq.returnedAt);
  const timeToReject = selectedReq.status === 'REJECTED' 
    ? diffDays(selectedReq.acceptedAt || selectedReq.createdAt, selectedReq.updatedAt)
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
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0' }}>
              {selectedReq.productName || 'Sản phẩm mẫu'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
              {/* Image Preview & Thumbnails */}
              <div>
                <div
                  style={{
                    width: '100%',
                    height: '230px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: 'zoom-in',
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onClick={() => setLightboxOpen(true)}
                  title="Bấm để xem ảnh phóng to"
                >
                  <img
                    src={mainImageUrl}
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

                  {imagesList.length > 1 && (
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
                        <ImageIcon size={13} /> {currentImageIdx + 1} / {imagesList.length}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
                        }}
                        style={{
                          position: 'absolute',
                          left: '8px',
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
                        title="Ảnh trước"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
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
                        title="Ảnh kế tiếp"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                {imagesList.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {imagesList.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt=""
                        onClick={() => setActiveImageIndex(idx)}
                        onDoubleClick={() => {
                          setActiveImageIndex(idx);
                          setLightboxOpen(true);
                        }}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          background: '#ffffff',
                          border: currentImageIdx === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          boxShadow: currentImageIdx === idx ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (currentImageIdx !== idx) e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                          if (currentImageIdx !== idx) e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        title={`Xem ảnh ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Product Spec Badges & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Product Spec Badges (6 Badges Grid) */}
                {(() => {
                  const activeOpt = finalOption || selectedReq.options?.[0];

                  const weightVal = activeOpt?.weightChi ?? (selectedReq as any).weightChi;
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
                      <div style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Gem size={14} color="#d97706" /> CHẤT LIỆU
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', display: 'block' }}>
                          {materialsList.join(', ')}
                        </strong>
                      </div>

                      <div style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Sparkles size={14} color="#059669" /> THÔNG SỐ ĐÁ QUÝ
                        </span>
                        <strong style={{ fontSize: '13px', color: stoneDisplay === 'Không đính đá' ? '#64748b' : '#0f172a', marginTop: '4px', display: 'block' }}>
                          {stoneDisplay}
                        </strong>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Tag size={14} color="#2563eb" /> DANH MỤC
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', display: 'block' }}>
                          {selectedReq.category?.name || 'Chưa phân loại'}
                        </strong>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Scale size={14} color="#8b5cf6" /> KHỐI LƯỢNG (CHỈ)
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', display: 'block' }}>
                          {weightDisplay}
                        </strong>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Ruler size={14} color="#16a34a" /> SỐ ĐO KÍCH THƯỚC
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', display: 'block' }}>
                          {selectedReq.customerMeasurements || 'Theo yêu cầu tiêu chuẩn'}
                        </strong>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Target size={14} color="#ea580c" /> TỶ LỆ CHỐT DỰ KIẾN
                        </span>
                        <strong
                          style={{
                            fontSize: '13px',
                            color: hasCloseRate ? '#0f172a' : '#94a3b8',
                            fontStyle: hasCloseRate ? 'normal' : 'italic',
                            marginTop: '4px',
                            display: 'block',
                          }}
                          title={hasCloseRate ? undefined : 'Sale chưa nhập tỷ lệ chốt dự kiến cho yêu cầu này'}
                        >
                          {hasCloseRate ? `${selectedReq.closeRatePct}%` : 'Chưa xác định'}
                        </strong>
                      </div>
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
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
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
                {pricedOptions.map((opt, idx) => {
                  const price = opt.quotedPrice ? formatCurrency(Number(opt.quotedPrice)) : '---';
                  const label = cleanOptionLabel(opt) || stripAppliedPct(opt.optionName) || `Phương án ${idx + 1}`;

                  // Chất liệu đọc từ materials[] có cấu trúc trước — optionName/materialName tóm tắt
                  // thường không có (VD: option tạo qua "Nhập/Đổi Giá Khác" chỉ có tên "Phương án N").
                  const optMaterial =
                    opt.materials && opt.materials.length > 0
                      ? opt.materials.map((m) => m.materialName || m.material?.name).filter(Boolean).join(', ')
                      : opt.materialName || '';

                  const optWeight = opt.weightChi != null && Number(opt.weightChi) > 0 ? `${opt.weightChi} chỉ` : null;
                  let optStones = '';
                  if (opt.stones && opt.stones.length > 0) {
                    optStones = opt.stones.map((s) => `${s.quantity}v ${s.stoneName || s.stone?.name || 'đá'}`).join(', ');
                  } else if (opt.stoneDescription) {
                    optStones = opt.stoneDescription;
                  } else if (opt.stoneCost && Number(opt.stoneCost) > 0) {
                    optStones = `Đá ${formatCurrency(Number(opt.stoneCost))}`;
                  }

                  const isFinalStatus = selectedReq.status === 'QUOTED' || selectedReq.status === 'CLOSED';

                  return (
                    <div
                      key={opt.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                          {label}
                        </span>
                        {(optMaterial || optWeight || optStones) && (
                          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                            {optMaterial ? `Chất liệu: ${optMaterial}` : ''}
                            {optMaterial && (optWeight || optStones) ? ' · ' : ''}
                            {optWeight ? `KL: ${optWeight}` : ''}
                            {optWeight && optStones ? ' · ' : ''}
                            {optStones ? `Đá: ${optStones}` : ''}
                          </span>
                        )}
                      </div>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <strong
                          style={{
                            fontSize: '15px',
                            fontWeight: 900,
                            color: isFinalStatus ? '#16a34a' : '#94a3b8',
                            fontStyle: isFinalStatus ? 'normal' : 'italic',
                            opacity: isFinalStatus ? 1 : 0.8,
                          }}
                        >
                          {price}
                        </strong>
                        {!isFinalStatus && (
                          <span style={{ fontSize: '10px', color: '#ea580c', background: '#fff7ed', border: '1px solid #ffedd5', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            Chưa duyệt
                          </span>
                        )}
                        {isFinalStatus && opt.quotedPrice != null && (
                          <button
                            type="button"
                            title={`Copy dòng chữ: "${label}: ${price}"`}
                            onClick={() => handleCopyOptionPrice(idx, opt)}
                            style={{
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              border: '1px solid #cbd5e1',
                              background: copiedOptIdx === idx ? '#dcfce7' : '#ffffff',
                              color: copiedOptIdx === idx ? '#16a34a' : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {copiedOptIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
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

              {/* Liên kết trực quan tới dòng phương án tương ứng trong "Các Phương Án Báo Giá" —
                  tránh để 2 con số giống nhau nằm 2 nơi cách xa mà không có gì nối chúng lại. */}
              {finalOptionLabel && priceVal > 0 && selectedReq.status !== 'PENDING' && selectedReq.status !== 'CLOSED' && (
                <div
                  style={{
                    marginTop: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#16a34a',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '20px',
                    padding: '2px 10px',
                  }}
                >
                  <Layers size={11} /> Theo {finalOptionLabel}
                </div>
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
                      {finalOption.materials.map((m: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', marginTop: '2px' }}>
                          <span>• {m.materialName || m.material?.name || 'Kim loại'}:</span>
                          <strong>{m.weightChi != null ? `${m.weightChi} chỉ` : '---'}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {finalOption.materialName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Chất liệu</span><strong style={{ color: '#0f172a', textAlign: 'right' }}>{finalOption.materialName}</strong>
                    </div>
                  )}
                  {finalOption.weightChi != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Tổng khối lượng</span><strong style={{ color: '#0f172a' }}>{finalOption.weightChi} chỉ</strong>
                    </div>
                  )}
                  {finalOption.totalMetalCost != null && finalOption.metalRawCost != null && finalOption.vat != null ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span>Giá kim loại (giá gốc)</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.metalRawCost))}</strong>
                      </div>
                      {finalOption.laborCost != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <span>Công chế tác</span>
                          <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.laborCost))}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span>VAT kim loại</span>
                        <strong style={{ color: '#0f172a' }}>
                          {formatCurrency((Number(finalOption.metalRawCost) + Number(finalOption.laborCost || 0)) * (Number(finalOption.vat) / 100))}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>Tiền lãi kim loại</span>
                        <strong style={{ color: '#15803d' }}>
                          {formatCurrency(
                            Number(finalOption.totalMetalCost)
                              - (Number(finalOption.metalRawCost) + Number(finalOption.laborCost || 0)) * (1 + Number(finalOption.vat) / 100),
                          )}
                        </strong>
                      </div>
                    </>
                  ) : finalOption.totalMetalCost != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Giá kim loại {finalOption.stonePrice != null && '(đã gồm công, lãi, VAT)'}</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.totalMetalCost))}</strong>
                    </div>
                  )}
                  <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />
                  {finalOption.stonePrice != null && finalOption.stoneCost != null && finalOption.vat != null ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span>Đá quý (giá gốc)</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.stoneCost))}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span>VAT đá quý</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.stoneCost) * (Number(finalOption.vat) / 100))}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>Tiền lãi đá quý</span>
                        <strong style={{ color: '#15803d' }}>
                          {formatCurrency(Number(finalOption.stonePrice) - Number(finalOption.stoneCost) * (1 + Number(finalOption.vat) / 100))}
                        </strong>
                      </div>
                    </>
                  ) : (finalOption.stonePrice != null || finalOption.stoneCost != null) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Tiền đá {finalOption.stonePrice != null && '(đã tính lãi)'}</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.stonePrice ?? finalOption.stoneCost))}</strong>
                    </div>
                  )}
                  {finalOption.totalMetalCost == null && finalOption.laborCost != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Tiền công</span><strong style={{ color: '#0f172a' }}>{formatCurrency(Number(finalOption.laborCost))}</strong>
                    </div>
                  )}
                  {finalOption.totalMetalCost == null && finalOption.vat != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>VAT</span><strong style={{ color: '#0f172a' }}>{finalOption.vat}%</strong>
                    </div>
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
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
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
                    <Building2 size={13} color="#1d4ed8" /> Tỉnh/TP: {selectedReq.customer.province}
                  </div>
                )}
                {(selectedReq.customer?.address || selectedReq.customer?.ward) && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#ea580c" /> Địa chỉ: {[selectedReq.customer?.address, selectedReq.customer?.ward].filter(Boolean).join(', ')}
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

      {lightboxOpen && (
        <ImageLightbox
          images={imagesList}
          activeIndex={currentImageIdx}
          onIndexChange={setActiveImageIndex}
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
