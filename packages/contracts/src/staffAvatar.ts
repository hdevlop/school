// Roles with dedicated illustrations in School's /public/images.
const ROLES_WITH_AVATAR = new Set([
  'teacher', 'driver', 'busAssistant', 'principal', 'secretary',
  'receptionist', 'accountant', 'librarian', 'itSupport', 'security',
  'assistant', 'monitor', 'supervisor', 'registrar', 'cleaner',
]);

export const getStaffAvatar = (role?: string | null, gender?: string | null) => {
  if (!role || !ROLES_WITH_AVATAR.has(role)) return undefined;
  const suffix = gender === 'F' ? 'female' : 'male';
  if (role === 'supervisor') return `/images/supervisor_${suffix}_v2.png`;
  return `/images/${role}_${suffix}.png`;
};

/** Bundled defaults are derived from the form, unlike an uploaded photo. */
export const isDefaultStaffAvatar = (image: unknown): image is string =>
  typeof image === 'string' && /^\/images\/[^/]+_(?:male|female)(?:_v2)?\.png$/.test(image.trim());
