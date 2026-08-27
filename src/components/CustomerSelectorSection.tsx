import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, Users, Search, Check } from 'lucide-react';
import type { Customer } from '../types';

interface CustomerSelectorSectionProps {
  isNewCustomerMode: boolean;
  setIsNewCustomerMode: (v: boolean) => void;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  customerList: Customer[];
  customerSearchLoading: boolean;
  selectedCustomerId: string;
  setSelectedCustomerId: (v: string) => void;
  newCustomerName: string;
  setNewCustomerName: (v: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (v: string) => void;
  newCustomerAddress: string;
  setNewCustomerAddress: (v: string) => void;
  newCustomerProvince: string;
  setNewCustomerProvince: (v: string) => void;
  newCustomerWard: string;
  setNewCustomerWard: (v: string) => void;
  provinces: { id: string; name: string; code?: string }[];
  wards: { id: string; name: string; code?: string }[];
}

// Khối "Tìm khách hàng có sẵn" / "Form nhập khách hàng mới (Tỉnh/Xã)" của CreateModal — tách riêng
// vì chiếm ~180 dòng, chỉ nhận lại đúng state/setter đã có ở CreateModal, không đổi logic.
export const CustomerSelectorSection: React.FC<CustomerSelectorSectionProps> = ({
  isNewCustomerMode,
  setIsNewCustomerMode,
  customerSearch,
  setCustomerSearch,
  customerList,
  customerSearchLoading,
  selectedCustomerId,
  setSelectedCustomerId,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  newCustomerAddress,
  setNewCustomerAddress,
  newCustomerProvince,
  setNewCustomerProvince,
  newCustomerWard,
  setNewCustomerWard,
  provinces,
  wards,
}) => {
  const handleStartNewCustomerFromSearch = () => {
    setNewCustomerName(customerSearch.trim());
    setIsNewCustomerMode(true);
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedCustomer = customerList.find((c) => c.id === selectedCustomerId);

  // Có kết quả tìm mới về thì tự sổ dropdown ra luôn — không bắt người dùng phải bấm mở thêm 1 lần.
  useEffect(() => {
    if (customerList.length > 0) setIsDropdownOpen(true);
  }, [customerList]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label className="form-label">
          {isNewCustomerMode ? 'Thông Tin Khách Hàng Mới' : 'Thông Tin Khách Hàng'}
        </label>
        {isNewCustomerMode && (
          <button
            type="button"
            onClick={() => setIsNewCustomerMode(false)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Users size={12} /> ← Chọn khách hàng có sẵn
          </button>
        )}
      </div>

      {!isNewCustomerMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ position: 'relative' }} ref={wrapRef}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Gõ tìm tên hoặc SĐT khách hàng..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (customerList.length > 0) setIsDropdownOpen(true);
              }}
              style={{ paddingLeft: '30px', fontSize: '12px' }}
            />

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50,
                  padding: '4px',
                }}
              >
                {customerSearchLoading && (
                  <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>Đang tìm...</div>
                )}
                {!customerSearchLoading && customerList.length === 0 && (
                  <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8' }}>Không tìm thấy khách hàng nào</div>
                )}
                {!customerSearchLoading && customerList.map((cust) => {
                  const fullAddr = [cust.address, cust.ward?.name, cust.province?.name].filter(Boolean).join(', ');
                  const isSelected = cust.id === selectedCustomerId;
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        color: '#0f172a',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      className={isSelected ? '' : 'dropdown-item-hover'}
                    >
                      <span>
                        <strong>{cust.name}</strong>
                        {cust.phone ? ` (${cust.phone})` : ''}
                        {fullAddr ? ` - ${fullAddr}` : ''}
                      </span>
                      {isSelected && <Check size={13} color="#2563eb" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedCustomer && !isDropdownOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#eff6ff', borderRadius: '8px', fontSize: '11.5px', color: '#1e40af', fontWeight: 600 }}>
              <Check size={13} /> Đã chọn: {selectedCustomer.name}{selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}
            </div>
          )}

          {!customerSearchLoading && customerList.length === 0 && (
            <button
              type="button"
              onClick={handleStartNewCustomerFromSearch}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px dashed #10b981',
                background: '#f0fdf4',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <UserPlus size={13} />
              {customerSearch.trim()
                ? `Không tìm thấy — Tạo khách hàng mới "${customerSearch.trim()}"`
                : 'Chưa có trong hệ thống? Tạo khách hàng mới'}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Tên Khách Hàng</label>
              <input
                type="text"
                className="form-control"
                placeholder="Để trống sẽ lưu là &quot;Khách lẻ&quot;"
                value={newCustomerName}
                maxLength={100}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Số Điện Thoại</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: 0987654321"
                value={newCustomerPhone}
                maxLength={15}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Tỉnh / Thành Phố</label>
              <select
                className="form-control"
                value={newCustomerProvince}
                onChange={(e) => setNewCustomerProvince(e.target.value)}
              >
                <option value="">-- Chọn Tỉnh / Thành Phố --</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Xã / Phường / Huyện</label>
              {wards.length > 0 ? (
                <select
                  className="form-control"
                  value={newCustomerWard}
                  onChange={(e) => setNewCustomerWard(e.target.value)}
                  disabled={!newCustomerProvince}
                >
                  <option value="">-- Chọn Xã / Phường --</option>
                  {wards.map((w: any) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder={!newCustomerProvince ? 'Chọn Tỉnh/TP trước...' : 'Nhập Phường / Xã...'}
                  value={newCustomerWard}
                  maxLength={100}
                  onChange={(e) => setNewCustomerWard(e.target.value)}
                  disabled={!newCustomerProvince}
                />
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Địa Chỉ Cụ Thể (Số nhà, tên đường...)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: 123 Nguyễn Trãi"
              value={newCustomerAddress}
              maxLength={200}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
