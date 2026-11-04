'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SidebarOrderId } from '@sms/contracts/access-control';

/** The sidebar order the first server render already read for the signed-in user. */
export type SidebarOrderSeed = {
  userId: string;
  order: SidebarOrderId[];
  loadedAt: number;
};

const SidebarOrderSeedContext = createContext<SidebarOrderSeed | null>(null);

export function SidebarOrderSeedProvider({ value, children }: Readonly<{ value: SidebarOrderSeed | null; children: ReactNode }>) {
  return <SidebarOrderSeedContext.Provider value={value}>{children}</SidebarOrderSeedContext.Provider>;
}

/** A seed read for another account, after switching in another tab, does not apply. */
export function seedForUser(seed: SidebarOrderSeed | null, userId: string | undefined) {
  return seed && seed.userId === userId ? seed : null;
}

export function useSidebarOrderSeed(userId: string | undefined) {
  return seedForUser(useContext(SidebarOrderSeedContext), userId);
}
