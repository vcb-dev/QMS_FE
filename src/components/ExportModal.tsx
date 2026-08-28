import React, { useState } from 'react';
import { X, FileSpreadsheet, Calendar, ChevronDown } from 'lucide-react';
import type { Material, ProductCategory } from '../types';
import { exportQuoteRequestsExcelApi } from '../services/api';
import { STATUS_CHART_META } from '../constants';
import { EXPORT_FIELDS } from '../constants/exportFields';

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '8px 30px 8px 12px',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  appearance: 'none',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '5px',
  display: 'block',
};

const panelStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

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
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '760px', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>Xuất Excel Yêu Cầu Báo Giá</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="modal-grid-2col">
            {/* Cột trái — bộ lọc phạm vi dữ liệu export */}
            <div style={panelStyle}>
              <label className="form-label">Bộ lọc dữ liệu export</label>

              <div>
                <span style={fieldLabelStyle}>Trạng thái</span>
                <div style={{ position: 'relative' }}>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
                    <option value="ALL">Tất cả trạng thái</option>
                    {STATUS_CHART_META.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <span style={fieldLabelStyle}>Danh mục</span>
                <div style={{ position: 'relative' }}>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={selectStyle}>
                    <option value="ALL">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <span style={fieldLabelStyle}>Chất liệu</span>
                <div style={{ position: 'relative' }}>
                  <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={selectStyle}>
                    <option value="ALL">Tất cả chất liệu</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <span style={fieldLabelStyle}>Khoảng thời gian</span>
                <div style={{ position: 'relative' }}>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={selectStyle}>
                    <option value="ALL">Tất cả thời gian</option>
                    <option value="TODAY">Hôm nay</option>
                    <option value="THIS_WEEK">Tuần này</option>
                    <option value="THIS_MONTH">Tháng này</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <span style={fieldLabelStyle}>Khoảng ngày tùy chọn</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>đến</span>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải — chọn cột export */}
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Chọn cột export</label>
                <button type="button" onClick={toggleAll} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                  {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', maxHeight: '300px', overflowY: 'auto', padding: '2px' }}>
                {EXPORT_FIELDS.map((f) => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}>
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

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
          <button
            type="button"
            className="btn-insp btn-insp-primary"
            onClick={handleExport}
            disabled={exporting}
            style={{ width: 'auto', padding: '9px 20px' }}
          >
            <FileSpreadsheet size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};
