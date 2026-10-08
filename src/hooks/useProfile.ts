import { useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import { fetchProfileApi, uploadAvatarApi, changePasswordApi, updateNameApi } from '../services/api';
import { MAX_AVATAR_BYTES, MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, PROFILE_TEXT, PROFILE_TOAST_MS } from '../constants/profile';

interface UseProfileArgs {
  isOpen: boolean;
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void | Promise<void>;
}

// State + gọi API + luồng nghiệp vụ của modal Hồ Sơ Cá Nhân: tải hồ sơ mỗi lần mở (team do admin
// đổi nên bản user lưu lúc đăng nhập có thể cũ), đổi họ tên, đổi ảnh đại diện, đổi mật khẩu.
export function useProfile({ isOpen, user, onUserUpdate, onLogout }: UseProfileArgs) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  // Đếm request để bỏ qua response trả về trễ (đóng/mở modal liên tục)
  const requestIdRef = useRef(0);
  // Chặn gửi lặp khi đang lưu: lớp phủ chỉ chặn chuột, Enter/Space ở ô đang focus vẫn gửi được.
  const savingRef = useRef(false);
  // Tên/ảnh vừa lưu — nếu GET hồ sơ về trễ (mang giá trị cũ) thì không được ghi đè giá trị mới.
  const savedOverridesRef = useRef<Partial<Pick<User, 'name' | 'avatar'>>>({});

  const beginSaving = (message: string): boolean => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSavingMessage(message);
    return true;
  };
  const endSaving = () => {
    savingRef.current = false;
    setSaving(false);
  };

  useEffect(() => {
    const myRequestId = ++requestIdRef.current;
    if (!isOpen) {
      savedOverridesRef.current = {};
      setProfile(null);
      setLoading(false);
      setLoadError(null);
      setNameError(null);
      setAvatarError(null);
      setPasswordError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchProfileApi()
      .then((data) => {
        if (myRequestId !== requestIdRef.current) return;
        setProfile({ ...data, ...savedOverridesRef.current });
      })
      .catch(() => {
        if (myRequestId === requestIdRef.current) setLoadError(PROFILE_TEXT.loadError);
      })
      .finally(() => {
        if (myRequestId === requestIdRef.current) setLoading(false);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), PROFILE_TOAST_MS);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const clearToast = () => setToastMessage(null);
  const clearNameError = () => setNameError(null);
  const clearAvatarError = () => setAvatarError(null);

  // Trả true khi đổi tên thành công — modal dùng để bỏ bản nháp đang gõ.
  const updateName = async (name: string): Promise<boolean> => {
    if (savingRef.current) return false;
    setNameError(null);
    const clean = name.trim();
    if (!clean) {
      setNameError(PROFILE_TEXT.errNameEmpty);
      return false;
    }
    if (clean.length > MAX_NAME_LENGTH) {
      setNameError(PROFILE_TEXT.errNameTooLong);
      return false;
    }
    if (!beginSaving(PROFILE_TEXT.updatingName)) return false;
    try {
      const { name: savedName } = await updateNameApi(clean);
      savedOverridesRef.current = { ...savedOverridesRef.current, name: savedName };
      onUserUpdate({ ...user, name: savedName });
      setProfile((prev) => (prev ? { ...prev, name: savedName } : prev));
      setToastMessage(PROFILE_TEXT.nameUpdated);
      return true;
    } catch (err: any) {
      alert(`${PROFILE_TEXT.alertNameFailed}: ${err.message}`);
      return false;
    } finally {
      endSaving();
    }
  };

  // Trả true khi tải lên thành công — modal dùng để bỏ ảnh đang chọn/xem trước.
  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (savingRef.current) return false;
    setAvatarError(null);
    if (!file.type.startsWith('image/')) {
      setAvatarError(PROFILE_TEXT.errAvatarNotImage);
      return false;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(PROFILE_TEXT.errAvatarTooLarge);
      return false;
    }
    if (!beginSaving(PROFILE_TEXT.uploadingAvatar)) return false;
    try {
      const { avatar } = await uploadAvatarApi(file);
      savedOverridesRef.current = { ...savedOverridesRef.current, avatar };
      onUserUpdate({ ...user, avatar });
      setProfile((prev) => (prev ? { ...prev, avatar } : prev));
      setToastMessage(PROFILE_TEXT.avatarUpdated);
      return true;
    } catch (err: any) {
      alert(`${PROFILE_TEXT.alertAvatarFailed}: ${err.message}`);
      return false;
    } finally {
      endSaving();
    }
  };

  const changePassword = async (current: string, next: string, confirm: string): Promise<void> => {
    if (savingRef.current) return;
    setPasswordError(null);
    if (!current) {
      setPasswordError(PROFILE_TEXT.errCurrentPasswordRequired);
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(PROFILE_TEXT.errPasswordTooShort);
      return;
    }
    if (next !== confirm) {
      setPasswordError(PROFILE_TEXT.errPasswordMismatch);
      return;
    }
    if (next === current) {
      setPasswordError(PROFILE_TEXT.errPasswordSame);
      return;
    }
    if (!beginSaving(PROFILE_TEXT.changingPassword)) return;
    try {
      await changePasswordApi(current, next);
    } catch (err: any) {
      endSaving();
      // 429: quá giới hạn 5 lần / 15 phút — BE trả chuỗi tiếng Anh của Nest nên đổi sang tiếng Việt
      const reason = err.status === 429 ? PROFILE_TEXT.errTooManyAttempts : err.message;
      alert(`${PROFILE_TEXT.alertPasswordFailed}: ${reason}`);
      return;
    }
    // BE đã thu hồi phiên refresh -> đăng xuất để đăng nhập lại bằng mật khẩu mới. KHÔNG nhả khóa
    // lưu ở nhánh này: modal sẽ bị gỡ khi đăng xuất (logoutApi nuốt lỗi nên không kẹt), còn nhả sớm
    // thì trong lúc chờ đăng xuất người dùng bấm Enter được lần nữa và gửi PATCH thứ hai.
    alert(PROFILE_TEXT.passwordChanged);
    await onLogout();
  };

  return {
    profile,
    loading,
    loadError,
    saving,
    savingMessage,
    toastMessage,
    clearToast,
    nameError,
    clearNameError,
    avatarError,
    clearAvatarError,
    passwordError,
    updateName,
    uploadAvatar,
    changePassword,
  };
}
