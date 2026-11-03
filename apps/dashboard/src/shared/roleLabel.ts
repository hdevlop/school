/** Display names can change without renaming persisted role and permission keys. */
export function roleLabel(role: string | null | undefined, t: (key: string) => string): string {
  return role === 'floor_manager' || role === 'floorManager'
    ? t('staff.roles.floorManager')
    : role ?? '';
}
