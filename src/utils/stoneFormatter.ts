import type { Role } from '../types';

interface StoneInput {
  name?: string;
  cut?: string;
  size?: string;
  price?: number;
}

export function formatStoneDisplay(stone: StoneInput, role?: Role | null): string {
  const parts = [stone.name];
  if (stone.cut) parts.push(stone.cut);
  if (stone.size) parts.push(stone.size);

  const baseText = parts.filter(Boolean).join(' - ');

  if ((role === 'ADMIN' || role === 'ORDER') && stone.price !== undefined) {
    return `${baseText} - ${new Intl.NumberFormat('vi-VN').format(stone.price)}đ`;
  }

  return baseText;
}
