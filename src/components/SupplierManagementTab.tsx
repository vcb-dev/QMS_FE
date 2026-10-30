import React, { useState } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Supplier } from '../types';
import { useSuppliers } from '../hooks/useSuppliers';
import { useModalA11y } from '../hooks/useModalA11y';
import { createSupplier, deleteSupplier, updateSupplier } from '../services/api';
import { formatSupplierTime } from '../utils/supplier';
import {
  btnPrimaryCls,
  btnSecondaryCls,
  fieldErrorCls,
  inputCls,
  labelCls,
  modalBackdropCls,
  modalBodyCls,
  modalCardCls,
  modalCloseIconBtnCls,
  modalFooterCls,
  modalHeaderCls,
  tableHeadRowCls,
  tdCls,
  thCls,
} from '../styles/classNames';

type ModalState = { mode: 'create' } | { mode: 'edit'; supplier: Supplier } | null;

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-[6px] text-[#b91c1c] text-[14.5px] bg-[#fef2f2] border border-[#fca5a5] py-[8px] px-[10px] rounded-[8px]">
    <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
    <span>{message}</span>
  </div>
);

// Modal thêm / sửa: chỉ có ô Tên. Mã do DB tự sinh nên khi thêm chỉ hiện "Tự động", khi sửa hiện chỉ đọc.
const SupplierFormModal: React.FC<{
  state: Exclude<ModalState, null>;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}> = ({ state, onClose, onSubmit }) => {
  const dialogRef = useModalA11y(onClose, true);
  const [name, setName] = useState(state.mode === 'edit' ? state.supplier.name : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = state.mode === 'edit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên nhà cung cấp không được để trống');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      // Lỗi từ BE (vd 409 trùng tên) hiện ngay trong modal để người dùng sửa tại chỗ.
      setError(err instanceof Error ? err.message : 'Không thể lưu nhà cung cấp');
      setBusy(false);
    }
  };

  return (
    <div className={modalBackdropCls}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        tabIndex={-1}
        className={clsx(modalCardCls, '!max-w-[480px]')}
      >
        <div className={modalHeaderCls}>
          <h2 className="m-0 text-[19px] font-extrabold text-[#0f172a]">
            {isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          </h2>
          <button type="button" onClick={onClose} className={modalCloseIconBtnCls} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={modalBodyCls}>
            <div>
              <span className={labelCls}>Mã</span>
              <div className="text-[16px] font-mono font-bold text-[#334155]">
                {isEdit ? state.supplier.code : 'Tự động (hệ thống cấp khi lưu)'}
              </div>
            </div>
            <div>
              <label htmlFor="supplier-name" className={labelCls}>
                Tên nhà cung cấp *
              </label>
              <input
                id="supplier-name"
                type="text"
                autoFocus
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Công ty Vàng Phú Quý"
                className={inputCls}
              />
            </div>
            {error && <div className={fieldErrorCls}>{error}</div>}
          </div>
          <div className={modalFooterCls}>
            <button type="button" onClick={onClose} className={btnSecondaryCls} disabled={busy}>
              Hủy
            </button>
            <button type="submit" className={clsx(btnPrimaryCls, busy && 'opacity-60 cursor-default')} disabled={busy}>
              {busy && <Loader2 size={13} className="animate-[spin_0.8s_linear_infinite]" />}
              {isEdit ? 'Lưu thay đổi' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tab "Nhà cung cấp" trong Cấu hình giá. Khác các tab còn lại: mỗi thao tác lưu NGAY qua API (không đi
// qua nút "Lưu cấu hình" của trang), nên PricingConfigPage ẩn footer lưu khi tab này đang mở.
export const SupplierManagementTab: React.FC = () => {
  const { suppliers, loading, error, reload } = useSuppliers(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async (name: string) => {
    if (modal?.mode === 'edit') await updateSupplier(modal.supplier.id, name);
    else await createSupplier(name);
    setModal(null);
    await reload();
  };

  const handleDelete = async (s: Supplier) => {
    if (
      !window.confirm(
        `Xóa nhà cung cấp "${s.name}" (${s.code})?\n\nĐây là xóa mềm: các yêu cầu cũ vẫn giữ nhà cung cấp này (hiện kèm "(đã xóa)"), nhưng không thể chọn cho yêu cầu mới.`,
      )
    )
      return;
    setActionError(null);
    setBusyId(s.id);
    try {
      await deleteSupplier(s.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp');
    } finally {
      setBusyId(null);
      await reload();
    }
  };

  // Người tạo/sửa: có tên thì in đậm, không có (vd NCC chưa sửa lần nào) thì hiện chữ thay thế.
  const personCell = (person: { name: string } | null | undefined, emptyText: string) =>
    person ? (
      <span className="font-bold text-[#334155]">{person.name}</span>
    ) : (
      <span className="text-faint">{emptyText}</span>
    );

  return (
    <div className="py-[22px] px-0 flex flex-col gap-[14px]">
      <div className="flex items-start justify-between gap-[12px] flex-wrap">
        <div>
          <h2 className="m-0 text-[18px] font-extrabold text-[#0f172a]">Nhà cung cấp</h2>
          <p className="m-0 mt-[2px] text-[14.5px] text-muted">
            Người báo giá bắt buộc chọn 1 nhà cung cấp cho mỗi yêu cầu. Mã do hệ thống tự cấp; xóa là xóa mềm.
          </p>
        </div>
        <button type="button" onClick={() => setModal({ mode: 'create' })} className={btnPrimaryCls}>
          <Plus size={14} /> Thêm nhà cung cấp
        </button>
      </div>

      {(error || actionError) && <ErrorBanner message={(actionError || error) as string} />}

      <div className="overflow-x-auto border border-[#e5e7eb] rounded-[12px]">
        <table className="w-full border-collapse text-[15.5px]">
          <thead>
            <tr className={tableHeadRowCls}>
              <th className={clsx(thCls, 'pl-[14px]')}>Mã</th>
              <th className={thCls}>Tên</th>
              <th className={thCls}>Tạo bởi</th>
              <th className={thCls}>Ngày tạo</th>
              <th className={thCls}>Sửa bởi</th>
              <th className={thCls}>Ngày sửa</th>
              <th className={clsx(thCls, 'text-right pr-[14px]')}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className={clsx(tdCls, 'text-center text-muted')}>
                  Đang tải...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className={clsx(tdCls, 'text-center text-muted')}>
                  Chưa có nhà cung cấp nào
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="border-b border-[#f1f5f9] last:border-b-0">
                  <td className={clsx(tdCls, 'pl-[14px] font-mono font-bold text-[#1e293b] whitespace-nowrap')}>{s.code}</td>
                  <td className={clsx(tdCls, 'font-bold text-[#0f172a]')}>{s.name}</td>
                  <td className={tdCls}>{personCell(s.createdBy, '---')}</td>
                  <td className={clsx(tdCls, 'whitespace-nowrap text-[#475569]')}>{formatSupplierTime(s.createdAt)}</td>
                  <td className={tdCls}>{personCell(s.updatedBy, '')}</td>
                  <td className={clsx(tdCls, 'whitespace-nowrap text-[#475569]')}>
                    {s.updatedBy ? formatSupplierTime(s.updatedAt) : ''}
                  </td>
                  <td className={clsx(tdCls, 'text-right pr-[14px] whitespace-nowrap')}>
                    <button
                      type="button"
                      onClick={() => setModal({ mode: 'edit', supplier: s })}
                      disabled={busyId === s.id}
                      title="Sửa tên"
                      aria-label={`Sửa ${s.name}`}
                      className="bg-transparent border-0 text-[#2563eb] cursor-pointer p-[6px]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      disabled={busyId === s.id}
                      title="Xóa (xóa mềm)"
                      aria-label={`Xóa ${s.name}`}
                      className="bg-transparent border-0 text-[#dc2626] cursor-pointer p-[6px]"
                    >
                      {busyId === s.id ? <Loader2 size={15} className="animate-[spin_0.8s_linear_infinite]" /> : <Trash2 size={15} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && <SupplierFormModal state={modal} onClose={() => setModal(null)} onSubmit={handleSubmit} />}
    </div>
  );
};
