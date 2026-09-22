import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Trash2, X, Upload, Loader2, Pencil } from 'lucide-react';
import clsx from 'clsx';
import type { StoneItem } from '../types';
import { createStone, updateStone, fetchStoneStats, fetchStonesPaginated } from '../services/api';
import { STONE_PAGE_SIZE } from '../constants/index';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  modalCloseIconBtnCls,
  pageBtnCls
} from '../styles/classNames';

const inputCls = "w-full h-[36px] px-[12px] text-[14.5px] border border-[#cbd5e1] rounded-[8px] outline-none transition-colors focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#3b82f6]/10 text-[#0f172a] font-medium";
const btnPrimaryCls = "h-[36px] px-[16px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-[14.5px] rounded-[8px] transition-colors shadow-sm active:translate-y-[1px] flex items-center justify-center whitespace-nowrap outline-none disabled:opacity-50 disabled:cursor-not-allowed";
const btnOutlineCls = "h-[36px] px-[16px] bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] font-bold text-[14.5px] rounded-[8px] transition-colors shadow-sm active:translate-y-[1px] flex items-center justify-center whitespace-nowrap outline-none disabled:opacity-50 disabled:cursor-not-allowed";
const thCls = "p-[14px] text-left text-[13px] font-extrabold text-[#64748b] uppercase tracking-[0.6px] border-b border-[#e2e8f0]";
const tdCls = "p-[14px] text-[14.5px] text-[#0f172a] border-b border-[#f1f5f9]";

export interface StonePricingTabProps {
  pendingStoneUpdates: Record<string, { size?: string, price?: number }>;
  setPendingStoneUpdates: React.Dispatch<React.SetStateAction<Record<string, { size?: string, price?: number }>>>;
  pendingDeleteStoneIds: string[];
  setPendingDeleteStoneIds: React.Dispatch<React.SetStateAction<string[]>>;
  onImportPriceGrid: (file: File, type: 'MAIN' | 'SIDE') => void;
  importingPriceGrid: { MAIN: boolean; SIDE: boolean };
  stoneError: string | null;
  setStoneError: React.Dispatch<React.SetStateAction<string | null>>;
  importResult?: string | null;
}

