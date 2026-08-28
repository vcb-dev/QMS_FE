import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Customer, CreateModalProps } from '../types';
import { createCustomer, searchCustomers, fetchProvinces, fetchWards, fetchStones } from '../services/api';
import { X, Upload, PlusCircle } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { CustomerSelectorSection } from './CustomerSelectorSection';

// Chip "✓ tên" cho chất liệu/đá đã chọn — 2 chỗ trước đây tự viết lặp lại y hệt, chỉ khác điều
// kiện ẩn nút xóa (material dựa vào calculatorData.materials/materialType, stone dựa cả object).
const SelectedChip: React.FC<{ label: string; onRemove?: () => void; removeTitle?: string }> = ({ label, onRemove, removeTitle }) => (
  <span
    style={{
      background: '#f1f5f9',
      border: '1px solid #cbd5e1',
      color: '#334155',
      padding: '4px 10px',
      borderRadius: '16px',
      fontSize: '11.5px',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    }}
  >
    ✓ {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', padding: 0, fontSize: '12px', lineHeight: 1, fontWeight: 800 }}
        title={removeTitle}
      >
        ✕
      </button>
    )}
  </span>
);

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  materials,
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
  const [customerList, setCustomerList] = useState<Customer[]>([]);
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
  // Ảnh cũ đã có sẵn (lúc sửa yêu cầu) — URL Cloudinary thật, gửi lại nguyên văn (BE pass-through,
  // không upload lại). Ảnh mới chọn thêm — giữ nguyên File, gửi multipart thật lúc submit, KHÔNG
  // còn encode base64 (encode + gửi base64 qua JSON body từng làm request tạo đơn chậm hẳn).
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const totalImageCount = existingImageUrls.length + newImageFiles.length;

  // Video sản phẩm/mẫu thực tế — chỉ 1 video/yêu cầu (khác ảnh cho phép nhiều). Cùng cơ chế với
  // ảnh: video cũ (lúc sửa) giữ nguyên URL Cloudinary thật, video mới gửi multipart thật lúc submit.
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newVideoPreviewUrl, setNewVideoPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const MAX_VIDEO_SIZE_MB = UI_CONSTANTS.CREATE_QUOTE_REQUEST.MAX_VIDEO_SIZE_MB;

  // Preview ảnh mới chọn bằng object URL (không cần đọc file/encode gì) — thu hồi URL cũ mỗi khi
  // danh sách file đổi hoặc component unmount, tránh rò rỉ bộ nhớ.
  useEffect(() => {
    const urls = newImageFiles.map((f) => URL.createObjectURL(f));
    setNewImagePreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newImageFiles]);

  useEffect(() => {
    if (!newVideoFile) {
      setNewVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(newVideoFile);
    setNewVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newVideoFile]);
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
  // Panel render qua createPortal ra document.body (position: fixed, tọa độ tự tính từ nút bấm) —
  // form cha có overflow:hidden + khối cuộn overflowY:auto, panel position:absolute con nằm trong
  // đó bị cắt mất phần vượt khỏi vùng cuộn hiện tại (nhất là khi trường này nằm gần đáy form), bấm
  // vào coi như không phản hồi gì dù state đã mở đúng.
  const [stoneDropdownOpen, setStoneDropdownOpen] = useState(false);
  const stoneDropdownRef = useRef<HTMLDivElement>(null);
  const stoneDropdownMenuRef = useRef<HTMLDivElement>(null);
  const stoneDropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const [stoneDropdownPos, setStoneDropdownPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 260, dropUp: false });

  // Không gian dưới trigger có thể không đủ (trường nằm gần đáy form/màn hình) — nếu vậy lật menu
  // lên trên trigger và luôn co maxHeight theo khoảng trống thật để nội dung không bị viewport cắt mất
  // phần cuối (cuộn nội bộ không cứu được vì toàn bộ box đã nằm ngoài màn hình).
  const updateStoneDropdownPos = () => {
    const rect = stoneDropdownTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const desired = 320;
    const dropUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(desired, dropUp ? spaceAbove : spaceBelow));
    setStoneDropdownPos({
      top: dropUp ? rect.top - margin - maxHeight : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
      dropUp,
    });
  };

  useEffect(() => {
    if (!stoneDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        stoneDropdownRef.current && !stoneDropdownRef.current.contains(target) &&
        !stoneDropdownMenuRef.current?.contains(target)
      ) {
        setStoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateStoneDropdownPos);
    document.addEventListener('scroll', updateStoneDropdownPos, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateStoneDropdownPos);
      document.removeEventListener('scroll', updateStoneDropdownPos, true);
    };
  }, [stoneDropdownOpen]);

  // Tải toàn bộ đá (đá chủ + đá tấm) 1 lần — checkbox loại đá bên dưới chỉ lọc hiển thị trong dropdown.
  useEffect(() => {
    fetchStones()
      .then((data) => setStoneOptionsAll(Array.isArray(data) ? data : []))
      .catch(() => setStoneOptionsAll([]));
  }, []);

  // Chỉ lọc theo 1 loại tại 1 thời điểm (tích đá chủ tự bỏ tích đá tấm và ngược lại) — KHÔNG giới
  // hạn đá đã CHỌN (selectedStoneIds vẫn giữ nguyên khi đổi bộ lọc), nên vẫn thêm được cả đá chủ
  // lẫn đá tấm, chỉ là phải đổi qua lại bộ lọc để duyệt từng loại thay vì xem gộp chung 1 danh sách.
  const toggleStoneType = (t: 'MAIN' | 'SIDE') => {
    setSelectedStoneTypes((prev) => (prev.includes(t) ? [] : [t]));
  };

  // Tích "Đá chủ" -> chỉ hiện đá chủ, tích "Đá tấm" -> chỉ hiện đá tấm.
  const filteredStoneOptions =
    selectedStoneTypes.length > 0
      ? stoneOptionsAll.filter((s) => selectedStoneTypes.includes(s.stoneType))
      : [];

  const toggleStoneId = (id: string) => {
    setSelectedStoneIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const [stoneSearchQuery, setStoneSearchQuery] = useState('');
  const visibleStoneOptions = filteredStoneOptions.filter((s) =>
    s.name.toLowerCase().includes(stoneSearchQuery.trim().toLowerCase())
  );
  const allVisibleStoneSelected =
    visibleStoneOptions.length > 0 && visibleStoneOptions.every((s) => selectedStoneIds.includes(s.id));
  const toggleSelectAllVisibleStones = () => {
    if (allVisibleStoneSelected) {
      const visibleIds = new Set(visibleStoneOptions.map((s) => s.id));
      setSelectedStoneIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      setSelectedStoneIds((prev) => Array.from(new Set([...prev, ...visibleStoneOptions.map((s) => s.id)])));
    }
  };

  useEffect(() => {
    if (editingReq) {
      setIsNewCustomerMode(false);
      setSelectedCustomerId(editingReq.customer?.id || '');
      setSelectedCategoryId(editingReq.category?.id || (categories[0]?.id || ''));
      setNewCategoryName('');
      const matIds = editingReq.materials ? editingReq.materials.map((m) => m.id) : [];
      setSelectedMaterialIds(matIds);
      setCustomerMeasurements(editingReq.customerMeasurements || '');
      setExistingImageUrls(editingReq.images ? editingReq.images.map((img) => img.imageUrl) : []);
      setNewImageFiles([]);
      setExistingVideoUrl(editingReq.videoUrl || null);
      setNewVideoFile(null);
    } else {
      setIsNewCustomerMode(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerProvince('');
      setNewCustomerWard('');
      setNewCategoryName('');

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
      setExistingImageUrls([]);
      setNewImageFiles([]);
      setExistingVideoUrl(null);
      setNewVideoFile(null);
    }
  }, [editingReq, categories, isOpen, calculatorData, materials, stoneOptionsAll]);

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

  // Debounced Lazy Customer Search — KHÔNG tự chọn sẵn khách hàng đầu tiên trả về (từng gây bug:
  // gõ tìm tên khách mới nhưng không bấm "Tạo khách hàng mới" thì đơn vẫn âm thầm gắn vào khách
  // ĐẦU TIÊN của kết quả tìm/danh sách mặc định — người dùng không hề chủ động chọn ai cả). Mỗi lần
  // đổi từ khóa tìm, xóa lựa chọn cũ ngay (tránh giữ ID khách của kết quả tìm TRƯỚC trong khi
  // dropdown đang hiển thị danh sách MỚI) — bắt buộc người dùng tự bấm chọn 1 dòng trong dropdown,
  // hoặc để trống hẳn thì lúc submit sẽ tự tạo "Khách lẻ" theo tên đã gõ (xem handleSubmit).
  useEffect(() => {
    if (!isOpen || isNewCustomerMode) return;
    setSelectedCustomerId('');
    setCustomerSearchLoading(true);
    const timer = setTimeout(() => {
      searchCustomers(customerSearch)
        .then((res) => {
          setCustomerList(res);
        })
        .catch(() => { })
        .finally(() => setCustomerSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, isOpen, isNewCustomerMode]);

  if (!isOpen) return null;

  const MAX_IMAGES = UI_CONSTANTS.CREATE_QUOTE_REQUEST.MAX_IMAGES;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (totalImageCount >= MAX_IMAGES) {
        alert(`Hệ thống giới hạn tối đa ${MAX_IMAGES} ảnh cho mỗi yêu cầu báo giá!`);
        e.target.value = '';
        return;
      }

      const availableSlots = MAX_IMAGES - totalImageCount;
      const filesToProcess = Array.from(files).slice(0, availableSlots);

      if (files.length > availableSlots) {
        alert(`Đã tự động lấy ${availableSlots} ảnh đầu tiên (Tối đa ${MAX_IMAGES} ảnh/yêu cầu).`);
      }

      setNewImageFiles((prev) => [...prev, ...filesToProcess]);
    }
    e.target.value = '';
  };

  const removeExistingImage = (indexToRemove: number) => {
    setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeNewImage = (indexToRemove: number) => {
    setNewImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      alert(`Kích thước video vượt quá giới hạn cho phép (tối đa ${MAX_VIDEO_SIZE_MB}MB)!`);
      return;
    }

    setExistingVideoUrl(null);
    setNewVideoFile(file);
  };

  const removeVideo = () => {
    setExistingVideoUrl(null);
    setNewVideoFile(null);
  };

  const triggerVideoInput = () => {
    videoInputRef.current?.click();
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
          provinceId: newCustomerProvince || undefined,
          wardId: newCustomerWard || undefined,
          address: newCustomerAddress.trim() || undefined,
        });

        finalCustomerId = createdCust.id;
        // Chuyển ngay về trạng thái "đã chọn khách hàng này" — nếu bước gửi yêu cầu
        // báo giá bên dưới thất bại và người dùng bấm gửi lại, sẽ KHÔNG tạo trùng khách hàng nữa.
        setCustomerList((prev) => [createdCust, ...prev]);
        setSelectedCustomerId(createdCust.id);
        setIsNewCustomerMode(false);
      } else if (!finalCustomerId) {
        // Không chọn khách có sẵn cũng không bắt buộc gõ tên — tự tạo "Khách lẻ" nếu để trống hẳn.
        const createdCust = await createCustomer({
          name: customerSearch.trim() || 'Khách lẻ',
        });
        finalCustomerId = createdCust.id;
        setCustomerList((prev) => [createdCust, ...prev]);
        setSelectedCustomerId(createdCust.id);
      }

      await onSubmit({
        customerId: finalCustomerId,
        categoryId: selectedCategoryId === 'OTHER' ? (categories[0]?.id || '') : selectedCategoryId,
        newCategoryName: selectedCategoryId === 'OTHER' ? newCategoryName.trim() : undefined,
        materialIds: selectedMaterialIds,
        stoneIds: selectedStoneIds.length > 0 ? selectedStoneIds : undefined,
        customerMeasurements,
        desiredLeadTime: leadTime,
        imageUrls: existingImageUrls.length > 0 ? existingImageUrls : undefined,
        files: newImageFiles.length > 0 ? newImageFiles : undefined,
        videoUrl: existingVideoUrl || undefined,
        videoFile: newVideoFile || undefined,
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
        <div style={{ flexShrink: 0, background: '#ffffff', color: '#0f172a', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
              alt="Viễn Chí Bảo"
              style={{ height: '32px', objectFit: 'contain' }}
            />
            <div>
              <h2 id="modalCreateTitle" style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Tạo Yêu Cầu Báo Giá Chế Tác Mới
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Điền đầy đủ các trường thông tin chuẩn nghiệp vụ VCB để chuyển bộ phận Định Giá
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
              <CustomerSelectorSection
                isNewCustomerMode={isNewCustomerMode}
                setIsNewCustomerMode={setIsNewCustomerMode}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                customerList={customerList}
                customerSearchLoading={customerSearchLoading}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={setSelectedCustomerId}
                newCustomerName={newCustomerName}
                setNewCustomerName={setNewCustomerName}
                newCustomerPhone={newCustomerPhone}
                setNewCustomerPhone={setNewCustomerPhone}
                newCustomerAddress={newCustomerAddress}
                setNewCustomerAddress={setNewCustomerAddress}
                newCustomerProvince={newCustomerProvince}
                setNewCustomerProvince={setNewCustomerProvince}
                newCustomerWard={newCustomerWard}
                setNewCustomerWard={setNewCustomerWard}
                provinces={provinces}
                wards={wards}
              />

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
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#475569' }}
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
                        <SelectedChip
                          key={mId}
                          label={mat.name}
                          removeTitle="Xóa chất liệu này"
                          onRemove={
                            !(calculatorData?.materials?.length || calculatorData?.materialType)
                              ? () => setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== mId))
                              : undefined
                          }
                        />
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
                    ref={stoneDropdownTriggerRef}
                    type="button"
                    onClick={() => {
                      if (!stoneDropdownOpen) updateStoneDropdownPos();
                      setStoneDropdownOpen((prev) => !prev);
                    }}
                    // Giá đã tính sẵn ở máy tính (calculatorData) là giá ĐÓNG BĂNG theo đúng cấu
                    // hình đá lúc tính (kể cả 0 đá) — khóa cả khi lúc tính KHÔNG có đá nào, không
                    // chỉ khi có đá, nếu không Sale thêm đá tay ở đây thì giá hiển thị vẫn y nguyên,
                    // không phản ánh đá vừa thêm.
                    disabled={!!calculatorData}
                    className="form-control"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontWeight: 700,
                      background: '#ffffff',
                      opacity: calculatorData ? 0.75 : 1,
                      cursor: calculatorData ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {selectedStoneIds.length > 0
                      ? `Đã chọn ${selectedStoneIds.length} đá`
                      : '-- Chọn đá (không bắt buộc)... --'}
                  </button>

                  {stoneDropdownOpen && !calculatorData && createPortal(
                    <div
                      ref={stoneDropdownMenuRef}
                      style={{
                        position: 'fixed',
                        top: stoneDropdownPos.top,
                        left: stoneDropdownPos.left,
                        width: stoneDropdownPos.width,
                        maxHeight: stoneDropdownPos.maxHeight,
                        zIndex: 9999,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Bộ lọc loại đá dạng segmented control — chỉ 1 loại hiển thị tại 1 thời điểm */}
                      <div style={{ display: 'flex', gap: '6px', padding: '10px 10px 8px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        {(['MAIN', 'SIDE'] as const).map((t) => {
                          const active = selectedStoneTypes.includes(t);
                          const count = stoneOptionsAll.filter((s) => s.stoneType === t).length;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleStoneType(t)}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '7px 10px',
                                borderRadius: '7px',
                                border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                background: active ? '#e2e8f0' : '#ffffff',
                                color: active ? '#0f172a' : '#475569',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background 0.12s, color 0.12s',
                              }}
                            >
                              {t === 'MAIN' ? 'Đá chủ' : 'Đá tấm'}
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  background: active ? '#cbd5e1' : '#e2e8f0',
                                  color: active ? '#0f172a' : '#64748b',
                                }}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedStoneTypes.length > 0 && (
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
                          <input
                            type="text"
                            value={stoneSearchQuery}
                            onChange={(e) => setStoneSearchQuery(e.target.value)}
                            placeholder="Tìm tên đá..."
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              fontSize: '13px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}

                      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px' }}>
                        {selectedStoneTypes.length === 0 && (
                          <div style={{ padding: '16px 8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                            Chọn "Đá chủ" hoặc "Đá tấm" ở trên để xem danh sách đá
                          </div>
                        )}
                        {selectedStoneTypes.length > 0 && filteredStoneOptions.length === 0 && (
                          <div style={{ padding: '16px 8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Chưa có đá nào thuộc loại này</div>
                        )}
                        {selectedStoneTypes.length > 0 && filteredStoneOptions.length > 0 && visibleStoneOptions.length === 0 && (
                          <div style={{ padding: '16px 8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Không tìm thấy đá phù hợp</div>
                        )}
                        {visibleStoneOptions.length > 0 && (
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '7px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={allVisibleStoneSelected}
                              onChange={toggleSelectAllVisibleStones}
                              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#475569' }}
                            />
                            {allVisibleStoneSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${visibleStoneOptions.length})`}
                          </label>
                        )}
                        {visibleStoneOptions.map((s) => (
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
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStoneIds.includes(s.id)}
                              onChange={() => toggleStoneId(s.id)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#475569' }}
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    </div>,
                    document.body,
                  )}
                </div>

                {selectedStoneIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {selectedStoneIds.map((sId) => {
                      const stone = stoneOptionsAll.find((s) => s.id === sId);
                      if (!stone) return null;
                      return (
                        <SelectedChip
                          key={sId}
                          label={stone.name}
                          removeTitle="Xóa đá này"
                          onRemove={!calculatorData ? () => setSelectedStoneIds(selectedStoneIds.filter((id) => id !== sId)) : undefined}
                        />
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
                  maxLength={200}
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
                  Ảnh sản phẩm / mẫu thực tế ({totalImageCount}/{MAX_IMAGES} ảnh)
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
                    if (totalImageCount >= MAX_IMAGES) {
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
                    background: totalImageCount >= MAX_IMAGES ? '#f1f5f9' : '#f8fafc',
                    cursor: totalImageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                    padding: '16px',
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                    opacity: totalImageCount >= MAX_IMAGES ? 0.7 : 1,
                  }}
                >
                  <div style={{ marginBottom: '6px' }}>
                    <Upload size={30} color="#64748b" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                    {totalImageCount >= MAX_IMAGES
                      ? `✓ Đã đạt tối đa ${MAX_IMAGES} ảnh mẫu`
                      : totalImageCount > 0
                      ? `✓ Đã chọn ${totalImageCount}/${MAX_IMAGES} ảnh (Bấm để chọn thêm)`
                      : 'Kéo thả hoặc bấm để chọn 1 hoặc nhiều ảnh'}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    (Giới hạn tối đa {MAX_IMAGES} ảnh mẫu/yêu cầu | Hỗ trợ PNG, JPG, WEBP)
                  </span>
                </div>

                {/* Uploaded Images Thumbnail Grid — gộp ảnh cũ (existingImageUrls, URL thật) và
                    ảnh mới vừa chọn (newImagePreviewUrls, object URL tạm để preview) thành 1 lưới,
                    mỗi loại xóa qua đúng setter của nó. */}
                {totalImageCount > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                    {existingImageUrls.map((url, idx) => (
                      <div key={`existing-${idx}`} style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={url}
                          alt={`Ảnh mẫu ${idx + 1}`}
                          style={{
                            width: '76px',
                            height: '76px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '2px solid #cbd5e1',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExistingImage(idx);
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

                    {newImagePreviewUrls.map((url, idx) => (
                      <div key={`new-${idx}`} style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={url}
                          alt={`Ảnh mẫu mới ${idx + 1}`}
                          style={{
                            width: '76px',
                            height: '76px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '2px solid #cbd5e1',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNewImage(idx);
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
                    {totalImageCount < MAX_IMAGES && (
                      <div
                        onClick={triggerFileInput}
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '10px',
                          border: '2px dashed #cbd5e1',
                          background: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 800,
                          gap: '2px',
                        }}
                        title="Bấm để chọn thêm ảnh"
                      >
                        <Upload size={18} color="#64748b" />
                        <span>+ Thêm</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Upload Zone — chỉ 1 video/yêu cầu */}
              <div className="form-group">
                <label className="form-label">Video sản phẩm / mẫu thực tế (không bắt buộc)</label>
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoFileChange}
                  accept="video/*"
                  style={{ display: 'none' }}
                />

                {existingVideoUrl || newVideoPreviewUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '4px' }}>
                    <video
                      src={newVideoPreviewUrl || existingVideoUrl || undefined}
                      controls
                      style={{ width: '100%', maxHeight: '180px', borderRadius: '10px', background: '#000', border: '2px solid #b45309' }}
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                      title="Xóa video này"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="upload-dropzone"
                    onClick={triggerVideoInput}
                    style={{
                      minHeight: '90px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      padding: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={24} color="#64748b" />
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginTop: '4px' }}>
                      Bấm để chọn 1 video
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      (Tối đa {MAX_VIDEO_SIZE_MB}MB | MP4, MOV, WEBM)
                    </span>
                  </div>
                )}
              </div>

              {/* Operational Notice Banner */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                <strong>Lưu ý nghiệp vụ:</strong> Yêu cầu BÁO GIÁ phải có đầy đủ mô tả, ảnh mẫu và chất liệu. Thời gian xử lý từ 1-4 giờ.
              </div>

              {/* Process Confirmation Checkbox */}
              <label style={{ fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={understandProcess}
                  onChange={(e) => setUnderstandProcess(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#475569', cursor: 'pointer' }}
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
                background: '#e2e8f0',
                color: '#0f172a',
                border: '1px solid #94a3b8',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none',
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
