import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { UserPlus, Users, Search, Check } from 'lucide-react';
import type { Customer } from '../types';

const subLabelCls = 'text-[11px] font-bold text-[#334155]';

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
      <div className="flex items-center justify-between mb-[6px]">
        <label className="form-label">
          {isNewCustomerMode ? 'Thông Tin Khách Hàng Mới' : 'Thông Tin Khách Hàng'}
        </label>
        {isNewCustomerMode && (
          <button
            type="button"
            onClick={() => setIsNewCustomerMode(false)}
            className="py-[4px] px-[10px] text-[11px] font-bold rounded-[6px] border border-[#cbd5e1] bg-surface text-muted cursor-pointer flex items-center gap-[4px]"
          >
            <Users size={12} /> ← Chọn khách hàng có sẵn
          </button>
        )}
      </div>

      {!isNewCustomerMode ? (
        <div className="flex flex-col gap-[6px]">
          <div className="relative" ref={wrapRef}>
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              className="form-control pl-[30px] text-[12px]"
              placeholder="Gõ tìm tên hoặc SĐT khách hàng..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (customerList.length > 0) setIsDropdownOpen(true);
              }}
            />

            {isDropdownOpen && (
              <div
                className="absolute top-[calc(100%+4px)] left-0 right-0 bg-surface border border-border rounded-[10px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.05)] max-h-[220px] overflow-y-auto z-50 p-[4px]"
              >
                {customerSearchLoading && (
                  <div className="p-[10px] text-[12px] text-faint">Đang tìm...</div>
                )}
                {!customerSearchLoading && customerList.length === 0 && (
                  <div className="p-[10px] text-[12px] text-faint">Không tìm thấy khách hàng nào</div>
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
                      className={clsx(
                        'w-full flex items-center justify-between gap-[8px] py-[8px] px-[10px] rounded-[8px] border-0 text-[#0f172a] text-[12px] cursor-pointer text-left',
                        isSelected ? 'bg-[#eff6ff]' : 'bg-transparent dropdown-item-hover',
                      )}
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
            <div className="flex items-center gap-[6px] py-[6px] px-[10px] bg-[#eff6ff] rounded-[8px] text-[11.5px] text-[#1e40af] font-semibold">
              <Check size={13} /> Đã chọn: {selectedCustomer.name}{selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}
            </div>
          )}

          {!customerSearchLoading && customerList.length === 0 && (
            <button
              type="button"
              onClick={handleStartNewCustomerFromSearch}
              className="flex items-center justify-center gap-[6px] py-[8px] px-[10px] rounded-[8px] border-[1.5px] border-dashed border-[#10b981] bg-[#f0fdf4] text-[#15803d] text-[12px] font-bold cursor-pointer"
            >
              <UserPlus size={13} />
              {customerSearch.trim()
                ? `Không tìm thấy — Tạo khách hàng mới "${customerSearch.trim()}"`
                : 'Chưa có trong hệ thống? Tạo khách hàng mới'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-[10px] p-[14px] flex flex-col gap-[10px]">
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className={subLabelCls}>Tên Khách Hàng</label>
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
              <label className={subLabelCls}>Số Điện Thoại</label>
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

          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className={subLabelCls}>Tỉnh / Thành Phố</label>
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
              <label className={subLabelCls}>Xã / Phường / Huyện</label>
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
            <label className={subLabelCls}>Địa Chỉ Cụ Thể (Số nhà, tên đường...)</label>
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
