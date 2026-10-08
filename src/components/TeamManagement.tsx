import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Search, PlusCircle, Edit2, Trash2, Users, X, Check } from 'lucide-react';
import { fetchTeamsPaginated, createTeam, updateTeam, deleteTeam } from '../services/api';
import type { Team } from '../types';
import { TEAM_NONE_LABEL } from '../constants/team';
import { useModalA11y } from '../hooks/useModalA11y';
import { Pagination } from './Pagination';
import {
  cardContainerCls,
  cardHeadingCls,
  staffThCls,
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  modalCloseIconBtnCls,
  formGroupCls,
  formLabelCls,
  formReqCls,
  formControlCls,
  toolBtnCls,
  btnInspPrimaryCls,
} from '../styles/classNames';

interface TeamManagementProps {
  // Gọi sau mỗi lần tạo/sửa/xóa thành công — để trang cha nạp lại danh sách team dùng cho ô chọn/bộ lọc.
  onChange?: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ onChange }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit/Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const closeModal = () => setIsModalOpen(false);
  // Esc để đóng, khoá cuộn nền, trả tiêu điểm khi đóng — dùng chung với mọi popup khác
  const dialogRef = useModalA11y(closeModal, isModalOpen);
  // Hook trên đưa tiêu điểm vào nút đóng; chuyển vào ô nhập tên để gõ được ngay (effect này khai báo
  // SAU hook nên chạy sau và thắng)
  useEffect(() => {
    if (isModalOpen) nameInputRef.current?.focus();
  }, [isModalOpen]);

  // Bỏ qua response trả về trễ khi đổi trang/tìm kiếm liên tục
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await fetchTeamsPaginated(page, limit, search);
      if (myRequestId !== requestIdRef.current) return;
      setTeams(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      if (myRequestId === requestIdRef.current) alert(err.message || 'Không thể tải danh sách team');
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setTeamName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditId(team.id);
    setTeamName(team.name);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (editId) {
        await updateTeam(editId, name);
      } else {
        await createTeam(name);
      }
      closeModal();
      await loadData();
      onChange?.();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu team');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    const memberCount = team._count?.users ?? 0;
    const memberNote = memberCount > 0
      ? ` ${memberCount} thành viên của team sẽ chuyển thành "${TEAM_NONE_LABEL}".`
      : '';
    if (!window.confirm(`Bạn có chắc muốn xóa team "${team.name}"?${memberNote}`)) return;
    try {
      await deleteTeam(team.id);
      // Xóa phần tử cuối của trang không phải trang 1 -> lùi một trang, effect tự nạp lại
      if (teams.length === 1 && page > 1) setPage(page - 1);
      else await loadData();
      onChange?.();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa team');
    }
  };

  return (
    <div className={cardContainerCls}>
      <div className="flex items-center justify-between mb-[14px]">
        <h2 className={cardHeadingCls}>
          <Users size={16} color="#2563eb" /> Quản lý team
        </h2>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-[6px] py-[6px] px-[12px] rounded-[6px] bg-[#16a34a] text-surface text-[14.5px] font-bold border-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <PlusCircle size={14} /> Thêm mới
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-[8px] mb-[14px]">
        <div className="relative flex-1 max-w-[300px]">
          <Search size={16} className="absolute left-[10px] top-[10px] text-faint" />
          <input
            type="text"
            placeholder="Tìm theo tên team..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="w-full py-[8px] pr-[12px] pl-[34px] rounded-[8px] border border-[#cbd5e1] text-[15.5px] bg-[#f8fafc] text-[#0f172a]"
          />
        </div>
        <button type="submit" className="py-[8px] px-[14px] rounded-[8px] bg-surface border border-[#cbd5e1] text-[#334155] font-bold cursor-pointer text-[15px] hover:bg-[#f1f5f9]">Tìm kiếm</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15.5px]">
          <thead>
            <tr className="border-b border-[#f1f5f9] text-left">
              <th className={staffThCls}>Tên team</th>
              <th className={staffThCls}>Số thành viên</th>
              <th className={clsx(staffThCls, 'text-right')}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-4">Đang tải...</td></tr>
            ) : teams.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-4 text-faint">{search ? 'Không tìm thấy team nào khớp' : 'Chưa có team nào'}</td></tr>
            ) : (
              teams.map((t) => (
                <tr key={t.id} className="border-b border-[#f8fafc]">
                  <td className="p-[10px] font-bold text-[#0f172a]">{t.name}</td>
                  <td className="p-[10px] text-muted">{t._count?.users ?? 0}</td>
                  <td className="p-[10px] text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="inline-flex items-center justify-center p-[6px] rounded-[6px] bg-[#f1f5f9] text-[#334155] border-0 cursor-pointer mr-2 hover:bg-[#e2e8f0]"
                      title="Sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="inline-flex items-center justify-center p-[6px] rounded-[6px] bg-[#fff1f2] text-[#be123c] border-0 cursor-pointer hover:bg-[#fecdd3]"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {teams.length > 0 && (
        <div className="mt-[14px]">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
          />
        </div>
      )}

      {isModalOpen && (
        <div className={modalBackdropCls}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={editId ? 'Sửa team' : 'Thêm team mới'}
            tabIndex={-1}
            className={clsx(modalCardCls, '!max-w-[480px]')}
          >
            <div className={modalHeaderCls}>
              <h2>{editId ? 'Sửa Team' : 'Thêm Team Mới'}</h2>
              <button type="button" onClick={closeModal} className={modalCloseIconBtnCls} title="Đóng">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={modalBodyCls}>
                <div className={formGroupCls}>
                  <label htmlFor="team-name-input" className={formLabelCls}>
                    Tên team <span className={formReqCls}>*</span>
                  </label>
                  <input
                    id="team-name-input"
                    ref={nameInputRef}
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={100}
                    placeholder="Nhập tên team..."
                    className={formControlCls}
                    required
                  />
                </div>
              </div>

              <div className={modalFooterCls}>
                <button type="button" className={toolBtnCls} onClick={closeModal}>Hủy</button>
                <button
                  type="submit"
                  className={clsx(btnInspPrimaryCls, '!w-auto')}
                  disabled={saving || !teamName.trim()}
                >
                  <Check size={16} /> Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
