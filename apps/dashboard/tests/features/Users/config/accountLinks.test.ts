import { describe, expect, it } from 'bun:test';

import {
  getUserRowClassName,
  matchesEmailOrPhone,
  matchesLinkedTo,
  withAccountLinks,
  type AccountLinkKind,
} from '@/features/Users/config/accountLinks';
import { buildLinkedToOptions } from '@/features/Users/config/userOptions';
import { INACTIVE_ROW_CLASS } from '@/shared/inactiveRow';

const accounts = [
  { id: 'student-login', email: null, phone: '0612345678' },
  { id: 'parent-login', email: 'Parent@Gmx.com', phone: null },
  { id: 'unlinked-login', email: 'lina@school.test', phone: null },
];
const links = new Map<string, AccountLinkKind>([['student-login', 'student'], ['parent-login', 'parent']]);

describe('account links on the Users screen', () => {
  it('marks a login with no person behind it, and only once the links are known', () => {
    const linked = withAccountLinks(accounts, links)!;
    expect(linked.map(({ linkedTo }) => linkedTo)).toEqual(['student', 'parent', null]);
    expect(withAccountLinks(accounts, undefined)).toBe(accounts);
  });

  it('never marks the administrator\'s own login, which belongs to no person by design', () => {
    const [admin] = withAccountLinks([{ id: 'admin-login', role: 'admin', email: 'admin@admin.com', phone: null }], links)!;
    expect(admin.linkedTo).toBeUndefined();
    expect(getUserRowClassName(admin)).toBeUndefined();
    expect(matchesLinkedTo(admin, 'none')).toBe(false);
    expect(matchesLinkedTo(admin, '__all__')).toBe(true);
  });

  it('greys out an unlinked login like a student who left, and nothing while the links are unknown', () => {
    const [student, , unlinked] = withAccountLinks(accounts, links)!;
    expect(getUserRowClassName(unlinked)).toBe(INACTIVE_ROW_CLASS);
    expect(getUserRowClassName(student)).toBeUndefined();
    expect(getUserRowClassName(accounts[2])).toBeUndefined();
  });

  it('filters by the kind of person, or by none', () => {
    const linked = withAccountLinks(accounts, links)!;
    const ids = (filter: Parameters<typeof matchesLinkedTo>[1]) => linked.filter(user => matchesLinkedTo(user, filter)).map(({ id }) => id);
    expect(ids('__all__')).toEqual(['student-login', 'parent-login', 'unlinked-login']);
    expect(ids('student')).toEqual(['student-login']);
    expect(ids('staff')).toEqual([]);
    expect(ids('none')).toEqual(['unlinked-login']);
  });

  it('labels every filter value', () => {
    expect(buildLinkedToOptions(key => key).map(({ value }) => value)).toEqual(['__all__', 'student', 'parent', 'staff', 'none']);
  });
});

describe('email or phone search', () => {
  it('matches part of an email or a phone number, ignoring case, even where the other is missing', () => {
    const found = (search: string) => accounts.filter(user => matchesEmailOrPhone(user, search)).map(({ id }) => id);
    expect(found('gmx')).toEqual(['parent-login']);
    expect(found('PARENT@')).toEqual(['parent-login']);
    expect(found('0612')).toEqual(['student-login']);
    expect(found('  ')).toEqual(['student-login', 'parent-login', 'unlinked-login']);
    expect(found('nobody')).toEqual([]);
  });
});
