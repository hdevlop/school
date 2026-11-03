import { getStaffAvatar } from '@/features/Staff/utils/staffAvatar';

const STAFF_ROLES: Record<string, string> = {
  accounting: 'accountant',
  floor_manager: 'floorManager',
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  admin: 'users.roles.admin',
  accounting: 'staff.roles.accountant',
  floor_manager: 'staff.roles.floorManager',
};

/** The catalog key naming an account's role, for an account with no staff record to name it. */
export const accountRoleLabelKey = (role: string) => ROLE_LABEL_KEYS[role] ?? `staff.roles.${role}`;

/** The same bundled portraits the people cards use. */
export function accountAvatar(role?: string | null, gender?: string | null) {
  if (role === 'admin') return '/images/admin.png';
  const suffix = gender === 'F' ? 'female' : 'male';
  if (role === 'parent' || role === 'student') return `/images/${role}_${suffix}.png`;
  return getStaffAvatar(STAFF_ROLES[role ?? ''] ?? role, gender) ?? `/images/teacher_${suffix}.png`;
}
