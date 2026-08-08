import type { QuoteRequest, Role, User } from '../types';
import { Edit, DollarSign, XCircle, CheckCircle, FilePlus, Clock, RotateCcw } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';

interface InspectorProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
  onResubmit?: (id: string) => void;
  onSelectOption?: (reqId: string, optionId: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedReq,
  currentRole,
  currentUser,
  onEdit,
  onAccept,
  onPricing,
  onReject,
  onReturn,
  onResubmit,
  onSelectOption,
}) => {
  if (!selectedReq) {
    return (
      <aside className="inspector">
        <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '60px' }}>
          📌 Chọn một bản ghi trên bảng để xem chi tiết
        </div>
      </aside>
    );
  }

  const isMyReq =
    selectedReq.createdBy?.id === currentUser.id ||
    selectedReq.requester?.id === currentUser.id ||
    selectedReq.requester?.email === currentUser.email;

  const materialsList = selectedReq.materials && selectedReq.materials.length > 0
    ? selectedReq.materials.map((m) => m.name).join(', ')
    : selectedReq.material ? selectedReq.material.name : '---';

  const priceVal = selectedReq.quotedPrice ? Number(selectedReq.quotedPrice) : 0;

  const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' ₫' : 'Chưa có';

  const imageUrl = selectedReq.images && selectedReq.images.length > 0
    ? selectedReq.images[0].imageUrl
    : UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

  const renderStatusBadge = () => {
    switch (selectedReq.status) {
      case 'YC_MOI':
        return <span className="status-pill new"><FilePlus size={13} color="#1d4ed8" /> Yêu cầu mới</span>;
      case 'DANG_XLY':
        return <span className="status-pill process"><Clock size={13} color="#b45309" /> Đang xử lý</span>;
      case 'XONG':
        return <span className="status-pill done"><CheckCircle size={13} color="#15803d" /> Đã báo giá</span>;
      case 'TU_CHOI':
        return <span className="status-pill reject"><XCircle size={13} color="#be123c" /> Từ chối</span>;
      case 'NEED_MORE_INFO':
        return <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}><RotateCcw size={13} color="#ea580c" /> Cần bổ sung</span>;
      default:
        return <span className="status-pill new">{selectedReq.status}</span>;
    }
  };

  return (
    <aside className="inspector" style={{ overflowY: 'auto' }}>
      {/* Product Image - Compact & Click to Enlarge */}
      <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
        <img
          src={imageUrl}
          className="inspector-media"
          alt="Ảnh Sản Phẩm"
          onClick={() => window.open(imageUrl, '_blank')}
          title="Bấm để xem ảnh phóng to"
          style={{ borderRadius: '8px', width: '100%', height: '130px', objectFit: 'cover' }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            background: 'rgba(15, 23, 42, 0.65)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            pointerEvents: 'none',
            backdropFilter: 'blur(3px)',
          }}
        >
          📷 1 ảnh
        </span>
      </div>
      
      {/* Header Info */}
      <div className="inspector-title" style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
          ĐANG CHỌN
        </span>
        <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: "'Roboto Mono', monospace", color: '#334155', marginTop: '1px' }}>
          {selectedReq.code || selectedReq.id}
        </div>
        <h2 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: '3px 0 6px 0', lineHeight: 1.25 }}>
          {selectedReq.productName}
        </h2>
        <div>{renderStatusBadge()}</div>
      </div>

      {/* Clean Key-Value List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', marginBottom: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Khách:</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReq.customer?.name || selectedReq.requester?.name || '---'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Sale:</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>
            {selectedReq.requester?.name || '---'}
            {isMyReq && (
              <span style={{ marginLeft: '4px', fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                Tôi
              </span>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Phụ trách:</span>
          <span style={{ fontWeight: 700, color: '#2563eb' }}>{selectedReq.pricer?.name || 'Chưa phân công'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Hạn:</span>
          <span style={{ fontWeight: 700, color: '#d97706' }}>
            {selectedReq.desiredLeadTime || (selectedReq.desiredDate ? new Date(selectedReq.desiredDate).toLocaleDateString('vi-VN') : '---')}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Danh mục:</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>{selectedReq.category?.name || '---'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Chất liệu:</span>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>{materialsList}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#64748b' }}>Kích thước / Số đo:</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReq.customerMeasurements || '---'}</span>
        </div>

        <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />

        {(currentRole === 'PRICING' || currentRole === 'ADMIN') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>Thuế VAT:</span>
            <span style={{ fontWeight: 600, color: '#475569' }}>{selectedReq.vat ? `${selectedReq.vat}%` : '---'}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '8px 10px', borderRadius: '8px' }}>
          <span style={{ fontWeight: 800, color: '#0f766e' }}>Tổng báo khách (quotedPrice):</span>
          <span style={{ fontWeight: 900, color: '#0f766e', fontSize: '14px' }}>{formattedPrice}</span>
        </div>

        {/* MULTI-OPTIONS COMPARISON CARDS FOR SALE & PRICING */}
        {selectedReq.options && selectedReq.options.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>CÁC PHƯƠNG ÁN GIÁ SO SÁNH:</span>
            </div>

            {selectedReq.options.map((opt) => {
              const isSelectedOpt = opt.isSelected || (opt.id && opt.id === selectedReq.selectedOptionId);
              const optPrice = Number(opt.quotedPrice || 0);

              return (
                <div
                  key={opt.id || opt.optionName}
                  style={{
                    background: isSelectedOpt ? '#f0fdf4' : '#ffffff',
                    border: isSelectedOpt ? '2px solid #22c55e' : '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: isSelectedOpt ? '0 2px 8px rgba(34, 197, 94, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{opt.optionName}</span>
                    {isSelectedOpt ? (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, fontSize: '10.5px' }}>
                        ĐÃ CHỐT
                      </span>
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#16a34a' }}>
                        {optPrice.toLocaleString('vi-VN')} ₫
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {opt.materialName || 'Chất liệu'} {opt.weightChi ? `| ${opt.weightChi} chỉ` : ''} {opt.note ? `| ${opt.note}` : ''}
                  </div>

                  {isSelectedOpt && (
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                      Giá báo: {optPrice.toLocaleString('vi-VN')} ₫
                    </div>
                  )}

                  {/* SALE SELECT OPTION BUTTON */}
                  {currentRole === 'SALE' && !isSelectedOpt && onSelectOption && opt.id && (
                    <button
                      type="button"
                      onClick={() => onSelectOption(selectedReq.id, opt.id!)}
                      style={{
                        marginTop: '6px',
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#166534',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      Chốt {opt.optionName} ({optPrice.toLocaleString('vi-VN')} ₫)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons Box */}
      <div id="inspActionBox" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedReq.status === 'XONG' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '10px', borderRadius: '8px', textAlign: 'center', color: '#15803d', fontWeight: 700, fontSize: '12.5px' }}>
            <CheckCircle size={16} /> Báo giá hoàn tất ({formattedPrice})
          </div>
        )}

        {selectedReq.status === 'TU_CHOI' && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px', borderRadius: '8px', color: '#be123c', fontSize: '12px' }}>
            <b><XCircle size={14} /> Từ chối hẳn (Không làm được/Khách hủy):</b> {selectedReq.rejectReason || 'Không đủ điều kiện'}
          </div>
        )}

        {selectedReq.status === 'NEED_MORE_INFO' && (
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '12px', borderRadius: '10px', color: '#c2410c', fontSize: '12.5px' }}>
            <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Yêu cầu bị trả lại — Cần bổ sung thông tin:
            </div>
            <div style={{ fontSize: '12px', color: '#9a3412', fontStyle: 'italic', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fed7aa', marginTop: '4px' }}>
              "{selectedReq.returnReason || 'Thiếu số đo hoặc ảnh mờ'}"
            </div>
          </div>
        )}

        {/* SALE ACTIONS FOR NEED_MORE_INFO */}
        {currentRole === 'SALE' && selectedReq.status === 'NEED_MORE_INFO' && (
          <>
            <button className="btn-insp btn-insp-primary" style={{ background: '#d97706' }} onClick={() => onEdit(selectedReq)}>
              <Edit size={14} /> Bổ Sung Số Đo / Tải Ảnh Mới
            </button>
            {onResubmit && (
              <button className="btn-insp btn-insp-primary" style={{ background: '#16a34a' }} onClick={() => onResubmit(selectedReq.id)}>
                Gửi Lại Cho Pricing Tính Giá
              </button>
            )}
          </>
        )}

        {currentRole === 'SALE' && selectedReq.status === 'YC_MOI' && (
          <>
            {isMyReq ? (
              <>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', color: '#1e40af', fontSize: '12px' }}>
                  🔔 Yêu cầu chưa tiếp nhận — Bạn có thể chỉnh sửa.
                </div>
                <button className="btn-insp btn-insp-primary" style={{ background: '#2563eb' }} onClick={() => onEdit(selectedReq)}>
                  <Edit size={14} /> ✏️ Sửa Yêu Cầu
                </button>
              </>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '12px' }}>
                🔔 Yêu cầu của <b>{selectedReq.requester?.name || 'Sale khác'}</b> — Đang chờ tiếp nhận.
              </div>
            )}
          </>
        )}

        {currentRole === 'SALE' && selectedReq.status === 'DANG_XLY' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', color: '#1e40af', fontSize: '12px' }}>
            <strong>🟡 Đang xử lý bởi người báo giá</strong>
            <div style={{ marginTop: '4px' }}>
              <a href={`mailto:${selectedReq.pricer?.email || UI_CONSTANTS.DEFAULT_PRICER_EMAIL}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}>
                📧 {selectedReq.pricer?.email || UI_CONSTANTS.DEFAULT_PRICER_EMAIL}
              </a>
            </div>
          </div>
        )}

        {/* PRICING / ADMIN Role Buttons */}
        {(currentRole === 'PRICING' || currentRole === 'ADMIN') && selectedReq.status === 'YC_MOI' && (
          <>
            <button className="btn-insp btn-insp-primary" style={{ background: '#f59e0b' }} onClick={() => onAccept(selectedReq.id, selectedReq.version)}>
              ⚡ Tiếp Nhận Yêu Cầu
            </button>
            {onReturn && (
              <button className="btn-insp btn-insp-primary" style={{ background: '#ea580c' }} onClick={() => onReturn(selectedReq.id)}>
                ↩️ Trả Lại Sale (Cần Bổ Sung)
              </button>
            )}
            <button className="btn-insp btn-insp-danger" onClick={() => onReject(selectedReq.id)}>
              ❌ Từ Chối Hẳn
            </button>
          </>
        )}

        {(currentRole === 'PRICING' || currentRole === 'ADMIN') && selectedReq.status === 'DANG_XLY' && (
          <>
            <button className="btn-insp btn-insp-primary" onClick={() => onPricing(selectedReq.id)}>
              <DollarSign size={14} /> 💰 Báo Giá Sản Phẩm
            </button>
            {onReturn && (
              <button className="btn-insp btn-insp-primary" style={{ background: '#ea580c' }} onClick={() => onReturn(selectedReq.id)}>
                ↩️ Trả Lại Sale (Cần Bổ Sung)
              </button>
            )}
            <button className="btn-insp btn-insp-danger" onClick={() => onReject(selectedReq.id)}>
              <XCircle size={14} /> ❌ Từ Chối Hẳn
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

