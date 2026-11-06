/** Display names can change without renaming persisted role and permission keys. */
export function roleLabel(role: string | null | undefined, t: (key: string) => string): string {
  return role === 'monitor'
    ? t('staff.roles.monitor')
    : role ?? '';
}
