import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, PlusCircle, Edit2, Trash2, Building2 } from 'lucide-react';
import { fetchDepartmentsPaginated, createDepartment, updateDepartment, deleteDepartment } from '../services/api';
import { Pagination } from './Pagination';
import { cardContainerCls, cardHeadingCls, staffThCls } from '../styles/classNames';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Edit/Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchDepartmentsPaginated(page, limit, search);
      setDepartments(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      alert(err.message || 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchDraft);
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setDeptName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (id: string, name: string) => {
    setEditId(id);
    setDeptName(name);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      if (editId) {
        await updateDepartment(editId, deptName.trim());
      } else {
        await createDepartment(deptName.trim());
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xử lý bộ phận');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa phòng ban này?')) return;
    try {
      await deleteDepartment(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa bộ phận');
    }
  };

  return (
    <div className={cardContainerCls}>
      <div className="flex items-center justify-between mb-[14px]">
        <h2 className={cardHeadingCls}>
          <Building2 size={16} color="#2563eb" /> Quản lý bộ phận
        </h2>
        <button
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
            placeholder="Tìm theo tên..."
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
              <th className={staffThCls}>Tên bộ phận</th>
              <th className={staffThCls}>Số yêu cầu báo giá</th>
              <th className={clsx(staffThCls, 'text-right')}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-4">Đang tải...</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-4 text-faint">Chưa có bộ phận nào</td></tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id} className="border-b border-[#f8fafc]">
                  <td className="p-[10px] font-bold text-[#0f172a]">{d.name}</td>
                  <td className="p-[10px] text-muted">{d._count?.quoteRequests || 0}</td>
                  <td className="p-[10px] text-right">
                    <button
                      onClick={() => handleOpenEdit(d.id, d.name)}
                      className="inline-flex items-center justify-center p-[6px] rounded-[6px] bg-[#f1f5f9] text-[#334155] border-0 cursor-pointer mr-2 hover:bg-[#e2e8f0]"
                      title="Sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
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

      {departments.length > 0 && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] backdrop-blur-sm p-[16px]">
          <div className="bg-surface w-full max-w-[400px] rounded-[16px] overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="py-[16px] px-[20px] bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold text-[#0f172a] m-0">
                {editId ? 'Sửa bộ phận' : 'Thêm bộ phận mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-transparent border-0 text-[#64748b] cursor-pointer hover:text-[#0f172a] font-bold text-[18px] leading-[1]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-[20px]">
              <div className="mb-[16px]">
                <label className="block text-[14px] font-bold text-[#475569] mb-[6px]">Tên bộ phận <span className="text-[#e11d48]">*</span></label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full py-[10px] px-[12px] border border-[#cbd5e1] rounded-[8px] text-[15.5px] outline-none focus:border-primary"
                  placeholder="Nhập tên bộ phận..."
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-[8px]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="py-[10px] px-[16px] rounded-[8px] bg-surface border border-[#cbd5e1] text-[#334155] font-bold cursor-pointer">Hủy</button>
                <button type="submit" className="py-[10px] px-[16px] rounded-[8px] bg-[#16a34a] border-0 text-surface font-bold cursor-pointer">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
