import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import type { Customer, CreateModalProps } from '../types';
import { createCustomer, searchCustomers, fetchProvinces, fetchWards, fetchStones } from '../services/api';
import { X, Upload, PlusCircle } from 'lucide-react';
import { UI_CONSTANTS, CLOSE_RATE_OPTIONS } from '../constants';
import { CustomerSelectorSection } from './CustomerSelectorSection';

const emptyStoneNoticeCls = 'py-[16px] px-[8px] text-[12px] text-faint text-center';
const checkboxSmallCls = 'w-[15px] h-[15px] cursor-pointer accent-[#475569]';

// Chip "✓ tên" cho chất liệu/đá đã chọn — 2 chỗ trước đây tự viết lặp lại y hệt, chỉ khác điều
// kiện ẩn nút xóa (material dựa vào calculatorData.materials/materialType, stone dựa cả object).
const SelectedChip: React.FC<{ label: string; onRemove?: () => void; removeTitle?: string }> = ({ label, onRemove, removeTitle }) => (
  <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] py-[4px] px-[10px] rounded-[16px] text-[11.5px] font-bold inline-flex items-center gap-[6px]">
    ✓ {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="bg-transparent border-0 text-[#334155] cursor-pointer p-0 text-[12px] leading-[1] font-extrabold"
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedStoneTypes, setSelectedStoneTypes] = useState<('MAIN' | 'SIDE')[]>([]);
  const [stoneOptionsAll, setStoneOptionsAll] = useState<{ id: string; name: string; stoneType: 'MAIN' | 'SIDE' }[]>([]);
  const [selectedStoneIds, setSelectedStoneIds] = useState<string[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState('');
  const [leadTime, setLeadTime] = useState('7-15 NGÀY (Tiêu chuẩn)');
  const [closeRateValue, setCloseRateValue] = useState<string>(CLOSE_RATE_OPTIONS[0].value);
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
  const [understandProcess, setUnderstandProcess] = useState(false);

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
  const createdCustomerIdRef = useRef<string | null>(null);
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
    if (!isOpen) createdCustomerIdRef.current = null;
    
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
      const matched = CLOSE_RATE_OPTIONS.find((o) => o.pct === editingReq.closeRatePct);
      setCloseRateValue(matched?.value ?? CLOSE_RATE_OPTIONS[0].value);
      setUnderstandProcess(false);
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
          calculatorData.materials.forEach((mItem) => {
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
            .map((s) => s.stoneId || s.id)
            .filter((id): id is string => !!id);
          setSelectedStoneIds(stoneIds);
          const types = Array.from(
            new Set(
              stoneIds
                .map((id) => stoneOptionsAll.find((s) => s.id === id)?.stoneType)
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
      setCloseRateValue(CLOSE_RATE_OPTIONS[0].value);
      setUnderstandProcess(false);
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
          setCustomerList(
            Array.isArray(res)
              ? res.slice(0, UI_CONSTANTS.CREATE_QUOTE_REQUEST.CUSTOMER_DROPDOWN_LIMIT)
              : [],
          );
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
      // Dọn customer "Khách lẻ"/rác trùng cần chốt chặn DB phía BE — ngoài phạm vi FE.
      let finalCustomerId = createdCustomerIdRef.current || selectedCustomerId;

      if (isNewCustomerMode && !finalCustomerId) {
        const createdCust = await createCustomer({
          name: newCustomerName.trim() || 'Khách lẻ',
          phone: newCustomerPhone.trim() || undefined,
          provinceId: newCustomerProvince || undefined,
          wardId: newCustomerWard || undefined,
          address: newCustomerAddress.trim() || undefined,
        });

        createdCustomerIdRef.current = createdCust.id;
        finalCustomerId = createdCust.id;
        setSelectedCustomerId(createdCust.id);
        setCustomerList((prev) => [createdCust, ...prev]);
        setIsNewCustomerMode(false);
      } else if (!finalCustomerId && customerSearch.trim()) {
        // Có gõ tên nhưng không chọn khách có sẵn trong danh sách → coi như khách mới, tạo bản ghi.
        const createdCust = await createCustomer({ name: customerSearch.trim() });
        createdCustomerIdRef.current = createdCust.id;
        finalCustomerId = createdCust.id;
        setSelectedCustomerId(createdCust.id);
        setCustomerList((prev) => [createdCust, ...prev]);
        setIsNewCustomerMode(false);
      }
      const closeRatePct = CLOSE_RATE_OPTIONS.find((o) => o.value === closeRateValue)?.pct ?? null;

      await onSubmit({
        customerId: finalCustomerId,
        categoryId: selectedCategoryId === 'OTHER' ? (categories[0]?.id || '') : selectedCategoryId,
        newCategoryName: selectedCategoryId === 'OTHER' ? newCategoryName.trim() : undefined,
        materialIds: selectedMaterialIds,
        stoneIds: selectedStoneIds.length > 0 ? selectedStoneIds : undefined,
        customerMeasurements,
        desiredLeadTime: leadTime,
        ...(closeRatePct != null ? { closeRatePct } : {}),
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
      <div className="modal-card max-w-[920px] rounded-[20px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header matching design */}
        <div className="shrink-0 bg-surface text-[#0f172a] py-[18px] px-[24px] flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-[14px]">
            <img
              src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
              alt="Viễn Chí Bảo"
              className="h-[32px] object-contain"
            />
            <div>
              <h2 id="modalCreateTitle" className="text-[18px] font-extrabold m-0 text-[#0f172a]">
                Tạo Yêu Cầu Báo Giá Chế Tác Mới
              </h2>
              <p className="text-[12px] text-muted mt-[2px] mr-0 mb-0 ml-0">
                Điền đầy đủ các trường thông tin chuẩn nghiệp vụ VCB để chuyển bộ phận Định Giá
              </p>
            </div>
          </div>

          <button onClick={onClose} className="bg-transparent border-0 text-muted cursor-pointer flex items-center">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden m-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-[20px]">
            {/* 2-Column Grid Layout matching screenshot */}
            <div className="modal-grid-2col">
            
            {/* Left Card: THÔNG TIN ĐƠN HÀNG */}
            <div className="bg-surface border border-border rounded-[16px] p-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-[16px]">
              <h3 className="text-[13px] font-extrabold text-[#334155] m-0 uppercase tracking-[0.5px]">
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

              {/* Sale Name */}
              <div className="form-group">
                <label className="form-label">Người hỏi giá (Sale) <span className="req">*</span></label>
                <input type="text" className="form-control bg-[#f1f5f9]" value={saleName} readOnly />
              </div>

              {/* Danh Mục Sản Phẩm - DB Loaded */}
              <div className="form-group">
                <label className="form-label">Danh mục sản phẩm <span className="req">*</span></label>
                <select
                  className={clsx(
                    'form-control w-full',
                    calculatorData?.categoryId ? 'opacity-75 cursor-not-allowed' : 'opacity-100 cursor-pointer'
                  )}
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={!!calculatorData?.categoryId}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="OTHER">Khác (Tạo danh mục mới)</option>
                </select>

                {selectedCategoryId === 'OTHER' && (
                  <div className="mt-[8px]">
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
                <div ref={materialDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMaterialDropdownOpen((prev) => !prev)}
                    disabled={!!(calculatorData?.materials?.length || calculatorData?.materialType)}
                    className={clsx(
                      'form-control w-full text-left font-bold bg-surface',
                      (calculatorData?.materials?.length || calculatorData?.materialType) ? 'opacity-75 cursor-not-allowed' : 'opacity-100 cursor-pointer'
                    )}
                  >
                    {selectedMaterialIds.length > 0
                      ? `Đã chọn ${selectedMaterialIds.length} chất liệu`
                      : '-- Chọn chất liệu chế tác... --'}
                  </button>

                  {materialDropdownOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-20 bg-surface border border-[#cbd5e1] rounded-[8px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] max-h-[220px] overflow-y-auto p-[6px]"
                    >
                      {materials.length === 0 && (
                        <div className="p-[8px] text-[12px] text-faint">Chưa có chất liệu nào</div>
                      )}
                      {materials.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-[8px] py-[7px] px-[8px] rounded-[6px] text-[13px] font-semibold text-[#334155] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(m.id)}
                            onChange={() => toggleMaterialId(m.id)}
                            className={checkboxSmallCls}
                          />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Material Badges with Remove (✕) Button */}
                {selectedMaterialIds.length > 0 && (
                  <div className="flex flex-wrap gap-[6px] mt-[8px]">
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
                <div ref={stoneDropdownRef} className="relative">
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
                    className={clsx(
                      'form-control w-full text-left font-bold bg-surface',
                      calculatorData ? 'opacity-75 cursor-not-allowed' : 'opacity-100 cursor-pointer'
                    )}
                  >
                    {selectedStoneIds.length > 0
                      ? `Đã chọn ${selectedStoneIds.length} đá`
                      : '-- Chọn đá (không bắt buộc)... --'}
                  </button>

                  {stoneDropdownOpen && !calculatorData && createPortal(
                    <div
                      ref={stoneDropdownMenuRef}
                      className="fixed z-[9999] bg-surface border border-[#cbd5e1] rounded-[10px] shadow-[0_10px_24px_rgba(0,0,0,0.14)] overflow-hidden flex flex-col"
                      // động — giữ inline
                      style={{
                        top: stoneDropdownPos.top,
                        left: stoneDropdownPos.left,
                        width: stoneDropdownPos.width,
                        maxHeight: stoneDropdownPos.maxHeight,
                      }}
                    >
                      {/* Bộ lọc loại đá dạng segmented control — chỉ 1 loại hiển thị tại 1 thời điểm */}
                      <div className="flex gap-[6px] pt-[10px] px-[10px] pb-[8px] border-b border-border bg-[#f8fafc]">
                        {(['MAIN', 'SIDE'] as const).map((t) => {
                          const active = selectedStoneTypes.includes(t);
                          const count = stoneOptionsAll.filter((s) => s.stoneType === t).length;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleStoneType(t)}
                              className={clsx(
                                'flex-1 flex items-center justify-center gap-[6px] py-[7px] px-[10px] rounded-[7px] text-[13px] font-bold cursor-pointer transition-[background_0.12s,color_0.12s]',
                                active ? 'border border-[#0f172a] bg-[#e2e8f0] text-[#0f172a]' : 'border border-border bg-surface text-[#475569]'
                              )}
                            >
                              {t === 'MAIN' ? 'Đá chủ' : 'Đá tấm'}
                              <span
                                className={clsx(
                                  'text-[11px] font-bold py-[1px] px-[6px] rounded-full',
                                  active ? 'bg-[#cbd5e1] text-[#0f172a]' : 'bg-[#e2e8f0] text-muted'
                                )}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedStoneTypes.length > 0 && (
                        <div className="py-[8px] px-[10px] border-b border-border">
                          <input
                            type="text"
                            value={stoneSearchQuery}
                            onChange={(e) => setStoneSearchQuery(e.target.value)}
                            placeholder="Tìm tên đá..."
                            className="w-full py-[7px] px-[10px] text-[13px] border border-[#cbd5e1] rounded-[6px] outline-none"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-h-0 overflow-y-auto p-[6px]">
                        {selectedStoneTypes.length === 0 && (
                          <div className={emptyStoneNoticeCls}>
                            Chọn "Đá chủ" hoặc "Đá tấm" ở trên để xem danh sách đá
                          </div>
                        )}
                        {selectedStoneTypes.length > 0 && filteredStoneOptions.length === 0 && (
                          <div className={emptyStoneNoticeCls}>Chưa có đá nào thuộc loại này</div>
                        )}
                        {selectedStoneTypes.length > 0 && filteredStoneOptions.length > 0 && visibleStoneOptions.length === 0 && (
                          <div className={emptyStoneNoticeCls}>Không tìm thấy đá phù hợp</div>
                        )}
                        {visibleStoneOptions.length > 0 && (
                          <label
                            className="flex items-center gap-[8px] py-[7px] px-[8px] rounded-[6px] text-[12px] font-bold text-[#334155] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={allVisibleStoneSelected}
                              onChange={toggleSelectAllVisibleStones}
                              className={checkboxSmallCls}
                            />
                            {allVisibleStoneSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${visibleStoneOptions.length})`}
                          </label>
                        )}
                        {visibleStoneOptions.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-[8px] py-[7px] px-[8px] rounded-[6px] text-[13px] font-semibold text-[#334155] cursor-pointer"
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStoneIds.includes(s.id)}
                              onChange={() => toggleStoneId(s.id)}
                              className={checkboxSmallCls}
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
                  <div className="flex flex-wrap gap-[6px] mt-[8px]">
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
            <div className="bg-surface border border-border rounded-[16px] p-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-[16px]">
              <h3 className="text-[13px] font-extrabold text-[#334155] m-0 uppercase tracking-[0.5px]">
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

              <div className="grid grid-cols-[1fr_1fr] gap-[12px]">
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
                  <select className="form-control" value={closeRateValue} onChange={(e) => setCloseRateValue(e.target.value)}>
                    {CLOSE_RATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiple Images Upload Zone */}
              <div className="form-group flex-1">
                <label className="form-label">
                  Ảnh sản phẩm / mẫu thực tế ({totalImageCount}/{MAX_IMAGES} ảnh)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div
                  className={clsx(
                    'upload-dropzone min-h-[130px] flex flex-col items-center justify-center border-2 border-dashed border-[#cbd5e1] rounded-[12px] p-[16px] text-center transition-[border-color_0.2s]',
                    totalImageCount >= MAX_IMAGES
                      ? 'bg-[#f1f5f9] cursor-not-allowed opacity-70'
                      : 'bg-[#f8fafc] cursor-pointer opacity-100'
                  )}
                  onClick={() => {
                    if (totalImageCount >= MAX_IMAGES) {
                      alert(`Hệ thống giới hạn tối đa ${MAX_IMAGES} ảnh/yêu cầu!`);
                      return;
                    }
                    triggerFileInput();
                  }}
                >
                  <div className="mb-[6px]">
                    <Upload size={30} color="#64748b" />
                  </div>
                  <div className="font-bold text-[13px] text-[#0f172a] mb-[2px]">
                    {totalImageCount >= MAX_IMAGES
                      ? `✓ Đã đạt tối đa ${MAX_IMAGES} ảnh mẫu`
                      : totalImageCount > 0
                      ? `✓ Đã chọn ${totalImageCount}/${MAX_IMAGES} ảnh (Bấm để chọn thêm)`
                      : 'Kéo thả hoặc bấm để chọn 1 hoặc nhiều ảnh'}
                  </div>
                  <span className="text-[11px] text-muted">
                    (Giới hạn tối đa {MAX_IMAGES} ảnh mẫu/yêu cầu | Hỗ trợ PNG, JPG, WEBP)
                  </span>
                </div>

                {/* Uploaded Images Thumbnail Grid — gộp ảnh cũ (existingImageUrls, URL thật) và
                    ảnh mới vừa chọn (newImagePreviewUrls, object URL tạm để preview) thành 1 lưới,
                    mỗi loại xóa qua đúng setter của nó. */}
                {totalImageCount > 0 && (
                  <div className="flex flex-wrap gap-[10px] mt-[12px]">
                    {existingImageUrls.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative inline-block">
                        <img
                          src={url}
                          alt={`Ảnh mẫu ${idx + 1}`}
                          className="w-[76px] h-[76px] rounded-[10px] object-cover border-2 border-[#cbd5e1] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExistingImage(idx);
                          }}
                          className="absolute -top-[6px] -right-[6px] bg-[#ef4444] text-surface border-0 rounded-full w-[20px] h-[20px] text-[11px] font-extrabold cursor-pointer flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                          title="Xóa ảnh này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {newImagePreviewUrls.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative inline-block">
                        <img
                          src={url}
                          alt={`Ảnh mẫu mới ${idx + 1}`}
                          className="w-[76px] h-[76px] rounded-[10px] object-cover border-2 border-[#cbd5e1] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNewImage(idx);
                          }}
                          className="absolute -top-[6px] -right-[6px] bg-[#ef4444] text-surface border-0 rounded-full w-[20px] h-[20px] text-[11px] font-extrabold cursor-pointer flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
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
                        className="w-[76px] h-[76px] rounded-[10px] border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] flex flex-col items-center justify-center cursor-pointer text-[#475569] text-[11px] font-extrabold gap-[2px]"
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
                  className="hidden"
                />

                {existingVideoUrl || newVideoPreviewUrl ? (
                  <div className="relative inline-block mt-[4px]">
                    <video
                      src={newVideoPreviewUrl || existingVideoUrl || undefined}
                      controls
                      className="w-full max-h-[180px] rounded-[10px] bg-[#000] border-2 border-[#b45309]"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute -top-[6px] -right-[6px] bg-[#ef4444] text-surface border-0 rounded-full w-[22px] h-[22px] text-[12px] font-extrabold cursor-pointer flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                      title="Xóa video này"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="upload-dropzone min-h-[90px] flex flex-col items-center justify-center border-2 border-dashed border-[#cbd5e1] rounded-[12px] bg-[#f8fafc] cursor-pointer p-[14px] text-center"
                    onClick={triggerVideoInput}
                  >
                    <Upload size={24} color="#64748b" />
                    <div className="font-bold text-[13px] text-[#0f172a] mt-[4px]">
                      Bấm để chọn 1 video
                    </div>
                    <span className="text-[11px] text-muted">
                      (Tối đa {MAX_VIDEO_SIZE_MB}MB | MP4, MOV, WEBM)
                    </span>
                  </div>
                )}
              </div>

              {/* Operational Notice Banner */}
              <div className="bg-[#f8fafc] border border-border rounded-[10px] p-[14px] text-[12.5px] text-[#475569] leading-[1.5]">
                <strong>Lưu ý nghiệp vụ:</strong> Yêu cầu BÁO GIÁ phải có đầy đủ mô tả, ảnh mẫu và chất liệu. Thời gian xử lý từ 1-4 giờ.
              </div>

              {/* Process Confirmation Checkbox */}
              <label className="font-bold cursor-pointer flex items-center gap-[8px] text-[13px] text-[#334155]">
                <input
                  type="checkbox"
                  checked={understandProcess}
                  onChange={(e) => setUnderstandProcess(e.target.checked)}
                  className="w-[16px] h-[16px] accent-[#475569] cursor-pointer"
                />
                Tôi đã nắm rõ quy trình
              </label>

            </div>
          </div>
          </div>
          {/* End Scrollable Body */}

          {/* Fixed Footer Bar for Submit & Cancel Buttons */}
          <div className="shrink-0 bg-surface border-t border-[#cbd5e1] py-[14px] px-[24px] flex items-center justify-end gap-[12px] shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#f1f5f9] border border-[#cbd5e1] rounded-[10px] py-[11px] px-[22px] text-[13.5px] font-bold text-[#475569] cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                'bg-[#e2e8f0] text-[#0f172a] border border-[#94a3b8] rounded-[10px] py-[12px] px-[28px] text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-[8px] shadow-none',
                submitting ? 'opacity-70' : 'opacity-100'
              )}
            >
              <PlusCircle size={18} /> {editingReq ? 'Cập Nhật Yêu Cầu' : 'Gửi Yêu Cầu Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
