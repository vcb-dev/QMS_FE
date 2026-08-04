import React, { useState, useEffect, useRef } from 'react';
import type { Customer, Material, ProductCategory, QuoteRequest } from '../types';
import { createCustomer } from '../services/api';
import { X, Sparkles, UserPlus, Users, Upload } from 'lucide-react';

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

  // 10 Operational Fields
  const [department, setDepartment] = useState('CSKH-Văn Phòng');
  const [productName, setProductName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
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
      setProductName(editingReq.productName || '');
      setSelectedCustomerId(editingReq.customer?.id || (customers[0]?.id || ''));
      setSelectedCategoryId(editingReq.category?.id || (categories[0]?.id || ''));
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
      setProductName('');
      if (customers.length > 0) setSelectedCustomerId(customers[0].id);
      if (categories.length > 0) setSelectedCategoryId(categories[0].id);
      setSelectedMaterialIds([]);
      setCustomerMeasurements('');
      setImageUrl('');
    }
  }, [editingReq, categories, customers, isOpen]);

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
    if (!productName.trim() || selectedMaterialIds.length === 0 || !customerMeasurements.trim()) {
      alert('Vui lòng điền đủ tên sản phẩm, chất liệu và số đo/kích thước!');
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
        productName,
        categoryId: selectedCategoryId,
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
            <h2 id="modalCreateTitle">✨ Tạo Yêu Cầu Báo Giá Chế Tác Mới</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Điền đầy đủ 10 trường thông tin chuẩn nghiệp vụ VCB để chuyển bộ phận Định Giá
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Operational Notice Banner */}
            <div style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>💡 Lưu ý nghiệp vụ: Yêu cầu BÁO GIÁ phải có đầy đủ mô tả, ảnh mẫu và chất liệu. Thời gian xử lý từ 1-4 giờ.</span>
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
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.phone ? `(${cust.phone})` : ''} {cust.address ? `- ${cust.address}` : ''}
                    </option>
                  ))}
                </select>
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
                <label className="form-label">1. Người hỏi giá (Sale) <span className="req">*</span></label>
                <input type="text" className="form-control" value={saleName} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">2. Bộ phận làm việc <span className="req">*</span></label>
                <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="CSKH-Văn Phòng">🏢 CSKH-Văn Phòng</option>
                  <option value="Cửa Hàng">🏪 Cửa Hàng</option>
                  <option value="Global">🌐 Global</option>
                </select>
              </div>
            </div>

            {/* Field 3: Category */}
            <div className="form-group">
              <label className="form-label">3. Danh mục sản phẩm <span className="req">*</span></label>
              <div className="chip-grid">
                {categories.map((c) => (
                  <label key={c.id} className="chip-option">
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={selectedCategoryId === c.id}
                      onChange={() => setSelectedCategoryId(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Field 4: Product Name */}
            <div className="form-group">
              <label className="form-label">4. Tên sản phẩm + Yêu cầu chi tiết của khách <span className="req">*</span></label>
              <textarea
                className="form-control"
                rows={3}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Nhập tên sản phẩm và các chi tiết yêu cầu cụ thể (VD: Bông tai đính đá Moissanite 6.5mm, viền hoa vàng trắng 14k...)"
              />
            </div>

            {/* Field 5: Materials */}
            <div className="form-group">
              <label className="form-label">5. Chất liệu Khách muốn chế tác <span className="req">*</span> (Chọn 1 hoặc nhiều)</label>
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
                <label className="form-label">6. Số đo / Kích thước <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Ni tay 12, 18cm..."
                  value={customerMeasurements}
                  onChange={(e) => setCustomerMeasurements(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">7. Thời gian muốn nhận <span className="req">*</span></label>
                <select className="form-control" value={leadTime} onChange={(e) => setLeadTime(e.target.value)}>
                  <option value="<3 NGÀY (RẤT GẤP)">🔴 &lt;3 NGÀY (RẤT GẤP)</option>
                  <option value="3-7 NGÀY (GẤP)">🟠 3-7 NGÀY (GẤP)</option>
                  <option value="7-15 NGÀY (Tiêu chuẩn)">🟢 7-15 NGÀY (Tiêu chuẩn)</option>
                  <option value="15-30 NGÀY (Đặt hàng)">🔵 15-30 NGÀY (Đặt hàng)</option>
                  <option value=">30 NGÀY (Thong thả)">⚪ &gt;30 NGÀY (Thong thả)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">8. Khách tỷ lệ chốt <span className="req">*</span></label>
                <select className="form-control" value={closeRateText} onChange={(e) => setCloseRateText(e.target.value)}>
                  <option value="Khách chưa chốt báo giá">❓ Khách chưa chốt báo giá</option>
                  <option value="Chắc chắn 100% lấy hàng">⚡ Chắc chắn 100% lấy hàng</option>
                  <option value="Khách đã đặt cọc">💳 Khách đã đặt cọc</option>
                  <option value="Không thực hiện báo giá">🚫 Không thực hiện báo giá</option>
                </select>
              </div>
            </div>

            {/* Field 9: Real File Upload */}
            <div className="form-group">
              <label className="form-label">9. Ảnh sản phẩm mẫu / Ảnh tham khảo (Tải file thực)</label>
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
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="primary-action" disabled={submitting}>
              <Sparkles size={16} /> {editingReq ? '💾 Cập Nhật Yêu Cầu' : '🚀 Gửi Yêu Cầu Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
