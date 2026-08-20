// Tên event Socket.IO cho chat Sale <-> Order — khớp đúng qms_be/src/quote-chat/quote-chat.gateway.ts.
export const CHAT_EVENTS = {
  JOIN_REQUEST: 'joinRequest',
  SEND_MESSAGE: 'sendMessage',
  MARK_READ: 'markRead',
  NEW_MESSAGE: 'newMessage',
  ERROR: 'error',
} as const;
