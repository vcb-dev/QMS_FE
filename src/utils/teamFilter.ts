import type { StaffUser } from '../types';
import { TEAM_FILTER_ALL, TEAM_FILTER_NONE } from '../constants/team';

// Bộ lọc team ở FE cho danh sách tài khoản (StaffPage tải toàn bộ danh sách rồi lọc tại chỗ):
// ALL -> tất cả; NONE -> người chưa có team; còn lại -> đúng team có id đó.
export function matchesTeamFilter(user: StaffUser, teamFilter: string): boolean {
  if (teamFilter === TEAM_FILTER_ALL) return true;
  if (teamFilter === TEAM_FILTER_NONE) return !user.team;
  return user.team?.id === teamFilter;
}