export const StonePricingTab: React.FC<StonePricingTabProps> = ({
  pendingStoneUpdates, setPendingStoneUpdates, pendingDeleteStoneIds, setPendingDeleteStoneIds, onImportPriceGrid, importingPriceGrid, stoneError, setStoneError, importResult
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'MAIN' | 'SIDE' | null>('MAIN');
  const [selectedCut, setSelectedCut] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(STONE_PAGE_SIZE);

  const [types, setTypes] = useState<{ name: string; count: number; type: 'MAIN' | 'SIDE' }[]>([]);
  const [stones, setStones] = useState<StoneItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const stats = await fetchStoneStats();
      setTypes(stats);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadStones = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchStonesPaginated({
        page,
        limit,
        stoneType: selectedType || undefined,
        name: selectedName || undefined,
        cut: selectedCut || undefined,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setStones(res.data || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedType, selectedName, selectedCut, search, statusFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStones();
  }, [loadStones]); // Do not put pendingStoneUpdates here to avoid refetch on typing

  useEffect(() => {
    setPage(1);
  }, [search, selectedName, selectedType, selectedCut, statusFilter]);

  const mainTypes = types.filter(t => t.type === 'MAIN' && t.name.toLowerCase().includes(search.toLowerCase()));
  const sideTypes = types.filter(t => t.type === 'SIDE' && t.name.toLowerCase().includes(search.toLowerCase()));

  const cuts = useMemo(() => {
    return Array.from(new Set(stones.map(s => s.cut || 'Tròn')));
  }, [stones]);

  if (!selectedCut && cuts.length > 0) setSelectedCut(cuts[0]);

  const paginatedStones = useMemo(() => {
    return stones.map(s => {
      const update = pendingStoneUpdates[s.id];
      if (update) {
        return { ...s, ...update };
      }
      return s;
    }).filter(s => !pendingDeleteStoneIds.includes(s.id));
  }, [stones, pendingStoneUpdates, pendingDeleteStoneIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleAll = () => {
    if (selectedIds.length === paginatedStones.length && paginatedStones.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedStones.map(s => s.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const [stoneModalOpen, setStoneModalOpen] = useState(false);
  const [editingStoneId, setEditingStoneId] = useState<string | null>(null);
  const [newStone, setNewStone] = useState({ name: '', cut: '', size: '', price: '' });

  const handleSaveStone = async () => {
    setStoneError(null);
    const price = parseFloat(newStone.price.replace(/\D/g, '')) || 0;
    if (!newStone.name.trim() || !newStone.size.trim() || price <= 0) {
      setStoneError('Vui lòng nhập tên, size và giá hợp lệ');
      return;
    }
    
    if (!selectedType) {
      setStoneError('Vui lòng chọn Đá Chủ hoặc Đá Tấm trước khi lưu');
      return;
    }

    try {
      if (editingStoneId) {
        await updateStone(editingStoneId, {
          name: newStone.name.trim(),
          cut: newStone.cut || selectedCut || 'Tròn',
          size: newStone.size.trim(),
          price
        });
      } else {
        await createStone({
          stoneType: selectedType,
          name: newStone.name.trim(),
          cut: newStone.cut || selectedCut || 'Tròn',
          size: newStone.size.trim(),
          price
        });
      }
      setStoneModalOpen(false);
      setEditingStoneId(null);
      setNewStone({ name: '', cut: '', size: '', price: '' });
      loadStats();
      loadStones();
    } catch (err: any) {
      setStoneError(err.message || 'Lỗi khi lưu đá');
    }
  };

  return (
    <div className="flex bg-white rounded-[16px] border border-[#e5e7eb] min-h-[600px] shadow-sm">
      {/* Sidebar */}
      <div className="w-[280px] border-r border-[#e5e7eb] p-[16px] flex flex-col gap-[16px]">
        <div className="relative">
          <Search size={16} className="absolute left-[12px] top-[10px] text-[#94a3b8]" />
          <input 
            type="text" 
            placeholder="Tìm loại đá..." 
            className={clsx(inputCls, "pl-[36px]")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex bg-[#f1f5f9] p-[4px] rounded-[8px]">
          <button 
            className={clsx("flex-1 text-[13px] font-bold py-[6px] rounded-[6px] transition-colors", selectedType === 'MAIN' ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]")}
            onClick={() => { setSelectedType('MAIN'); setSelectedName(null); setSelectedCut(null); setSelectedIds([]); }}
          >
            ĐÁ CHỦ
          </button>
          <button 
            className={clsx("flex-1 text-[13px] font-bold py-[6px] rounded-[6px] transition-colors", selectedType === 'SIDE' ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]")}
            onClick={() => { setSelectedType('SIDE'); setSelectedName(null); setSelectedCut(null); setSelectedIds([]); }}
          >
            ĐÁ TẤM
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-[4px]">
          <div className="flex flex-col gap-[4px]">
            <button 
              onClick={() => { setSelectedName(null); setSelectedCut(null); setSelectedIds([]); }}
              className={clsx(
                "flex justify-between items-center px-[12px] py-[8px] rounded-[8px] text-[14.5px] transition-colors text-left",
                selectedName === null ? "bg-[#eff6ff] text-[#1e40af] font-bold" : "text-[#334155] hover:bg-[#f8fafc] font-medium"
              )}
            >
              <span>Tất cả {selectedType === 'MAIN' ? 'Đá Chủ' : 'Đá Tấm'}</span>
            </button>
            {(selectedType === 'MAIN' ? mainTypes : sideTypes).map(t => (
              <button 
                key={t.name}
                onClick={() => { setSelectedName(t.name); setSelectedCut(null); setSelectedIds([]); }}
                className={clsx(
                  "flex justify-between items-center px-[12px] py-[8px] rounded-[8px] text-[14.5px] transition-colors text-left",
                  selectedName === t.name ? "bg-[#eff6ff] text-[#1e40af] font-bold" : "text-[#334155] hover:bg-[#f8fafc] font-medium"
                )}
              >
                <span>{t.name}</span>
                <span className={clsx("text-[12px] px-[8px] py-[2px] rounded-full", selectedName === t.name ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#f1f5f9] text-[#64748b]")}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-[24px] flex flex-col min-w-0">
        <div className="flex gap-[12px] mb-[24px]">
          <select className={clsx(inputCls, "w-[180px]")} value={selectedName || 'ALL'} onChange={e => { setSelectedName(e.target.value === 'ALL' ? null : e.target.value); setSelectedCut(null); }}>
            <option value="ALL">Tất cả {selectedType === 'MAIN' ? 'Đá Chủ' : 'Đá Tấm'}</option>
            {types.filter(t => t.type === selectedType).map(t => <option key={t.name + t.type} value={t.name}>{t.name}</option>)}
          </select>
          <select className={clsx(inputCls, "w-[160px]")} value={selectedCut || ''} onChange={e => setSelectedCut(e.target.value)}>
            <option value="">Tất cả giác cắt</option>
            {cuts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={clsx(inputCls, "w-[160px]")} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">Trạng thái</option>
            <option value="UNLOCKED">Đang bán</option>
            <option value="LOCKED">Khóa</option>
          </select>
        </div>

        <div className="mb-[24px]">
          <h1 className="text-[24px] font-black text-[#0f172a] mb-[4px]">{selectedName ? selectedName : `Tất cả ${selectedType === 'MAIN' ? 'Đá Chủ' : 'Đá Tấm'}`}</h1>
          <p className="text-[14.5px] text-[#64748b]">{totalItems} bảng giá {importResult ? ` - ${importResult}` : ''}</p>
        </div>

        <div className="flex gap-[16px] mb-[16px] border-b border-[#e2e8f0]">
          {cuts.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCut(c)}
              className={clsx(
                "pb-[12px] px-[4px] font-bold text-[14.5px] transition-colors border-b-[3px] flex items-center gap-[6px]",
                selectedCut === c ? "border-[#3b82f6] text-[#3b82f6]" : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-[16px]">
          <label className="flex items-center gap-[8px] cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]" checked={selectedIds.length === paginatedStones.length && paginatedStones.length > 0} onChange={toggleAll} />
            <span className="text-[14.5px] font-medium text-[#334155]">Chọn tất cả</span>
          </label>
          <div className="flex gap-[12px]">
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0 && selectedType) {
                  onImportPriceGrid(e.target.files[0], selectedType);
                }
                e.target.value = '';
              }}
            />
            <button 
              className={clsx(btnOutlineCls, "gap-[6px]")} 
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedType ? importingPriceGrid[selectedType] : false}
            >
              {selectedType && importingPriceGrid[selectedType] ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
              Nhập Excel
            </button>
            <button className={clsx(btnPrimaryCls, "gap-[6px]")} onClick={() => {
              setEditingStoneId(null);
              setNewStone({ name: selectedName || '', cut: selectedCut || '', size: '', price: '' });
              setStoneModalOpen(true);
            }}>
              <Plus size={16} /> Thêm đá
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden flex-1 flex flex-col relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-[#3b82f6]" size={24} />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className={clsx(thCls, "w-[40px]")}></th>
                <th className={thCls}>SIZE (MM)</th>
                <th className={thCls}>GIÁ (VNĐ)</th>
                <th className={thCls}>Đơn vị</th>
                <th className={thCls}>Cập nhật</th>
                <th className={clsx(thCls, "w-[80px] text-center")}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStones.map(s => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <tr key={s.id} className={clsx("hover:bg-[#f8fafc] transition-colors", isSelected && "bg-[#eff6ff]")}>
                    <td className={tdCls}>
                      <input type="checkbox" className="w-4 h-4 rounded border-[#cbd5e1] text-[#3b82f6] focus:ring-[#3b82f6]" checked={isSelected} onChange={() => toggleOne(s.id)} />
                    </td>
                    <td className={tdCls}>
                      <input 
                        type="text" 
                        value={s.size} 
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setPendingStoneUpdates(prev => {
                            const next = { ...prev };
                            if (isSelected) {
                              selectedIds.forEach(id => {
                                next[id] = { ...(next[id] || {}), size: newVal };
                              });
                            } else {
                              next[s.id] = { ...(next[s.id] || {}), size: newVal };
                            }
                            return next;
                          });
                        }}
                        className="w-[80px] px-[8px] py-[4px] border border-transparent hover:border-[#cbd5e1] focus:border-[#3b82f6] outline-none rounded text-[14.5px]"
                      />
                    </td>
                    <td className={tdCls}>
                      <input 
                        type="text" 
                        value={new Intl.NumberFormat('vi-VN').format(s.price)} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value.replace(/\D/g, '')) || 0;
                          setPendingStoneUpdates(prev => {
                            const next = { ...prev };
                            if (isSelected) {
                              selectedIds.forEach(id => {
                                next[id] = { ...(next[id] || {}), price: val };
                              });
                            } else {
                              next[s.id] = { ...(next[s.id] || {}), price: val };
                            }
                            return next;
                          });
                        }}
                        className="w-[120px] px-[8px] py-[4px] border border-transparent hover:border-[#cbd5e1] focus:border-[#3b82f6] outline-none rounded text-[14.5px]"
                      />
                    </td>
                    <td className={tdCls}>viên</td>
                    <td className={tdCls}>{s.updatedAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(s.updatedAt)) : '-'}</td>
                    <td className={clsx(tdCls, "text-center")}>
                      <div className="flex items-center justify-center gap-[6px]">
                        <button onClick={() => {
                          setEditingStoneId(s.id);
                          setNewStone({ name: s.name, cut: s.cut || '', size: s.size, price: String(s.price) });
                          setStoneModalOpen(true);
                        }} className="p-[6px] text-[#94a3b8] hover:text-[#3b82f6] transition-colors rounded hover:bg-[#eff6ff]">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setPendingDeleteStoneIds(prev => [...prev, s.id])} className="p-[6px] text-[#94a3b8] hover:text-[#ef4444] transition-colors rounded hover:bg-[#fee2e2]">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedStones.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-[32px] text-center text-[#64748b]">Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-[16px] text-[14.5px]">
            <span className="text-[#64748b]">
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)} trong {totalItems} dòng
            </span>
            <div className="flex gap-[6px]">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className={pageBtnCls(page === 1)}
              >
                Trước
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className={pageBtnCls(page === totalPages)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {stoneModalOpen && createPortal(
        <div className={modalBackdropCls}>
          <div className={clsx(modalCardCls, "!max-w-[480px]")}>
            <div className={modalHeaderCls}>
              <h2 className="text-[18px] font-bold text-[#0f172a] m-0">{editingStoneId ? 'Chỉnh sửa đá' : 'Thêm đá mới'}</h2>
              <button onClick={() => setStoneModalOpen(false)} className={modalCloseIconBtnCls}><X size={20} /></button>
            </div>
            <div className={modalBodyCls}>
              {stoneError && <div className="p-[10px] bg-[#fee2e2] text-[#b91c1c] rounded-[8px] text-[14px]">{stoneError}</div>}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <label className="block text-[13px] font-bold text-[#334155] mb-[6px]">Tên loại đá {editingStoneId ? '' : <span className="text-red-500">*</span>}</label>
                  <input type="text" className={inputCls} value={newStone.name} disabled={!!editingStoneId} onChange={e => setNewStone(s => ({...s, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#334155] mb-[6px]">Shape (Giác cắt)</label>
                  <input type="text" className={inputCls} value={newStone.cut} onChange={e => setNewStone(s => ({...s, cut: e.target.value}))} placeholder={selectedCut || 'Tròn'} />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#334155] mb-[6px]">Size (mm) <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={newStone.size} onChange={e => setNewStone(s => ({...s, size: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#334155] mb-[6px]">Giá (VNĐ) <span className="text-red-500">*</span></label>
                  <input type="text" className={inputCls} value={newStone.price} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewStone(s => ({...s, price: new Intl.NumberFormat('vi-VN').format(Number(val))}));
                  }} />
                </div>
              </div>
            </div>
            <div className={modalFooterCls}>
              <button className={btnOutlineCls} onClick={() => setStoneModalOpen(false)}>Hủy</button>
              <button className={btnPrimaryCls} onClick={handleSaveStone}>Lưu</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
