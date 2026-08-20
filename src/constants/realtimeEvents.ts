// Tên event Socket.IO cho namespace /realtime (khác /quote-chat) — khớp đúng
// qms_be/src/realtime/realtime.gateway.ts.
export const REALTIME_EVENTS = {
  STATUS_CHANGED: 'statusChanged',
} as const;
