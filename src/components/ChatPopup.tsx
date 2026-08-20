import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, ChatPopupProps } from '../types';
import { fetchChatMessages, uploadChatImage } from '../services/api';
import { CHAT_EVENTS } from '../constants/chatEvents';

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

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 900,
          width: '54px', height: '54px', borderRadius: '50%',
          background: '#2563eb', color: '#ffffff', border: 'none',
          boxShadow: '0 6px 16px rgba(37,99,235,0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={connected ? 'Trao đổi với Sale/Order' : 'Không thể kết nối'}
      >
        <MessageCircle size={24} style={{ opacity: connected ? 1 : 0.5 }} />
        {!isOpen && connected && unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: '#ef4444', color: '#ffffff', borderRadius: '999px',
            fontSize: '11px', fontWeight: 800, minWidth: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px', zIndex: 900,
          width: '340px', height: '440px', background: '#ffffff',
          borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            background: '#0f172a', color: '#ffffff', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Trao đổi</span>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: connected ? '#22c55e' : '#ef4444',
              }} />
            </div>
            <button onClick={toggleOpen} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const isSending = m.status === 'sending';
              const isFailed = m.status === 'failed';

              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: '12px',
                    background: isFailed ? '#fee2e2' : mine ? '#2563eb' : '#f1f5f9',
                    color: isFailed ? '#991b1b' : mine ? '#ffffff' : '#0f172a', fontSize: '13px',
                    opacity: isSending ? 0.75 : 1,
                    transition: 'opacity 0.2s ease',
                    border: isFailed ? '1px solid #f87171' : 'none',
                  }}>
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="Ảnh đính kèm" style={{ maxWidth: '180px', borderRadius: '8px', marginBottom: m.content ? '6px' : 0 }} />
                    )}
                    {m.content}
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {m.senderName} · {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {isSending && <span style={{ color: '#3b82f6', fontStyle: 'italic' }}>· Đang gửi...</span>}
                    {isFailed && <span style={{ color: '#ef4444', fontWeight: 600 }}>· Gửi lỗi</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {!connected && (
            <div style={{ padding: '4px 12px', fontSize: '11px', color: '#ef4444', background: '#fef2f2' }}>
              Mất kết nối... Đang tự động kết nối lại
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', borderTop: '1px solid #e2e8f0' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !connected}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: connected ? 'pointer' : 'not-allowed', padding: '6px', opacity: connected ? 1 : 0.5 }}
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
              disabled={!connected}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', outline: 'none', opacity: connected ? 1 : 0.6 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!connected}
              style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: connected ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: connected ? 1 : 0.5 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
