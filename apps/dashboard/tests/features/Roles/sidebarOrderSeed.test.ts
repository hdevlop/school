import { describe, expect, test } from 'bun:test';
import { seedForUser, type SidebarOrderSeed } from '@/features/Roles/context/SidebarOrderSeed';

const seed: SidebarOrderSeed = { userId: 'user-1', order: ['/students'], loadedAt: 1 };

describe('sidebar order seed', () => {
  test('applies to the account it was read for', () => {
    expect(seedForUser(seed, 'user-1')).toBe(seed);
  });

  test('never applies to another account, so a tab switched by sign-in reads its own', () => {
    expect(seedForUser(seed, 'user-2')).toBeNull();
    expect(seedForUser(seed, undefined)).toBeNull();
  });

  test('without a seed the browser asks as before', () => {
    expect(seedForUser(null, 'user-1')).toBeNull();
  });
});
