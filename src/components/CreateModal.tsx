import React, { useState, useEffect, useRef } from 'react';
import type { Customer, CreateModalProps } from '../types';
import { createCustomer, searchCustomers, fetchProvinces, fetchWards, fetchStones } from '../services/api';
import { X, UserPlus, Users, Upload, Search, PlusCircle } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  materials,
  customers,
  onRefreshCustomers,
  editingReq,
  saleName,
  calculatorData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // New Customer Fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerProvince, setNewCustomerProvince] = useState('');
  const [newCustomerWard, setNewCustomerWard] = useState('');

  // Location Data
  const [provinces, setProvinces] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string; code?: string }[]>([]);

  // Lazy Customer Search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  // Operational Fields
  const [department, setDepartment] = useState('CSKH-Văn Phòng');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedStoneTypes, setSelectedStoneTypes] = useState<('MAIN' | 'SIDE')[]>([]);
  const [stoneOptionsAll, setStoneOptionsAll] = useState<{ id: string; name: string; stoneType: 'MAIN' | 'SIDE' }[]>([]);
  const [selectedStoneIds, setSelectedStoneIds] = useState<string[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState('');
  const [leadTime, setLeadTime] = useState('7-15 NGÀY (Tiêu chuẩn)');
  const [closeRateText, setCloseRateText] = useState('Khách chưa chốt báo giá');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [understandProcess, setUnderstandProcess] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // Dropdown chọn nhiều chất liệu — mở 1 lần, tick nhiều ô checkbox, đóng khi bấm ra ngoài
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!materialDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(e.target as Node)) {
        setMaterialDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [materialDropdownOpen]);

  const toggleMaterialId = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Loại đá (đá chủ/đá tấm) — không bắt buộc. Chọn loại xong mới tải danh mục đá cụ thể của loại đó.
  const [stoneDropdownOpen, setStoneDropdownOpen] = useState(false);
  const stoneDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stoneDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (stoneDropdownRef.current && !stoneDropdownRef.current.contains(e.target as Node)) {
        setStoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stoneDropdownOpen]);

  // Tải toàn bộ đá (đá chủ + đá tấm) 1 lần — checkbox loại đá bên dưới chỉ lọc hiển thị trong dropdown.
  useEffect(() => {
    fetchStones()
      .then((data) => setStoneOptionsAll(Array.isArray(data) ? data : []))
      .catch(() => setStoneOptionsAll([]));
  }, []);

  const toggleStoneType = (t: 'MAIN' | 'SIDE') => {
    setSelectedStoneTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // Tích "Đá chủ" -> chỉ hiện đá chủ, tích "Đá tấm" -> chỉ hiện đá tấm, tích cả 2 -> hiện cả 2.
  const filteredStoneOptions =
    selectedStoneTypes.length > 0
      ? stoneOptionsAll.filter((s) => selectedStoneTypes.includes(s.stoneType))
      : [];

  const toggleStoneId = (id: string) => {
    setSelectedStoneIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (editingReq) {
      setIsNewCustomerMode(false);
      setSelectedCustomerId(editingReq.customer?.id || (customers[0]?.id || ''));
      setSelectedCategoryId(editingReq.category?.id || (categories[0]?.id || ''));
      setNewCategoryName('');
      const matIds = editingReq.materials ? editingReq.materials.map((m) => m.id) : [];
      setSelectedMaterialIds(matIds);
      setCustomerMeasurements(editingReq.customerMeasurements || '');
      if (editingReq.images && editingReq.images.length > 0) {
        setImageUrls(editingReq.images.map((img) => img.imageUrl));
      } else {
        setImageUrls([]);
      }
    } else {
      setIsNewCustomerMode(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerProvince('');
      setNewCustomerWard('');
      setNewCategoryName('');
      if (customers.length > 0) setSelectedCustomerId(customers[0].id);

      if (calculatorData) {
        if (calculatorData.categoryId) {
          setSelectedCategoryId(calculatorData.categoryId);
        } else if (categories.length > 0) {
          setSelectedCategoryId(categories[0].id);
        }

        if (calculatorData.materials && calculatorData.materials.length > 0) {
          const matchedIds: string[] = [];
          calculatorData.materials.forEach((mItem: any) => {
            const mId = mItem.materialId || mItem.id;
            if (mId && materials.some((m) => m.id === mId)) {
              if (!matchedIds.includes(mId)) {
                matchedIds.push(mId);
              }
            } else if (mItem.materialName) {
              const lowerMat = mItem.materialName.toLowerCase().trim();
              const found = materials.find(
                (m) =>
                  lowerMat.includes(m.name.toLowerCase()) ||
                  m.name.toLowerCase().includes(lowerMat),
              );
              if (found && !matchedIds.includes(found.id)) {
                matchedIds.push(found.id);
              }
            }
          });
          setSelectedMaterialIds(
            matchedIds.length > 0
              ? matchedIds
              : materials.length > 0
                ? [materials[0].id]
                : [],
          );
        } else if (calculatorData.materialType) {
          const lowerMat = calculatorData.materialType.toLowerCase();
          const matchedMat = materials.find(
            (m) => lowerMat.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lowerMat)
          );
          if (matchedMat) {
            setSelectedMaterialIds([matchedMat.id]);
          } else if (materials.length > 0) {
            setSelectedMaterialIds([materials[0].id]);
          }
        } else {
          setSelectedMaterialIds([]);
        }

        if (calculatorData.stones && calculatorData.stones.length > 0) {
          const stoneIds = calculatorData.stones
            .map((s: any) => s.stoneId || s.id)
            .filter(Boolean);
          setSelectedStoneIds(stoneIds);
          const types = Array.from(
            new Set(
              stoneIds
                .map((id: string) => stoneOptionsAll.find((s) => s.id === id)?.stoneType)
                .filter(Boolean),
            ),
          ) as ('MAIN' | 'SIDE')[];
          if (types.length > 0) setSelectedStoneTypes(types);
        } else {
          setSelectedStoneIds([]);
          setSelectedStoneTypes([]);
        }
      } else {
        if (categories.length > 0) setSelectedCategoryId(categories[0].id);
        setSelectedMaterialIds([]);
        setSelectedStoneIds([]);
        setSelectedStoneTypes([]);
      }

      setCustomerMeasurements(calculatorData?.note || '');
      setImageUrls([]);
    }
  }, [editingReq, categories, customers, isOpen, calculatorData, materials, stoneOptionsAll]);

  // Load Provinces on Modal Open
  useEffect(() => {
    if (isOpen) {
      fetchProvinces().then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProvinces(data);
        }
      });
    }
  }, [isOpen]);

  // Load Wards when Province changes
  useEffect(() => {
    if (newCustomerProvince) {
      fetchWards(newCustomerProvince).then((data) => {
        if (Array.isArray(data)) {
          setWards(data);
        } else {
          setWards([]);
        }
        setNewCustomerWard('');
      });
    } else {
      setWards([]);
      setNewCustomerWard('');
    }
  }, [newCustomerProvince]);

  // Debounced Lazy Customer Search
  useEffect(() => {
    if (!isOpen || isNewCustomerMode) return;
    setCustomerSearchLoading(true);
    const timer = setTimeout(() => {
      searchCustomers(customerSearch)
        .then((res) => {
          setCustomerList(res);
          if (res.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(res[0].id);
          }
        })
        .catch(() => { })
        .finally(() => setCustomerSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, isOpen, isNewCustomerMode]);

  // Bấm "Tạo khách hàng mới" từ ô tìm kiếm sẽ chuyển sang form nhập, giữ nguyên tên vừa gõ
  const handleStartNewCustomerFromSearch = () => {
    setNewCustomerName(customerSearch.trim());
    setIsNewCustomerMode(true);
  };

  if (!isOpen) return null;

  const MAX_IMAGES = UI_CONSTANTS.CREATE_QUOTE_REQUEST.MAX_IMAGES;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (imageUrls.length >= MAX_IMAGES) {
        alert(`Hệ thống giới hạn tối đa ${MAX_IMAGES} ảnh cho mỗi yêu cầu báo giá!`);
        e.target.value = '';
        return;
      }

      const availableSlots = MAX_IMAGES - imageUrls.length;
      const filesToProcess = Array.from(files).slice(0, availableSlots);

      if (files.length > availableSlots) {
        alert(`Đã tự động lấy ${availableSlots} ảnh đầu tiên (Tối đa ${MAX_IMAGES} ảnh/yêu cầu).`);
      }

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const urlStr = event.target.result as string;
            setImageUrls((prev) => (prev.length < MAX_IMAGES ? [...prev, urlStr] : prev));
          }
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMaterialIds.length === 0 || !customerMeasurements.trim()) {
      alert('Vui lòng chọn chất liệu và số đo/kích thước!');
      return;
    }

    if (selectedCategoryId === 'OTHER' && !newCategoryName.trim()) {
      alert('Vui lòng nhập tên danh mục sản phẩm mới!');
      return;
    }

    if (!understandProcess) {
      alert('Vui lòng tích xác nhận "Tôi đã nắm rõ quy trình"!');
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = selectedCustomerId;

      if (isNewCustomerMode) {
        const createdCust = await createCustomer({
          name: newCustomerName.trim() || 'Khách lẻ',
          phone: newCustomerPhone.trim() || undefined,
          province: newCustomerProvince || undefined,
          ward: newCustomerWard || undefined,
          address: newCustomerAddress.trim() || undefined,
        });

        finalCustomerId = createdCust.id;
        // Chuyển ngay về trạng thái "đã chọn khách hàng này" — nếu bước gửi yêu cầu
        // báo giá bên dưới thất bại và người dùng bấm gửi lại, sẽ KHÔNG tạo trùng khách hàng nữa.
        setCustomerList((prev) => [createdCust, ...prev]);
        setSelectedCustomerId(createdCust.id);
        setIsNewCustomerMode(false);
        onRefreshCustomers().catch(() => {});
      } else if (!finalCustomerId) {
        // Không chọn khách có sẵn cũng không bắt buộc gõ tên — tự tạo "Khách lẻ" nếu để trống hẳn.
        const createdCust = await createCustomer({
          name: customerSearch.trim() || 'Khách lẻ',
        });
        finalCustomerId = createdCust.id;
        setCustomerList((prev) => [createdCust, ...prev]);
        setSelectedCustomerId(createdCust.id);
        onRefreshCustomers().catch(() => {});
      }

      await onSubmit({
        customerId: finalCustomerId,
        categoryId: selectedCategoryId === 'OTHER' ? (categories[0]?.id || '') : selectedCategoryId,
        newCategoryName: selectedCategoryId === 'OTHER' ? newCategoryName.trim() : undefined,
        materialIds: selectedMaterialIds,
        stoneIds: selectedStoneIds.length > 0 ? selectedStoneIds : undefined,
        customerMeasurements,
        desiredLeadTime: leadTime,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        quotedPrice: calculatorData?.suggestedPrice,
        options: calculatorData?.options && calculatorData.options.length > 0 ? calculatorData.options : undefined,
      });

      onClose();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '920px', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {/* Header matching design */}
        <div style={{ flexShrink: 0, background: '#111927', color: '#ffffff', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
              alt="Viễn Chí Bảo"
              style={{ height: '32px', objectFit: 'contain' }}
            />
            <div>
              <h2 id="modalCreateTitle" style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Tạo Yêu Cầu Báo Giá Chế Tác Mới
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Điền đầy đủ các trường thông tin chuẩn nghiệp vụ VCB để chuyển bộ phận Định Giá
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0 }}>
          {/* Scrollable Form Body */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '20px' }}>
            {/* 2-Column Grid Layout matching screenshot */}
            <div className="modal-grid-2col">
            
            {/* Left Card: THÔNG TIN ĐƠN HÀNG */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                THÔNG TIN ĐƠN HÀNG
              </h3>

              {/* Customer Section */}
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
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Gõ tìm tên hoặc SĐT khách hàng..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        style={{ paddingLeft: '30px', fontSize: '12px' }}
                      />
                    </div>
                    <select
                      className="form-control"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      {customerList.map((cust) => {
                        const fullAddr = [cust.address, cust.ward, cust.province].filter(Boolean).join(', ');
                        return (
                          <option key={cust.id} value={cust.id}>
                            {cust.name} {cust.phone ? `(${cust.phone})` : ''} {fullAddr ? `- ${fullAddr}` : ''}
                          </option>
                        );
                      })}
                      {customerList.length === 0 && <option value="">Không tìm thấy khách hàng nào</option>}
                    </select>

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
                              <option key={w.id} value={w.districtName ? `${w.name} (${w.districtName})` : w.name}>
                                {w.name} {w.districtName ? `(${w.districtName})` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            placeholder={!newCustomerProvince ? 'Chọn Tỉnh/TP trước...' : 'Nhập Phường / Xã...'}
                            value={newCustomerWard}
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
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sale Name & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Người hỏi giá (Sale) <span className="req">*</span></label>
                  <input type="text" className="form-control" value={saleName} readOnly style={{ background: '#f1f5f9' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bộ phận làm việc <span className="req">*</span></label>
                  <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="CSKH-Văn Phòng">CSKH-Văn Phòng</option>
                    <option value="Cửa Hàng">Cửa Hàng</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              {/* Danh Mục Sản Phẩm - DB Loaded */}
              <div className="form-group">
                <label className="form-label">Danh mục sản phẩm <span className="req">*</span></label>
                <select
                  className="form-control"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={!!calculatorData?.categoryId}
                  style={{ width: '100%', opacity: calculatorData?.categoryId ? 0.75 : 1, cursor: calculatorData?.categoryId ? 'not-allowed' : 'pointer' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="OTHER">Khác (Tạo danh mục mới)</option>
                </select>

                {selectedCategoryId === 'OTHER' && (
                  <div style={{ marginTop: '8px' }}>
                    <label className="form-label">Tên danh mục mới <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tên danh mục mới..."
                      value={newCategoryName}
                      maxLength={30}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Chất liệu Khách muốn chế tác - Multi-Select Dropdown */}
              <div className="form-group">
                <label className="form-label">
                  Chất liệu Khách muốn chế tác <span className="req">*</span> (Có thể chọn nhiều)
                </label>
                <div ref={materialDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setMaterialDropdownOpen((prev) => !prev)}
                    disabled={!!(calculatorData?.materials?.length || calculatorData?.materialType)}
                    className="form-control"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontWeight: 700,
                      background: '#ffffff',
                      opacity: (calculatorData?.materials?.length || calculatorData?.materialType) ? 0.75 : 1,
                      cursor: (calculatorData?.materials?.length || calculatorData?.materialType) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {selectedMaterialIds.length > 0
                      ? `Đã chọn ${selectedMaterialIds.length} chất liệu`
                      : '-- Chọn chất liệu chế tác... --'}
                  </button>

                  {materialDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        padding: '6px',
                      }}
                    >
                      {materials.length === 0 && (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8' }}>Chưa có chất liệu nào</div>
                      )}
                      {materials.map((m) => (
                        <label
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 8px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(m.id)}
                            onChange={() => toggleMaterialId(m.id)}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Material Badges with Remove (✕) Button */}
                {selectedMaterialIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {selectedMaterialIds.map((mId) => {
                      const mat = materials.find((m) => m.id === mId);
                      if (!mat) return null;
                      return (
                        <span
                          key={mId}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          ✓ {mat.name}
                          {!(calculatorData?.materials?.length || calculatorData?.materialType) && (
                            <button
                              type="button"
                              onClick={() => setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== mId))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px',
                                lineHeight: 1,
                                fontWeight: 800,
                              }}
                              title="Xóa chất liệu này"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Loại đá Khách muốn (đá chủ / đá tấm) - không bắt buộc */}
              <div className="form-group">
                <label className="form-label">Loại đá</label>
                <div ref={stoneDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setStoneDropdownOpen((prev) => !prev)}
                    disabled={!!(calculatorData?.stones?.length)}
                    className="form-control"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontWeight: 700,
                      background: '#ffffff',
                      opacity: calculatorData?.stones?.length ? 0.75 : 1,
                      cursor: calculatorData?.stones?.length ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {selectedStoneIds.length > 0
                      ? `Đã chọn ${selectedStoneIds.length} đá`
                      : '-- Chọn đá (không bắt buộc)... --'}
                  </button>

                  {stoneDropdownOpen && !calculatorData?.stones?.length && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        padding: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', padding: '4px 8px 8px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedStoneTypes.includes('MAIN')}
                            onChange={() => toggleStoneType('MAIN')}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          Đá chủ
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedStoneTypes.includes('SIDE')}
                            onChange={() => toggleStoneType('SIDE')}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          Đá tấm
                        </label>
                      </div>

                      {selectedStoneTypes.length === 0 && (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8' }}>Tích đá chủ hoặc đá tấm để xem danh sách đá</div>
                      )}
                      {selectedStoneTypes.length > 0 && filteredStoneOptions.length === 0 && (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#94a3b8' }}>Chưa có đá nào thuộc loại này</div>
                      )}
                      {filteredStoneOptions.map((s) => (
                        <label
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 8px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStoneIds.includes(s.id)}
                            onChange={() => toggleStoneId(s.id)}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStoneIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {selectedStoneIds.map((sId) => {
                      const stone = stoneOptionsAll.find((s) => s.id === sId);
                      if (!stone) return null;
                      return (
                        <span
                          key={sId}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          ✓ {stone.name}
                          {!calculatorData?.stones?.length && (
                            <button
                              type="button"
                              onClick={() => setSelectedStoneIds(selectedStoneIds.filter((id) => id !== sId))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '12px',
                                lineHeight: 1,
                                fontWeight: 800,
                              }}
                              title="Xóa đá này"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right Card: THÔNG SỐ & TÀI LIỆU BÁO GIÁ */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                THÔNG SỐ BÁO GIÁ & TÀI LIỆU
              </h3>

              {/* Size, Urgency & Close Rate */}
              <div className="form-group">
                <label className="form-label">Số đo / Kích thước <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Ni tay 12, 18cm..."
                  value={customerMeasurements}
                  onChange={(e) => setCustomerMeasurements(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Thời gian muốn nhận <span className="req">*</span></label>
                  <select className="form-control" value={leadTime} onChange={(e) => setLeadTime(e.target.value)}>
                    <option value="<3 NGÀY (RẤT GẤP)">&lt;3 NGÀY (RẤT GẤP)</option>
                    <option value="3-7 NGÀY (GẤP)">3-7 NGÀY (GẤP)</option>
                    <option value="7-15 NGÀY (Tiêu chuẩn)">7-15 NGÀY (Tiêu chuẩn)</option>
                    <option value="15-30 NGÀY (Đặt hàng)">15-30 NGÀY (Đặt hàng)</option>
                    <option value=">30 NGÀY (Thong thả)">&gt;30 NGÀY (Thong thả)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Khách tỷ lệ chốt <span className="req">*</span></label>
                  <select className="form-control" value={closeRateText} onChange={(e) => setCloseRateText(e.target.value)}>
                    <option value="Khách chưa chốt báo giá">Khách chưa chốt báo giá</option>
                    <option value="Chắc chắn 100% lấy hàng">Chắc chắn 100% lấy hàng</option>
                    <option value="Khách đã đặt cọc">Khách đã đặt cọc</option>
                    <option value="Không thực hiện báo giá">Không thực hiện báo giá</option>
                  </select>
                </div>
              </div>

              {/* Multiple Images Upload Zone */}
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">
                  Ảnh sản phẩm / mẫu thực tế ({imageUrls.length}/{MAX_IMAGES} ảnh)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
                <div
                  className="upload-dropzone"
                  onClick={() => {
                    if (imageUrls.length >= MAX_IMAGES) {
                      alert(`Hệ thống giới hạn tối đa ${MAX_IMAGES} ảnh/yêu cầu!`);
                      return;
                    }
                    triggerFileInput();
                  }}
                  style={{
                    minHeight: '130px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    background: imageUrls.length >= MAX_IMAGES ? '#f1f5f9' : '#f8fafc',
                    cursor: imageUrls.length >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                    padding: '16px',
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                    opacity: imageUrls.length >= MAX_IMAGES ? 0.7 : 1,
                  }}
                >
                  <div style={{ marginBottom: '6px' }}>
                    <Upload size={30} color="#b45309" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                    {imageUrls.length >= MAX_IMAGES
                      ? `✓ Đã đạt tối đa ${MAX_IMAGES} ảnh mẫu`
                      : imageUrls.length > 0
                      ? `✓ Đã chọn ${imageUrls.length}/${MAX_IMAGES} ảnh (Bấm để chọn thêm)`
                      : 'Kéo thả hoặc bấm để chọn 1 hoặc nhiều ảnh'}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    (Giới hạn tối đa {MAX_IMAGES} ảnh mẫu/yêu cầu | Hỗ trợ PNG, JPG, WEBP)
                  </span>
                </div>

                {/* Uploaded Images Thumbnail Grid */}
                {imageUrls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                    {imageUrls.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={url}
                          alt={`Ảnh mẫu ${idx + 1}`}
                          style={{
                            width: '76px',
                            height: '76px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '2px solid #b45309',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                          title="Xóa ảnh này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add More Photos Button Square */}
                    {imageUrls.length < MAX_IMAGES && (
                      <div
                        onClick={triggerFileInput}
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '10px',
                          border: '2px dashed #b45309',
                          background: '#fffbeb',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: 800,
                          gap: '2px',
                        }}
                        title="Bấm để chọn thêm ảnh"
                      >
                        <Upload size={18} color="#b45309" />
                        <span>+ Thêm</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Operational Notice Banner */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px', fontSize: '12.5px', color: '#92400e', lineHeight: '1.5' }}>
                <strong>Lưu ý nghiệp vụ:</strong> Yêu cầu BÁO GIÁ phải có đầy đủ mô tả, ảnh mẫu và chất liệu. Thời gian xử lý từ 1-4 giờ.
              </div>

              {/* Process Confirmation Checkbox */}
              <label style={{ fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={understandProcess}
                  onChange={(e) => setUnderstandProcess(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#b45309', cursor: 'pointer' }}
                />
                Tôi đã nắm rõ quy trình
              </label>

            </div>
          </div>
          </div>
          {/* End Scrollable Body */}

          {/* Fixed Footer Bar for Submit & Cancel Buttons */}
          <div style={{
            flexShrink: 0,
            background: '#ffffff',
            borderTop: '1px solid #cbd5e1',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '11px 22px',
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <PlusCircle size={18} /> {editingReq ? 'Cập Nhật Yêu Cầu' : 'Gửi Yêu Cầu Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
