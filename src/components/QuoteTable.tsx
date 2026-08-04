import React from 'react';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Zap, DollarSign, Lock, CheckCircle, XCircle, Sparkles, Clock } from 'lucide-react';

interface QuoteTableProps {
  requests: QuoteRequest[];
  selectedId: string | null;
  currentRole: Role;
  currentUser: User;
  onSelect: (id: string) => void;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
}

export const QuoteTable: React.FC<QuoteTableProps> = ({
  requests,
  selectedId,
  currentRole,
  currentUser,
  onSelect,
  onEdit,
  onAccept,
  onPricing,
  onReject,
}) => {
  // Calculate elapsed days without icons
  const renderQuotedDateCell = (r: QuoteRequest) => {
    if (!r.createdAt) return <span style={{ color: '#94a3b8' }}>---</span>;

    const createdTime = new Date(r.createdAt).getTime();

    // Completed / Quoted
    if (r.quotedDate) {
      const quotedTime = new Date(r.quotedDate).getTime();
      const diffMs = quotedTime - createdTime;
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      if (diffDays === 0) {
        return (
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11.5px' }} title={`Báo giá ngày ${new Date(r.quotedDate).toLocaleDateString('vi-VN')}`}>
            Trong ngày ({diffHours}h)
          </span>
        );
      }
      return (
        <span style={{ color: '#0f766e', fontWeight: 700, fontSize: '11.5px' }} title={`Báo giá ngày ${new Date(r.quotedDate).toLocaleDateString('vi-VN')}`}>
          {diffDays} ngày sau
        </span>
      );
    }

    // Rejected - calculate days until rejection (updatedAt) or now
    if (r.status === 'TU_CHOI') {
      const rejectTime = r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now();
      const diffMs = rejectTime - createdTime;
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      if (diffDays === 0) {
        return (
          <span style={{ color: '#be123c', fontWeight: 700, fontSize: '11.5px' }}>
            Từ chối trong ngày ({diffHours}h)
          </span>
        );
      }
      return (
        <span style={{ color: '#be123c', fontWeight: 700, fontSize: '11.5px' }}>
          Từ chối sau {diffDays} ngày
        </span>
      );
    }

    // Still pending (YC_MOI or DANG_XLY)
    const nowMs = Date.now();
    const elapsedDays = Math.max(0, Math.floor((nowMs - createdTime) / (1000 * 60 * 60 * 24)));
    const elapsedHours = Math.max(0, Math.floor((nowMs - createdTime) / (1000 * 60 * 60)));

    if (elapsedDays === 0) {
      return <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '11.5px' }}>Đã chờ {elapsedHours}h</span>;
    }

    return (
      <span style={{ color: '#d97706', fontWeight: 700, fontSize: '11.5px' }}>
        Đã chờ {elapsedDays} ngày
      </span>
    );
  };

  const renderStatusCell = (r: QuoteRequest) => {
    if (currentRole === 'SALE') {
      switch (r.status) {
        case 'YC_MOI':
          return (
            <span className="status-pill new">
              <Sparkles size={13} color="#1d4ed8" /> YC Mới
            </span>
          );
        case 'DANG_XLY':
          return (
            <span className="status-pill process">
              <Clock size={13} color="#b45309" /> Đang xử lý
            </span>
          );
        case 'XONG':
          return (
            <span className="status-pill done">
              <CheckCircle size={13} color="#15803d" /> Đã báo giá
            </span>
          );
        case 'TU_CHOI':
          return (
            <span className="status-pill reject">
              <XCircle size={13} color="#be123c" /> Từ chối
            </span>
          );
        default:
          return <span className="status-pill new">{r.status}</span>;
      }
    }

    // PRICING / ADMIN Role: Clean Interactive Dropdown
    if (r.status === 'YC_MOI') {
      return (
        <select
          className="status-select new"
          value="YC_MOI"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value === 'DANG_XLY') {
              onAccept(r.id, r.version);
            }
          }}
        >
          <option value="YC_MOI">✨ Yêu cầu mới</option>
          <option value="DANG_XLY">⚡ Tiếp nhận (Đang xử lý)</option>
        </select>
      );
    }

    if (r.status === 'DANG_XLY') {
      return (
        <select
          className="status-select process"
          value="DANG_XLY"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value === 'XONG') {
              onPricing(r.id);
            } else if (e.target.value === 'TU_CHOI') {
              onReject(r.id);
            }
          }}
        >
          <option value="DANG_XLY">⏳ Đang xử lý</option>
          <option value="XONG">✅ Chốt giá (Đã báo giá)</option>
          <option value="TU_CHOI">❌ Từ chối</option>
        </select>
      );
    }

    if (r.status === 'XONG') {
      return (
        <span className="status-pill done" title="Trạng thái hoàn tất">
          <CheckCircle size={13} color="#15803d" /> Đã báo giá
        </span>
      );
    }

    if (r.status === 'TU_CHOI') {
      return (
        <span className="status-pill reject" title="Trạng thái từ chối">
          <XCircle size={13} color="#be123c" /> Từ chối
        </span>
      );
    }

    return <span className="status-pill new">{r.status}</span>;
  };

  return (
    <div className="table-scroll-wrapper">
      <table className="quote-table">
        <thead>
          <tr>
            <th>Mã Hỏi Giá</th>
            <th>Thời Gian Tạo</th>
            <th>Trạng Thái</th>
            <th>Khách Hàng / Hỏi Giá</th>
            <th>Bộ Phận</th>
            <th>Ảnh SP</th>
            <th>Yêu Cầu / Muốn Nhận</th>
            <th>Tên Sản Phẩm + Yêu Cầu</th>
            <th>Chất Liệu</th>
            <th>Danh Mục</th>
            <th>Số Đo Kích Thước</th>
            <th>Tỷ Lệ Chốt</th>
            <th style={{ background: '#e0e7ff', color: '#3730a3' }}>VAT (%)</th>
            <th style={{ background: '#f0fdf4', color: '#166534' }}>Giá SP (Chưa VAT)</th>
            <th style={{ background: '#ccfbf1', color: '#0f766e' }}>Tổng Báo Khách (Có VAT)</th>
            <th style={{ background: '#fef3c7', color: '#92400e' }}>Thời Gian Báo Giá</th>
            <th>Người Báo Giá</th>
            <th>Tài Khoản Tạo</th>
            <th style={{ textAlign: 'center' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isSelected = r.id === selectedId || r.code === selectedId;
            const isRejected = r.status === 'TU_CHOI';
            const isMyReq =
              currentRole === 'PRICING'
                ? r.pricer?.id === currentUser.id || r.pricer?.email === currentUser.email
                : r.createdBy?.id === currentUser.id ||
                  r.requester?.id === currentUser.id ||
                  r.requester?.email === currentUser.email;

            const materialsList = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name)
              : r.material ? [r.material.name] : ['---'];

            const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
            const vatVal = r.vat ? Number(r.vat) : 0;
            const priceBeforeVat = priceVal > 0 ? (vatVal > 0 ? priceVal / (1 + vatVal / 100) : priceVal) : 0;

            const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' ₫' : 'Chưa có';
            const formattedBeforeVat = priceBeforeVat > 0 ? Math.round(priceBeforeVat).toLocaleString('vi-VN') + ' ₫' : 'Chưa có';

            const displayCustomerName = r.customer?.name || r.requester?.name || '---';
            const displayDeptName = r.requester?.department?.name || '---';
            const displayNote = r.requestNote || '---';

            return (
              <tr
                key={r.id}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelect(r.id)}
              >
                <td><strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1e293b' }}>{r.code || r.id}</strong></td>
                <td style={{ color: '#64748b', fontSize: '11px' }}>
                  {r.createdAt ? new Date(r.createdAt).toISOString().replace('T', ' ').substring(0, 16) : '---'}
                </td>
                <td>{renderStatusCell(r)}</td>
                <td>
                  <strong style={{ color: '#0f172a' }}>{displayCustomerName}</strong>
                  {isMyReq && (
                    <span style={{ marginLeft: '5px', fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                      Tôi
                    </span>
                  )}
                </td>
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {displayDeptName}
                  </span>
                </td>
                <td>
                  <img
                    src={r.images && r.images.length > 0 ? r.images[0].imageUrl : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36'}
                    className="thumb-img"
                    alt="SP"
                  />
                </td>
                <td style={{ fontSize: '11px', color: '#d97706', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                  {displayNote}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.productName}
                  </div>
                </td>
                <td>
                  {materialsList.map((m, idx) => (
                    <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, marginRight: '4px', display: 'inline-block', marginBottom: '2px' }}>
                      {m}
                    </span>
                  ))}
                </td>
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {r.category?.name || '---'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{r.customerMeasurements || '---'}</td>
                <td style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  {r.closeRatePct !== undefined && r.closeRatePct !== null ? `${r.closeRatePct}%` : '---'}
                </td>
                <td style={{ background: '#f5f3ff', color: '#4338ca', fontWeight: 700, borderRadius: '6px', textAlign: 'center' }}>
                  {r.vat ? `${r.vat}%` : '---'}
                </td>
                {isRejected ? (
                  <td style={{ background: '#fff1f2', fontWeight: 800, color: '#be123c', borderRadius: '6px' }}>
                    Bị từ chối
                  </td>
                ) : (
                  <td style={{ background: '#f0fdf4', fontWeight: 800, color: '#15803d', borderRadius: '6px' }}>
                    {formattedBeforeVat}
                  </td>
                )}

                {isRejected ? (
                  <td
                    style={{ background: '#fff1f2', fontWeight: 800, color: '#be123c', borderRadius: '6px' }}
                    title={r.rejectReason ? `Lý do từ chối: ${r.rejectReason}` : 'Bị từ chối'}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>Bị từ chối</span>
                      {r.rejectReason && (
                        <span style={{ fontSize: '10px', background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3', padding: '1px 5px', borderRadius: '4px', cursor: 'help' }}>
                          ⓘ Lý do
                        </span>
                      )}
                    </div>
                  </td>
                ) : (
                  <td style={{ background: '#ccfbf1', fontWeight: 800, color: '#0f766e', borderRadius: '6px' }}>
                    {formattedPrice}
                  </td>
                )}

                {/* Thời Gian Báo Giá (Tính số ngày kể từ ngày tạo - Không dùng icon) */}
                <td style={{ background: '#fffbeb', borderRadius: '6px' }}>
                  {renderQuotedDateCell(r)}
                </td>

                <td><strong style={{ color: '#334155' }}>{r.pricer?.name || 'Chưa phân công'}</strong></td>
                <td style={{ fontSize: '11px', color: '#475569' }}><strong>{r.createdBy?.name || r.requester?.name || '---'}</strong></td>
                <td style={{ textAlign: 'center' }}>
                  {/* SALE Role Permissions */}
                  {currentRole === 'SALE' && (
                    <>
                      {r.status === 'YC_MOI' && isMyReq ? (
                        <button
                          className="tool-btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            color: 'white',
                            boxShadow: '0 3px 8px rgba(79, 70, 229, 0.35)',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(r);
                          }}
                        >
                          <Edit size={12} /> Sửa YC
                        </button>
                      ) : r.status === 'YC_MOI' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                          ⏳ Chờ tiếp nhận
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Đã khóa
                        </span>
                      )}
                    </>
                  )}

                  {/* PRICING Role Permissions */}
                  {(currentRole === 'PRICING' || currentRole === 'ADMIN') && (
                    <>
                      {r.status === 'YC_MOI' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAccept(r.id, r.version);
                          }}
                        >
                          <Zap size={12} /> Tiếp nhận
                        </button>
                      )}

                      {r.status === 'DANG_XLY' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPricing(r.id);
                          }}
                        >
                          <DollarSign size={12} /> Báo Giá
                        </button>
                      )}

                      {r.status === 'XONG' && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Đã Báo Giá
                        </span>
                      )}

                      {r.status === 'TU_CHOI' && (
                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> Từ Chối
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
