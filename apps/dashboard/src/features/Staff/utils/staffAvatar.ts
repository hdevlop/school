// Roles that have a dedicated role/gender illustration in /public/images.
// `other` and custom roles without illustrations fall back to initials.
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
  'floorManager',
  'supervisor',
  'registrar',
  'cleaner',
]);

export const getStaffAvatar = (role?: string | null, gender?: string | null) => {
  if (!role || !ROLES_WITH_AVATAR.has(role)) return undefined;
  const suffix = gender === 'F' ? 'female' : 'male';
  if (role === 'supervisor') return `/images/supervisor_${suffix}_v2.png`;
  return `/images/${role}_${suffix}.png`;
};
