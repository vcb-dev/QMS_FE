import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, ChatPopupProps } from '../types';
import { fetchChatMessages, uploadChatImage } from '../services/api';
import { CHAT_EVENTS } from '../constants/chatEvents';
import { ImageLightbox } from './ImageLightbox';

export const ChatPopup: React.FC<ChatPopupProps> = ({
  quoteRequestId,
  currentUserId,
  currentUserName = 'Tôi',
  socket,
  unreadCount,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Xem ảnh phóng to — logic zoom/pan/ESC dùng chung ở <ImageLightbox>, ở đây chỉ giữ ảnh đang xem
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Theo dõi trạng thái kết nối
  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleDisconnect);
    };
  }, [socket]);

  // Báo lỗi từ server
  useEffect(() => {
    const handleError = (err: { message: string }) => {
      alert(err.message || 'Có lỗi xảy ra với khung chat');
    };
    socket.on(CHAT_EVENTS.ERROR, handleError);
    return () => {
      socket.off(CHAT_EVENTS.ERROR, handleError);
    };
  }, [socket]);

  // Tải lịch sử tin nhắn khi mở popup
  useEffect(() => {
    if (!isOpen) return;
    fetchChatMessages(quoteRequestId)
      .then((res) => {
        setMessages((prev) => {
          const serverMsgs = (res.messages || []).map((m: ChatMessage) => ({ ...m, status: 'sent' as const }));
          // Giữ lại tin đang gửi dở — trừ tin nào REST vừa tải về rồi (nghĩa là đã lưu DB xong,
          // chỉ là socket 'newMessage' chưa kịp về tới client để reconcile). Không loại thì tin
          // đó bị hiện trùng 2 bubble, và bubble "Đang gửi..." kẹt vĩnh viễn vì handleNewMessage
          // thấy id đã có sẵn trong prev nên bỏ qua, không bao giờ dọn bản optimistic thừa.
          const pending = prev.filter(
            (m) =>
              m.status === 'sending' &&
              !serverMsgs.some(
                (s) =>
                  (m.content && s.content === m.content) ||
                  (m.imageUrl?.startsWith('blob:') && s.imageUrl),
              ),
          );
          return [...serverMsgs, ...pending];
        });
      })
      .catch(() => {});
    socket.emit(CHAT_EVENTS.MARK_READ, { quoteRequestId });
  }, [isOpen, quoteRequestId, socket]);

  // Nhận tin nhắn mới từ WebSocket (Reconcile với tin nhắn Optimistic)
  useEffect(() => {
    const handleNewMessage = (msg: ChatMessage & { tempId?: string }) => {
      if (msg.quoteRequestId !== quoteRequestId) return;

      setMessages((prev) => {
        // Nếu tin nhắn đã có sẵn ID này rồi thì bỏ qua
        if (prev.some((m) => m.id === msg.id)) return prev;

        // Nếu là tin do chính mình gửi, thay thế tin nhắn tạm (Optimistic) tương ứng
        if (msg.senderId === currentUserId) {
          const optIdx = prev.findIndex(
            (m) =>
              m.status === 'sending' &&
              ((msg.tempId && m.id === msg.tempId) ||
                (m.content && m.content === msg.content) ||
                (m.imageUrl && (m.imageUrl === msg.imageUrl || m.imageUrl.startsWith('blob:'))))
          );
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = { ...msg, status: 'sent' };
            return next;
          }
        }

        return [...prev, { ...msg, status: 'sent' }];
      });

      if (isOpen && msg.senderId !== currentUserId) {
        socket.emit(CHAT_EVENTS.MARK_READ, { quoteRequestId });
      }
    };

    socket.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    };
  }, [socket, quoteRequestId, isOpen, currentUserId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange(next);
  };

  // Gửi tin nhắn text với Optimistic UI (hiện ngay lập tức 0ms)
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !connected) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      quoteRequestId,
      senderId: currentUserId,
      senderName: currentUserName,
      content: trimmed,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // 1. Thêm ngay vào state UI (0ms delay)
    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');

    // 2. Gửi qua socket kèm tempId để đối chiếu
    socket.emit(CHAT_EVENTS.SEND_MESSAGE, {
      quoteRequestId,
      content: trimmed,
      tempId,
    });
  };

  // Gửi ảnh với Optimistic UI (preview ảnh cục bộ ngay lập tức)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !connected) return;

    const previewUrl = URL.createObjectURL(file);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      quoteRequestId,
      senderId: currentUserId,
      senderName: currentUserName,
      content: null,
      imageUrl: previewUrl,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // 1. Thêm ảnh xem trước ngay lập tức
    setMessages((prev) => [...prev, optimisticMsg]);
    setUploading(true);

    try {
      // 2. Tải ảnh lên Cloudinary
      const { imageUrl } = await uploadChatImage(quoteRequestId, file);
      // 3. Gửi event socket
      socket.emit(CHAT_EVENTS.SEND_MESSAGE, {
        quoteRequestId,
        imageUrl,
        tempId,
      });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
      alert(err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <>
      {zoomedImage && (
        <ImageLightbox
          images={[zoomedImage]}
          activeIndex={0}
          onIndexChange={() => {}}
          onClose={() => setZoomedImage(null)}
        />
      )}

      {/* Nút Chat nổi luôn bám cố định theo góc phải màn hình */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-[24px] right-[24px] z-[9990] w-[54px] h-[54px] rounded-full bg-primary text-white border-0 shadow-[0_6px_16px_rgba(37,99,235,0.4)] cursor-pointer flex items-center justify-center transition-[transform_0.15s_ease,box-shadow_0.15s_ease] hover:scale-105"
        title={connected ? 'Trao đổi với Sale/Order' : 'Không thể kết nối'}
      >
        <MessageCircle size={24} className={connected ? 'opacity-100' : 'opacity-50'} />
        {!isOpen && connected && unreadCount > 0 && (
          <span className="absolute top-[-2px] right-[-2px] bg-[#ef4444] text-white rounded-full text-[11px] font-extrabold min-w-[20px] h-[20px] flex items-center justify-center py-0 px-[4px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Khung Chat Popup luôn cố định góc phải màn hình */}
      {isOpen && (
        <div className="fixed bottom-[90px] right-[24px] z-[9990] w-[340px] h-[440px] bg-surface rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden">
          <div className="bg-[#0f172a] text-white py-[12px] px-[16px] flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <span className="font-bold text-[13.5px]">Trao đổi</span>
              <span className={clsx('w-[7px] h-[7px] rounded-full', connected ? 'bg-[#22c55e]' : 'bg-[#ef4444]')} />
            </div>
            <button onClick={toggleOpen} className="bg-transparent border-0 text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-[12px] flex flex-col gap-[8px]">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const isSending = m.status === 'sending';
              const isFailed = m.status === 'failed';

              return (
                <div key={m.id} className={clsx('flex flex-col', mine ? 'items-end' : 'items-start')}>
                  <div
                    className={clsx(
                      'max-w-[80%] py-[8px] px-[12px] rounded-[12px] text-[13px] transition-opacity duration-200',
                      isSending ? 'opacity-75' : 'opacity-100',
                      isFailed
                        ? 'bg-[#fee2e2] text-[#991b1b] border border-[#f87171]'
                        : mine
                          ? 'bg-primary text-white border-0'
                          : 'bg-[#f1f5f9] text-[#0f172a] border-0',
                    )}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Ảnh đính kèm"
                        onClick={() => setZoomedImage(m.imageUrl)}
                        className={clsx(
                          'max-w-[180px] max-h-[180px] rounded-[8px] cursor-zoom-in object-cover block transition-transform duration-150 hover:scale-[1.02]',
                          m.content ? 'mb-[6px]' : 'mb-0',
                        )}
                        title="Bấm để xem phóng to"
                      />
                    )}
                    {m.content}
                  </div>
                  <span className="text-[10px] text-faint mt-[2px] flex items-center gap-[4px]">
                    {m.senderName} · {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {isSending && <span className="text-[#3b82f6] italic">· Đang gửi...</span>}
                    {isFailed && <span className="text-[#ef4444] font-semibold">· Gửi lỗi</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {!connected && (
            <div className="py-[4px] px-[12px] text-[11px] text-[#ef4444] bg-[#fef2f2]">
              Mất kết nối... Đang tự động kết nối lại
            </div>
          )}

          <div className="flex items-center gap-[6px] p-[10px] border-t border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !connected}
              className={clsx(
                'bg-transparent border-0 text-muted p-[6px]',
                connected ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
              title="Đính kèm ảnh"
            >
              <ImageIcon size={18} />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={connected ? 'Nhắn gì đó...' : 'Đang kết nối...'}
              maxLength={2000}
              disabled={!connected}
              className={clsx(
                'flex-1 border border-[#cbd5e1] rounded-[20px] py-[8px] px-[14px] text-[13px] outline-none',
                connected ? 'opacity-100' : 'opacity-60',
              )}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!connected}
              className={clsx(
                'bg-primary text-white border-0 rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0',
                connected ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
