import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ImagePlus, KeyRound, Pencil, User as UserIcon, X } from 'lucide-react';
import type { User } from '../types';
import { useProfile } from '../hooks/useProfile';
import { MAX_NAME_LENGTH, PROFILE_TEXT } from '../constants/profile';
import { ROLE_LABEL } from '../constants/staffLabels';
import { TEAM_NONE_LABEL } from '../constants/team';
import { UserAvatar } from './UserAvatar';
import { LoadingOverlay } from './LoadingOverlay';
import { Toast } from './Toast';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  modalCloseIconBtnCls,
  btnInspPrimaryCls,
  btnSecondaryCls,
  fieldInputCls,
  fieldLabelCls,
  fieldIconCls,
  fieldErrorCls,
  formGroupCls,
  profileSectionCls,
  profileSectionTitleCls,
  profileInfoRowCls,
} from '../styles/classNames';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void | Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUserUpdate, onLogout }) => {
  const {
    profile, loading, loadError, saving, savingMessage, toastMessage, clearToast,
    nameError, clearNameError, avatarError, clearAvatarError, passwordError, updateName, uploadAvatar, changePassword,
  } = useProfile({ isOpen, user, onUserUpdate, onLogout });

  // null = chưa sửa (ô hiện tên đang có); chuỗi = bản nháp đang gõ
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Ảnh xem trước dựng từ blob URL của tệp đang chọn — thu hồi khi đổi tệp / đóng modal
  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!isOpen) return null;

  // Hồ sơ mới tải về ưu tiên hơn bản user lưu lúc đăng nhập (team/ngày tạo có thể đã cũ hoặc chưa có)
  const shown = profile ?? user;
  const teamLabel = profile
    ? (profile.team?.name ?? TEAM_NONE_LABEL)
    : loading
      ? PROFILE_TEXT.loadingValue
      : (user.team?.name ?? PROFILE_TEXT.emptyValue);
  const createdAt = shown.createdAt ? new Date(shown.createdAt).toLocaleDateString('vi-VN') : (loading ? PROFILE_TEXT.loadingValue : PROFILE_TEXT.emptyValue);

  const currentName = shown.name;
  const nameValue = nameDraft ?? currentName;
  const nameChanged = nameValue.trim() !== currentName;

  const handleChangeName = (e: React.FormEvent) => {
    e.preventDefault();
    updateName(nameValue).then((ok) => {
      if (ok) setNameDraft(null);
    });
  };

  const handleChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    clearAvatarError();
    setAvatarFile(file);
    // Cho phép chọn lại đúng tệp vừa chọn sau khi bỏ/đổi
    e.target.value = '';
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    const ok = await uploadAvatar(avatarFile);
    if (ok) setAvatarFile(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    changePassword(currentPassword, newPassword, confirmPassword);
  };

  return (
    <>
      <div className={modalBackdropCls} onClick={onClose}>
        <div className={clsx(modalCardCls, '!max-w-[480px]')} onClick={(e) => e.stopPropagation()}>
          <div className={modalHeaderCls}>
            <h3 className="m-0 text-[19px] font-extrabold flex items-center gap-[8px]">
              <UserIcon size={18} color="#2563eb" /> {PROFILE_TEXT.title}
            </h3>
            <button type="button" className={modalCloseIconBtnCls} onClick={onClose} title={PROFILE_TEXT.close}><X size={18} /></button>
          </div>

          <div className={clsx(modalBodyCls, '!gap-[14px] text-[16px]')}>
            {/* Thông tin tài khoản */}
            <section className={profileSectionCls}>
              <h4 className={profileSectionTitleCls}>{PROFILE_TEXT.infoTitle}</h4>
              {loadError && <div className={fieldErrorCls}>{loadError}</div>}
              <div className="text-center py-[6px] px-0">
                <UserAvatar
                  src={shown.avatar}
                  name={shown.name}
                  size={56}
                  background="linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)"
                  className="mx-auto mb-[8px]"
                />
                <strong className="text-[19px] text-[#0f172a]">{shown.name}</strong>
                <p className="mt-[2px] mr-0 mb-0 ml-0 text-muted text-[15px]">{shown.email}</p>
              </div>
              <div className="flex flex-col gap-[8px]">
                <div className={profileInfoRowCls}>
                  <span className="text-muted">{PROFILE_TEXT.labelRole}:</span>
                  <span className="font-extrabold text-[#0f172a]">{ROLE_LABEL[shown.role] || shown.role}</span>
                </div>
                <div className={profileInfoRowCls}>
                  <span className="text-muted">{PROFILE_TEXT.labelTeam}:</span>
                  <span className="font-bold">{teamLabel}</span>
                </div>
                <div className={profileInfoRowCls}>
                  <span className="text-muted">{PROFILE_TEXT.labelId}:</span>
                  <span className="font-bold font-mono [word-break:break-all] text-right">{shown.id}</span>
                </div>
                <div className={profileInfoRowCls}>
                  <span className="text-muted">{PROFILE_TEXT.labelCreatedAt}:</span>
                  <span className="font-bold">{createdAt}</span>
                </div>
              </div>
            </section>

            {/* Họ và tên */}
            <section className={profileSectionCls}>
              <h4 className={profileSectionTitleCls}>
                <Pencil size={16} color="#2563eb" /> {PROFILE_TEXT.nameTitle}
              </h4>
              <form onSubmit={handleChangeName} className="flex flex-col gap-[12px]">
                <div className={formGroupCls}>
                  <label className={fieldLabelCls} htmlFor="profile-name">{PROFILE_TEXT.labelName}</label>
                  <div className="relative flex items-center">
                    <UserIcon size={16} className={fieldIconCls} />
                    <input
                      id="profile-name"
                      type="text"
                      autoComplete="name"
                      maxLength={MAX_NAME_LENGTH}
                      placeholder={PROFILE_TEXT.namePlaceholder}
                      value={nameValue}
                      onChange={(e) => { clearNameError(); setNameDraft(e.target.value); }}
                      className={fieldInputCls}
                    />
                  </div>
                </div>
                {nameError && <div className={fieldErrorCls}>{nameError}</div>}
                <button
                  type="submit"
                  disabled={saving || !nameChanged}
                  className={clsx(btnInspPrimaryCls, '!w-auto !py-[8px] !px-[20px] self-start disabled:opacity-60 disabled:cursor-default')}
                >
                  {PROFILE_TEXT.saveName}
                </button>
              </form>
            </section>

            {/* Ảnh đại diện */}
            <section className={profileSectionCls}>
              <h4 className={profileSectionTitleCls}>
                <ImagePlus size={16} color="#2563eb" /> {PROFILE_TEXT.avatarTitle}
              </h4>
              <div className="flex items-center gap-[14px]">
                <UserAvatar
                  src={previewUrl ?? shown.avatar}
                  name={shown.name}
                  size={56}
                  background="linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)"
                />
                <div className="flex flex-col gap-[8px] min-w-0">
                  <div className="flex gap-[8px] flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChooseFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={clsx(btnSecondaryCls, 'cursor-pointer')}
                    >
                      {PROFILE_TEXT.chooseAvatar}
                    </button>
                    {avatarFile && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleUploadAvatar}
                        className={clsx(btnInspPrimaryCls, '!w-auto !py-[8px] !px-[14px] disabled:opacity-60 disabled:cursor-default')}
                      >
                        {PROFILE_TEXT.saveAvatar}
                      </button>
                    )}
                  </div>
                  {avatarFile && <span className="text-[14px] text-muted [word-break:break-all]">{avatarFile.name}</span>}
                </div>
              </div>
              <span className="text-[14px] text-faint">{PROFILE_TEXT.avatarHint}</span>
              {avatarError && <div className={fieldErrorCls}>{avatarError}</div>}
            </section>

            {/* Đổi mật khẩu */}
            <section className={profileSectionCls}>
              <h4 className={profileSectionTitleCls}>
                <KeyRound size={16} color="#2563eb" /> {PROFILE_TEXT.passwordTitle}
              </h4>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-[12px]">
                <div className={formGroupCls}>
                  <label className={fieldLabelCls} htmlFor="profile-current-password">{PROFILE_TEXT.labelCurrentPassword}</label>
                  <div className="relative flex items-center">
                    <KeyRound size={16} className={fieldIconCls} />
                    <input
                      id="profile-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={fieldInputCls}
                    />
                  </div>
                </div>
                <div className={formGroupCls}>
                  <label className={fieldLabelCls} htmlFor="profile-new-password">{PROFILE_TEXT.labelNewPassword}</label>
                  <div className="relative flex items-center">
                    <KeyRound size={16} className={fieldIconCls} />
                    <input
                      id="profile-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={fieldInputCls}
                    />
                  </div>
                </div>
                <div className={formGroupCls}>
                  <label className={fieldLabelCls} htmlFor="profile-confirm-password">{PROFILE_TEXT.labelConfirmPassword}</label>
                  <div className="relative flex items-center">
                    <KeyRound size={16} className={fieldIconCls} />
                    <input
                      id="profile-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={fieldInputCls}
                    />
                  </div>
                </div>
                {passwordError && <div className={fieldErrorCls}>{passwordError}</div>}
                <span className="text-[14px] text-faint">{PROFILE_TEXT.passwordHint}</span>
                <button
                  type="submit"
                  disabled={saving}
                  className={clsx(btnInspPrimaryCls, '!w-auto !py-[8px] !px-[20px] self-start disabled:opacity-60 disabled:cursor-default')}
                >
                  {PROFILE_TEXT.savePassword}
                </button>
              </form>
            </section>
          </div>

          <div className={modalFooterCls}>
            <button type="button" className={clsx(btnInspPrimaryCls, '!w-auto !py-[8px] !px-[20px]')} onClick={onClose}>
              {PROFILE_TEXT.close}
            </button>
          </div>
        </div>
      </div>

      {saving && <LoadingOverlay message={savingMessage} />}
      {toastMessage && <Toast message={toastMessage} onClose={clearToast} />}
    </>
  );
};
