import React, { useState, useEffect, useRef } from 'react';
import type { Customer, Material, ProductCategory, QuoteRequest } from '../types';
import { createCustomer, searchCustomers } from '../services/api';
import { X, UserPlus, Users, Upload, Search, PlusCircle } from 'lucide-react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  categories: ProductCategory[];
  materials: Material[];
  customers: Customer[];
  onRefreshCustomers: () => Promise<void>;
  editingReq: QuoteRequest | null;
  saleName: string;
}

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // New Customer Fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // Lazy Customer Search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>(customers);

  // Operational Fields
  const [department, setDepartment] = useState('CSKH-Văn Phòng');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState('');
  const [leadTime, setLeadTime] = useState('7-15 NGÀY (Tiêu chuẩn)');
  const [closeRateText, setCloseRateText] = useState('Khách chưa chốt báo giá');
  const [imageUrl, setImageUrl] = useState('');
  const [understandProcess, setUnderstandProcess] = useState(true);

  const [submitting, setSubmitting] = useState(false);

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
        setImageUrl(editingReq.images[0].imageUrl);
      }
    } else {
      setIsNewCustomerMode(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCategoryName('');
      if (customers.length > 0) setSelectedCustomerId(customers[0].id);
      if (categories.length > 0) setSelectedCategoryId(categories[0].id);
      setSelectedMaterialIds([]);
      setCustomerMeasurements('');
      setImageUrl('');
    }
  }, [editingReq, categories, customers, isOpen]);

  // Debounced Lazy Customer Search
  useEffect(() => {
    if (!isOpen || isNewCustomerMode) return;
    const timer = setTimeout(() => {
      searchCustomers(customerSearch)
        .then((res) => {
          setCustomerList(res);
          if (res.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(res[0].id);
          }
        })
        .catch(() => { });
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, isOpen, isNewCustomerMode]);

  if (!isOpen) return null;

  const handleMaterialToggle = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
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
        if (!newCustomerName.trim()) {
          alert('Vui lòng nhập tên khách hàng mới!');
          setSubmitting(false);
          return;
        }

        const createdCust = await createCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
          address: newCustomerAddress.trim() || undefined,
        });

        finalCustomerId = createdCust.id;
        await onRefreshCustomers();
      }

      if (!finalCustomerId) {
        alert('Vui lòng chọn hoặc tạo mới khách hàng!');
        setSubmitting(false);
        return;
      }

      await onSubmit({
        customerId: finalCustomerId,
        categoryId: selectedCategoryId === 'OTHER' ? (categories[0]?.id || '') : selectedCategoryId,
        newCategoryName: selectedCategoryId === 'OTHER' ? newCategoryName.trim() : undefined,
        materialIds: selectedMaterialIds,
        customerMeasurements,
        desiredLeadTime: leadTime,
        imageUrls: imageUrl ? [imageUrl] : undefined,
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
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2 id="modalCreateTitle">Tạo Yêu Cầu Báo Giá Chế Tác Mới</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Điền đầy đủ các trường thông tin chuẩn nghiệp vụ VCB để chuyển bộ phận Định Giá
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Customer Section */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label">Thông Tin Khách Hàng <span className="req">*</span></label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerMode(false)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: !isNewCustomerMode ? '#2563eb' : '#ffffff',
                      color: !isNewCustomerMode ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Users size={12} /> Chọn KH Có Sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerMode(true)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: isNewCustomerMode ? '#10b981' : '#ffffff',
                      color: isNewCustomerMode ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <UserPlus size={12} /> + Thêm KH Mới
                  </button>
                </div>
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
                    {customerList.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} {cust.phone ? `(${cust.phone})` : ''} {cust.address ? `- ${cust.address}` : ''}
                      </option>
                    ))}
                    {customerList.length === 0 && <option value="">Không tìm thấy khách hàng nào</option>}
                  </select>
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
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Tên Khách Hàng <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Địa Chỉ Khách Hàng</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: 123 Nguyễn Trãi, Q1, TP.HCM"
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Field 1 & 2: Sale Name & Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Người hỏi giá (Sale) <span className="req">*</span></label>
                <input type="text" className="form-control" value={saleName} readOnly />
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

            {/* Danh Mục Sản Phẩm */}
            <div className="form-group">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Danh mục sản phẩm <span className="req">*</span></label>
                  <select
                    className="form-control"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="OTHER">Khác (Tạo danh mục mới)</option>
                  </select>
                </div>

                {selectedCategoryId === 'OTHER' && (
                  <div>
                    <label className="form-label">Tên danh mục mới <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tên danh mục mới..."
                      value={newCategoryName}
                      maxLength={30}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Field 5: Materials */}
            <div className="form-group">
              <label className="form-label">Chất liệu Khách muốn chế tác <span className="req">*</span> (Chọn 1 hoặc nhiều)</label>
              <div className="chip-grid">
                {materials.map((m) => (
                  <label key={m.id} className="chip-option">
                    <input
                      type="checkbox"
                      checked={selectedMaterialIds.includes(m.id)}
                      onChange={() => handleMaterialToggle(m.id)}
                    />
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Field 6, 7 & 8: Size, Urgency & Close Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
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

            {/* Field 9: Real File Upload */}
            <div className="form-group">
              <label className="form-label">Ảnh sản phẩm mẫu / Ảnh tham khảo (Tải file thực)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div className="upload-dropzone" onClick={triggerFileInput}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <Upload size={28} color="#2563eb" />
                </div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary)' }}>
                  {imageUrl ? '✓ Đã tải ảnh lên thành công (Bấm để chọn ảnh khác)' : 'Bấm để tải ảnh thực từ máy tính của bạn'}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hỗ trợ PNG, JPG, WEBP, GIF</span>

                {imageUrl && (
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={imageUrl}
                      alt="Ảnh mẫu thực tế"
                      style={{ maxWidth: '140px', maxHeight: '140px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #2563eb', boxShadow: 'var(--shadow-md)' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Operational Notice Banner */}
            <div style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
              <span>Lưu ý nghiệp vụ: Yêu cầu BÁO GIÁ phải có đầy đủ mô tả, ảnh mẫu và chất liệThời gian xử lý từ 1-4 giờ.</span>
              <label style={{ fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284c7', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={understandProcess}
                  onChange={(e) => setUnderstandProcess(e.target.checked)}
                  style={{ accentColor: '#0284c7', cursor: 'pointer' }}
                />
                Tôi đã nắm rõ quy trình
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="primary-action" disabled={submitting}>
              <PlusCircle size={17} /> {editingReq ? '💾 Cập Nhật Yêu Cầu' : '🚀 Gửi Yêu Cầu Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
