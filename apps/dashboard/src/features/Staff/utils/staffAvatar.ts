// Roles that have a dedicated role/gender illustration in /public/images.
// `other` (and `teacher`, managed elsewhere) intentionally fall back to initials.
const ROLES_WITH_AVATAR = new Set([
  'teacher',
  'driver',
  'busAssistant',
  'principal',
  'secretary',
  'receptionist',
  'accountant',
  'librarian',
  'itSupport',
  'security',
  'assistant',
  'cleaner',
]);

export const getStaffAvatar = (role?: string | null, gender?: string | null) => {
  if (!role || !ROLES_WITH_AVATAR.has(role)) return undefined;
  const suffix = gender === 'F' ? 'female' : 'male';
  return `/images/${role}_${suffix}.png`;
};
