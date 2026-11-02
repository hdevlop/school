import { INACTIVE_ROW_CLASS } from '@/shared/inactiveRow';

export const ACCOUNT_LINK_KINDS = ['student', 'parent', 'staff'] as const;
export type AccountLinkKind = (typeof ACCOUNT_LINK_KINDS)[number];

/** `null`: no person behind the login. `undefined`: not known, because the links did not load. */
export type LinkedAccount = { id: string; email?: string | null; phone?: string | null; linkedTo?: AccountLinkKind | null };

export const LINKED_TO_FILTER_VALUES = ['__all__', ...ACCOUNT_LINK_KINDS, 'none'] as const;
export type LinkedToFilter = (typeof LINKED_TO_FILTER_VALUES)[number];

/** The administrator's login is the school's own, not a person's: it is never marked unlinked. */
const ADMIN_ROLE = 'admin';

export function withAccountLinks<T extends { id: string; role?: string | null }>(
  users: T[] | undefined,
  links: Map<string, AccountLinkKind> | undefined,
): (T & Pick<LinkedAccount, 'linkedTo'>)[] | undefined {
  if (!users || !links) return users;
  return users.map(user => ({ ...user, linkedTo: links.get(user.id) ?? (user.role === ADMIN_ROLE ? undefined : null) }));
}

export function matchesLinkedTo(user: LinkedAccount, filter: LinkedToFilter) {
  if (filter === '__all__') return true;
  if (filter === 'none') return user.linkedTo === null;
  return user.linkedTo === filter;
}

/** A login with no person behind it looks like a student who left the school. */
export const getUserRowClassName = (user: LinkedAccount) => user.linkedTo === null ? INACTIVE_ROW_CLASS : undefined;

/** Most accounts sign in by phone and have no email, so one box searches both. */
export function matchesEmailOrPhone(user: LinkedAccount, search: unknown) {
  const needle = String(search ?? '').trim().toLowerCase();
  if (!needle) return true;
  return [user.email, user.phone].some(value => value?.toLowerCase().includes(needle));
}
