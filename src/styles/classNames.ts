import { clsx } from 'clsx';

export const cardCls = 'bg-surface border border-border rounded-[16px] p-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]';
export const cardTitleCls = 'text-[15px] font-extrabold text-[#0f172a] mb-[16px]';
export const fieldLabelCls = 'text-[12.5px] font-bold text-[#374151]';
export const fieldInputCls = 'w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] pt-[11px] pr-[14px] pb-[11px] pl-[40px] text-[#111827] text-[13.5px] outline-none';
export const fieldIconCls = 'absolute left-[13px] text-[#9ca3af]';
export const goldButtonCls = 'w-full bg-[linear-gradient(135deg,#f0b429_0%,#d97706_100%)] text-surface border-0 rounded-[10px] p-[13px] text-[14.5px] font-bold cursor-pointer flex items-center justify-center gap-[8px] shadow-[0_6px_16px_rgba(217,119,6,0.35)]';
export const backLinkCls = 'bg-none border-0 text-[#9ca3af] text-[13px] cursor-pointer flex items-center justify-center gap-[6px] font-semibold mt-[4px]';
export const labelCls = 'text-[10.5px] font-bold text-[#6b7280] uppercase tracking-[0.04em] block mb-[6px]';
export const inputCls = 'w-full py-[8px] px-[10px] rounded-[8px] border border-[#cbd5e1] text-[12.5px] font-extrabold text-[#0f172a] outline-none';
export const valueBoxCls = 'inline-block py-[8px] px-[10px] border border-transparent rounded-[8px] box-border';
export const suffixCls = 'absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#94a3b8] pointer-events-none';
export const fieldErrorCls = 'text-[10.5px] text-[#dc2626] font-bold';
export const btnPrimaryCls = 'flex items-center justify-center gap-[6px] bg-[#f1f5f9] border border-[#cbd5e1] rounded-[8px] text-[#334155] text-[12.5px] font-extrabold py-[9px] px-[18px] cursor-pointer';
export const btnSecondaryCls = 'flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[8px] py-[8px] px-[16px] text-[12.5px] font-bold text-[#334155] cursor-pointer';
export const btnGhostSmallCls = 'flex items-center gap-[4px] bg-transparent border border-[#cbd5e1] rounded-[6px] py-[5px] px-[10px] text-[11px] font-bold text-[#334155] cursor-pointer';
export const iconBtnCls = 'bg-transparent border-0 cursor-pointer flex items-center justify-center p-[2px]';
export const pageBtnCls = (disabled: boolean) => clsx('py-[4px] px-[10px] rounded-[6px] border border-[#cbd5e1] bg-surface text-[11.5px] font-bold', disabled ? 'cursor-default opacity-50' : 'cursor-pointer');
export const thCls = 'py-[8px] px-[6px] text-left';
export const tdCls = 'py-[10px] px-[6px] min-h-[38px] align-middle';
export const tdCenterCls = 'py-[10px] px-[6px] text-center min-h-[38px] align-middle';
export const tableHeadRowCls = 'text-[#94a3b8] text-[10.5px] uppercase tracking-[0.04em] border-b border-[#e5e7eb]';
export const modalCloseIconBtnCls = 'bg-transparent border-0 text-[#64748b] cursor-pointer';

// ---- Modal shell (index.css .modal-*) ----
export const modalBackdropCls =
  'fixed inset-0 w-screen h-screen bg-[rgba(15,23,42,0.65)] backdrop-blur-[5px] z-[1000] flex items-center justify-center p-[20px] opacity-100 pointer-events-auto max-[768px]:!p-[10px] max-[768px]:!items-end';
export const modalCardCls =
  'bg-white rounded-[16px] w-full max-w-[820px] max-h-[90vh] overflow-y-auto shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] max-[900px]:!max-w-[95vw] max-[900px]:!max-h-[92vh] max-[768px]:!max-w-full max-[768px]:!max-h-[94vh] max-[768px]:!rounded-b-none max-[768px]:!rounded-t-[20px]';
export const modalHeaderCls =
  'bg-white text-[#0f172a] border-b border-[#e2e8f0] py-[18px] px-[24px] flex items-center justify-between sticky top-0 z-10 max-[768px]:!py-[14px] max-[768px]:!px-[16px]';
export const modalBodyCls =
  'p-[24px] flex flex-col gap-[18px] max-[768px]:!p-[14px]';
export const modalFooterCls =
  'py-[16px] px-[24px] border-t border-border bg-[#f8fafc] flex justify-end gap-[10px] max-[768px]:!py-[12px] max-[768px]:!px-[16px] max-[768px]:flex-wrap max-[768px]:!gap-[8px] max-[768px]:[&>button]:flex-1 max-[768px]:[&>button]:min-w-[120px]';
export const modalGrid2ColCls =
  'grid grid-cols-2 gap-[20px] items-start max-[768px]:!grid-cols-1 max-[768px]:!gap-[14px]';

// ---- Form primitives (index.css .form-*) ----
export const formGroupCls = 'flex flex-col gap-[6px]';
export const formLabelCls = 'text-[12.5px] font-bold text-[#0f172a]';
export const formReqCls = 'text-[#ef4444]';
export const formControlCls =
  'w-full py-[9px] px-[12px] border border-border rounded-[8px] text-[13px] outline-none transition-[border-color_0.2s] focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]';

// ---- Nút Inspector / modal (.btn-insp*) ----
export const btnInspCls =
  'w-full py-[9px] px-[14px] rounded-[8px] text-[12.5px] font-bold border-0 cursor-pointer flex items-center justify-center gap-[6px] transition-[background_0.15s]';
export const btnInspPrimaryCls = clsx(btnInspCls, 'bg-primary text-white hover:bg-primary-dark');
export const btnInspDangerCls = clsx(btnInspCls, 'bg-[#ef4444] text-white');

// ---- Nút công cụ (.tool-btn) ----
export const toolBtnCls =
  'bg-white border border-border py-[7px] px-[12px] rounded-[8px] text-[12px] font-semibold text-[#0f172a] cursor-pointer inline-flex items-center gap-[6px] transition-[background_0.15s] hover:bg-[#f1f5f9]';

// ---- Status pill (.status-pill*) ----
export const statusPillCls =
  'inline-flex items-center justify-center gap-[4px] min-w-[118px] py-[4px] px-[10px] rounded-[20px] text-[11.5px] font-bold whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]';
export const statusPillNewCls = 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]';
export const statusPillProcessCls = 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]';
export const statusPillDoneCls = 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]';
export const statusPillRejectCls = 'bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3]';

// ---- Nút FilterBar (.fb-btn) ----
export const fbBtnCls =
  'bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] rounded-[8px] font-bold cursor-pointer transition-[background_0.12s,border-color_0.12s] enabled:hover:bg-[#e2e8f0] enabled:hover:border-[#94a3b8] disabled:bg-[#f8fafc] disabled:text-[#cbd5e1] disabled:border-[#e2e8f0] disabled:cursor-not-allowed';

// ---- Dropdown item hover (.dropdown-item-hover:hover) ----
export const dropdownItemHoverCls = 'hover:!bg-[#f1f5f9] hover:!text-[#0f172a]';
