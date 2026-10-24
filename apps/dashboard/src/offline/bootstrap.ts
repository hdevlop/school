import type { NajmClientAppSnapshot } from 'najm-next/app/client';
import { isShellPath } from './routes';
export { isShellPath } from './routes';

export const BOOTSTRAP_KEY = 'school.offline-shell.v1';
export const CACHE_ID = 'myscolai-shell';
export const SHELL_PREPARATION_DURATION_MS = 8 * 60 * 60 * 1000;
export type ShellRoute = { href: string; label: string };
export type ShellBootstrap = {
  version: 1;
  accountId: string;
  role?: string;
  expiresAt: number;
  routes: ShellRoute[];
  ui: Omit<NajmClientAppSnapshot, 'session'>;
  academicYear?: string;
};

// This is display metadata, never an authenticated session or record access grant.
export function readBootstrap(storage: Pick<Storage, 'getItem'>, now = Date.now()): ShellBootstrap | null {
  try {
    const value = JSON.parse(storage.getItem(BOOTSTRAP_KEY) ?? 'null') as ShellBootstrap | null;
    if (!value || value.version !== 1 || typeof value.accountId !== 'string' || !value.accountId
      || (value.role !== undefined && typeof value.role !== 'string')
      || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + SHELL_PREPARATION_DURATION_MS
      || !value.ui?.preferences || !Array.isArray(value.routes)
      || !value.routes.every(route => isShellPath(route.href) && typeof route.label === 'string')) return null;
    return value;
  } catch { return null; }
}

export function routeForPath(routes: ShellRoute[], path: string): ShellRoute | undefined {
  if (!isShellPath(path)) return undefined;
  return routes.find(route => path === route.href)
    ?? routes.filter(route => path.startsWith(route.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
}
