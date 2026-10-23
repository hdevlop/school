/** Only these retired School permissions are migrated; unrelated grants stay intact. */
export const PERMISSION_ACTION_REPLACEMENTS: Record<string, readonly string[]> = {
  'publish:class-routines': ['update:class-routines'],
  'rollover:financial-operations': ['update:financial-operations'],
  'resolve:discipline': ['update:discipline'],
  'manage:attendance': [], // No route used this permission.
  'manage:staff-attendance': ['update:staff-attendance'],
  'manage:financial-operations': ['update:financial-operations'],
  'manage:class-routines': ['create:class-routines', 'update:class-routines', 'delete:class-routines'],
  'manage:participants': ['read:participants', 'create:participants', 'update:participants', 'delete:participants'],
};
