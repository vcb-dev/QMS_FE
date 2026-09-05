import React, { useState } from 'react';
import { clsx } from 'clsx';
import { X, FileSpreadsheet, Calendar, ChevronDown } from 'lucide-react';
import type { Material, ProductCategory } from '../types';
import { exportQuoteRequestsExcelApi } from '../services/api';
import { STATUS_CHART_META } from '../constants';
import { EXPORT_FIELDS } from '../constants/exportFields';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  modalGrid2ColCls,
  formLabelCls,
  formControlCls,
  toolBtnCls,
  btnInspPrimaryCls,
  selectCls,
  selectArrowCls,
  panelCls,
  popoverLabelCls,
} from '../styles/classNames';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  materials: Material[];
  initialFilters: {
    status: string;
    categoryId: string;
    materialId: string;
    ownerId?: string;
    timeRange: string;
    startDate: string;
    endDate: string;
    search: string;
  };
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  categories,
  materials,
  initialFilters,
}) => {
  const [status, setStatus] = useState(initialFilters.status);
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId);
  const [materialId, setMaterialId] = useState(initialFilters.materialId);
  const [timeRange, setTimeRange] = useState(initialFilters.timeRange);
  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.map((f) => f.key)),
  );
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allChecked = selectedFields.size === EXPORT_FIELDS.length;
  const toggleAll = () => {
    setSelectedFields(allChecked ? new Set() : new Set(EXPORT_FIELDS.map((f) => f.key)));
  };

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      alert('Vui lòng chọn ít nhất 1 cột để export');
      return;
    }
    setExporting(true);
    try {
      await exportQuoteRequestsExcelApi({
        status: status !== 'ALL' ? (status as any) : undefined,
        search: initialFilters.search || undefined,
        categoryId: categoryId !== 'ALL' ? categoryId : undefined,
        materialId: materialId !== 'ALL' ? materialId : undefined,
        ownerId: initialFilters.ownerId,
        timeRange: timeRange !== 'ALL' ? timeRange : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        fields: Array.from(selectedFields),
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi export danh sách yêu cầu báo giá');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={modalBackdropCls}>
      <div className={clsx(modalCardCls, '!max-w-[760px] !rounded-[20px] overflow-hidden flex flex-col !max-h-[90vh]')}>
        <div className={clsx(modalHeaderCls, 'shrink-0')}>
          <h2>Xuất Excel Yêu Cầu Báo Giá</h2>
          <button onClick={onClose} className="bg-transparent border-0 text-muted cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className={clsx(modalBodyCls, 'flex-1 overflow-y-auto')}>
          <div className={modalGrid2ColCls}>
            {/* Cột trái — bộ lọc phạm vi dữ liệu export */}
            <div className={panelCls}>
              <label className={formLabelCls}>Bộ lọc dữ liệu export</label>

              <div>
                <span className={popoverLabelCls}>Trạng thái</span>
                <div className="relative">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                    <option value="ALL">Tất cả trạng thái</option>
                    {STATUS_CHART_META.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={selectArrowCls} />
                </div>
              </div>

              <div>
                <span className={popoverLabelCls}>Danh mục</span>
                <div className="relative">
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
                    <option value="ALL">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={selectArrowCls} />
                </div>
              </div>

              <div>
                <span className={popoverLabelCls}>Chất liệu</span>
                <div className="relative">
                  <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={selectCls}>
                    <option value="ALL">Tất cả chất liệu</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={selectArrowCls} />
                </div>
              </div>

              <div>
                <span className={popoverLabelCls}>Khoảng thời gian</span>
                <div className="relative">
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className={selectCls}>
                    <option value="ALL">Tất cả thời gian</option>
                    <option value="TODAY">Hôm nay</option>
                    <option value="THIS_WEEK">Tuần này</option>
                    <option value="THIS_MONTH">Tháng này</option>
                  </select>
                  <ChevronDown size={14} className={selectArrowCls} />
                </div>
              </div>

              <div>
                <span className={popoverLabelCls}>Khoảng ngày tùy chọn</span>
                <div className="flex items-center gap-[6px]">
                  <div className="relative flex-1 min-w-0">
                    <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={clsx(formControlCls, '!pl-[32px]')}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-faint">đến</span>
                  <div className="relative flex-1 min-w-0">
                    <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={clsx(formControlCls, '!pl-[32px]')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải — chọn cột export */}
            <div className={panelCls}>
              <div className="flex justify-between items-center">
                <label className={formLabelCls}>Chọn cột export</label>
                <button type="button" onClick={toggleAll} className="bg-transparent border-0 text-primary text-[11.5px] font-bold cursor-pointer">
                  {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-[12px] gap-y-[8px] max-h-[300px] overflow-y-auto p-[2px]">
                {EXPORT_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-[6px] text-[12.5px] text-[#334155] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.has(f.key)}
                      onChange={() => toggleField(f.key)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={clsx(modalFooterCls, 'shrink-0')}>
          <button type="button" className={toolBtnCls} onClick={onClose}>Hủy</button>
          <button
            type="button"
            className={clsx(btnInspPrimaryCls, '!w-auto !py-[9px] !px-[20px]')}
            onClick={handleExport}
            disabled={exporting}
          >
            <FileSpreadsheet size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};
