import React, { useState, useMemo, useEffect } from 'react';
import type { QuoteRequest, ProductCategory, Material } from '../types';
import { Search, RefreshCw, Ruler, Tag, Layers } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from './Pagination';

interface ProductLibraryViewProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  onSelectReq: (id: string) => void;
  selectedId?: string | null;
  totalCount?: number;
}

export const ProductLibraryView: React.FC<ProductLibraryViewProps> = ({
  requests,
  categories,
  materials,
  onSelectReq,
  selectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMat, setSelectedMat] = useState('ALL');

  // Pagination State - read default from UI_CONSTANTS
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);

  // Filter only completed / quoted products
  const quotedRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'XONG' || (r.quotedPrice && Number(r.quotedPrice) > 0));
  }, [requests]);

  // Apply search & filtering
  const filteredRequests = useMemo(() => {
    return quotedRequests.filter((r) => {
      // Search check
      const query = searchTerm.trim().toLowerCase();
      const codeMatch = (r.code || r.id).toLowerCase().includes(query);
      const nameMatch = (r.productName || '').toLowerCase().includes(query);
      const custMatch = (r.customerMeasurements || '').toLowerCase().includes(query);
      const searchOk = !query || codeMatch || nameMatch || custMatch;

      // Category filter
      const catOk = selectedCat === 'ALL' || r.category?.id === selectedCat;

      // Material filter
      const matOk =
        selectedMat === 'ALL' ||
        r.material?.id === selectedMat ||
        (r.materials && r.materials.some((m) => m.id === selectedMat));

      return searchOk && catOk && matOk;
    });
  }, [quotedRequests, searchTerm, selectedCat, selectedMat]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCat, selectedMat]);

  // Calculate pagination slices
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const pagedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const formatVND = (num?: number | string | null) => {
    const val = num ? Number(num) : 0;
    return val > 0 ? val.toLocaleString('vi-VN') + ' ₫' : 'Đã báo giá';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            THƯ VIỆN MẪU ĐÃ BÁO GIÁ
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0' }}>
            Thư Viện Sản Phẩm Trang Sức
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Danh sách các sản phẩm đã báo giá hoàn tất, bao gồm thông tin chi tiết tên mẫu, chất liệu, kích thước và đơn giá chốt.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo tên mẫu, mã sản phẩm, kích thước..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px', fontSize: '12.5px', borderRadius: '10px' }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={14} color="#64748b" /> Danh mục:
          </span>
          <select
            className="form-control"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{ height: '40px', fontSize: '12px', borderRadius: '10px', width: '160px' }}
          >
            <option value="ALL">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Material Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tag size={14} color="#64748b" /> Chất liệu:
          </span>
          <select
            className="form-control"
            value={selectedMat}
            onChange={(e) => setSelectedMat(e.target.value)}
            style={{ height: '40px', fontSize: '12px', borderRadius: '10px', width: '160px' }}
          >
            <option value="ALL">Tất cả chất liệu</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {(searchTerm || selectedCat !== 'ALL' || selectedMat !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCat('ALL');
              setSelectedMat('ALL');
            }}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={13} /> Xóa lọc
          </button>
        )}
      </div>

      {/* Cards Grid: Fixed 4 columns per row on desktop */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
        className="product-library-grid"
      >
        {pagedRequests.length > 0 ? (
          pagedRequests.map((r) => {
            const isSelected = r.id === selectedId;
            const rawImgUrl = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
            const imgUrl = rawImgUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

            const materialsList = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name)
              : r.material ? [r.material.name] : [];
            const matStr = materialsList.join(', ');

            return (
              <div
                key={r.id}
                onClick={() => onSelectReq(r.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 20px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.18s ease-in-out',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
                className="product-card-hover"
              >
                {/* Image & Category Badge */}
                <div style={{ position: 'relative', width: '100%', height: '145px', background: '#f8fafc' }}>
                  <img
                    src={imgUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {r.category?.name && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        backdropFilter: 'blur(4px)',
                        zIndex: 2,
                      }}
                    >
                      {r.category.name}
                    </span>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#ffffff',
                      color: '#2563eb',
                      fontSize: '10px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      zIndex: 2,
                    }}
                  >
                    {r.code || r.id}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                  {/* Product Name */}
                  <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.productName}
                  </h3>

                  {/* Materials Chips */}
                  <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: '#64748b', flexShrink: 0 }}>Chất liệu:</span>
                    <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {matStr || '---'}
                    </span>
                  </div>

                  {/* Size / Measurements */}
                  <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <Ruler size={13} color="#d97706" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Số đo: <strong style={{ color: '#0f172a' }}>{r.customerMeasurements || '---'}</strong>
                    </span>
                  </div>

                  {/* Price Tag Footer (Stacked to fit 4 columns perfectly) */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '8px',
                      borderTop: '1px dashed #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#166534', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      GIÁ BÁO KHÁCH
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatVND(r.quotedPrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Không tìm thấy sản phẩm nào phù hợp
            </div>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0 }}>
              Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc danh mục/chất liệu.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalItems > 0 && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};
