import type { NajmClientAppSnapshot } from 'najm-next/app/client';
import { readShellBootstrap, routeForPath as findRoute, shellBootstrapKey, type ShellBootstrap as Bootstrap, type ShellRoute } from 'najm-offline/client';
import { OFFLINE_NAMESPACE } from '@sms/contracts/offline';
import { isShellPath } from './routes';
export { isShellPath } from './routes';
export { SHELL_PREPARATION_DURATION_MS, withPreferenceChoices, type ShellRoute } from 'najm-offline/client';

export const BOOTSTRAP_KEY = shellBootstrapKey(OFFLINE_NAMESPACE);
export const CACHE_ID = 'myscolai-shell';
// Sidebar logos are served by the API, which the worker never caches. School
// keeps its own copy for the offline shell; Najm's shell caches are untouched.
// Factory logos are named by a hash of their bytes and uploads by a fresh id,
// so a URL there never serves other bytes: a replaced logo is a new URL.
export const SHELL_BRANDING = { cacheName: 'school-offline-branding', slots: ['sidebarLogoExpanded', 'sidebarLogoCollapsed'],
  immutable: /^\/api\/branding\/(?:factory|assets)\// };
export type ShellBootstrap = Bootstrap<Omit<NajmClientAppSnapshot, 'session'>>;

// This is display metadata, never an authenticated session or record access grant.
export function readBootstrap(storage: Pick<Storage, 'getItem'>, now = Date.now()): ShellBootstrap | null {
  return readShellBootstrap<ShellBootstrap>(storage, { key: BOOTSTRAP_KEY, isShellPath }, now);
}
export type ShellPreferences = ShellBootstrap['ui']['preferences'];
export function routeForPath(routes: ShellRoute[], path: string): ShellRoute | undefined { return findRoute(routes, path, isShellPath); }
