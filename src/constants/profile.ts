// Giới hạn kiểm tra phía client cho modal Hồ Sơ Cá Nhân — khớp BE (ChangePasswordDto.newPassword
// MinLength 6; APP_CONSTANTS.MAX_FILE_SIZE = 10MB cho ảnh đại diện).
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
// Khớp BE (UpdateNameDto @MaxLength(100))
export const MAX_NAME_LENGTH = 100;

// Thời gian toast tự ẩn (ms) — cùng nhịp với toast ở useQuoteRequests
export const PROFILE_TOAST_MS = 3500;

// Chữ hiển thị của modal Hồ Sơ Cá Nhân (tiêu đề khối, nhãn, thông báo) — không rải trong JSX.
export const PROFILE_TEXT = {
  title: 'Hồ Sơ Cá Nhân',
  infoTitle: 'Thông tin tài khoản',
  nameTitle: 'Họ và tên',
  avatarTitle: 'Ảnh đại diện',
  passwordTitle: 'Đổi mật khẩu',
  labelRole: 'Vai trò',
  labelTeam: 'Team',
  labelId: 'Mã tài khoản',
  labelCreatedAt: 'Ngày tạo tài khoản',
  labelCurrentPassword: 'Mật khẩu hiện tại',
  labelNewPassword: 'Mật khẩu mới',
  labelConfirmPassword: 'Xác nhận mật khẩu mới',
  labelName: 'Họ và tên hiển thị',
  namePlaceholder: 'Nhập họ và tên...',
  saveName: 'Cập nhật tên',
  chooseAvatar: 'Chọn ảnh',
  saveAvatar: 'Cập nhật ảnh',
  savePassword: 'Đổi mật khẩu',
  close: 'Đóng',
  loadingValue: 'Đang tải...',
  emptyValue: '---',
  loadError: 'Không thể tải thông tin tài khoản',
  avatarHint: 'Định dạng ảnh, tối đa 10MB.',
  passwordHint: 'Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất để đăng nhập lại.',
  uploadingAvatar: 'Đang tải ảnh lên...',
  updatingName: 'Đang cập nhật tên...',
  changingPassword: 'Đang đổi mật khẩu...',
  avatarUpdated: 'Đã cập nhật ảnh đại diện',
  nameUpdated: 'Đã cập nhật họ và tên',
  passwordChanged: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
  errNameEmpty: 'Họ tên không được để trống',
  errNameTooLong: `Họ tên tối đa ${MAX_NAME_LENGTH} ký tự`,
  errAvatarNotImage: 'Vui lòng chọn một tệp ảnh',
  errAvatarTooLarge: 'Ảnh quá lớn, tối đa 10MB',
  errTooManyAttempts: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  errCurrentPasswordRequired: 'Vui lòng nhập mật khẩu hiện tại',
  errPasswordTooShort: `Mật khẩu mới phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên`,
  errPasswordMismatch: 'Mật khẩu xác nhận không khớp',
  errPasswordSame: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  alertAvatarFailed: 'Không thể cập nhật ảnh đại diện',
  alertNameFailed: 'Không thể đổi tên',
  alertPasswordFailed: 'Không thể đổi mật khẩu',
} as const;
