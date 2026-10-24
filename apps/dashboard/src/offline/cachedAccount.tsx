'use client';
/** Public build adapter for School's named hook imports only. Never hydrates AuthClient or sets authenticated. */
import { createContext, useContext } from 'react';
import { useAuth as useOnlineAuth, usePermissions as useOnlinePermissions } from 'najm-auth/client/react';
import type { OfflineGrant } from '@sms/contracts/offline';
export * from 'najm-auth/client/react';
export const CachedAccountContext = createContext<OfflineGrant | null>(null);
export function useAuth() {
  const online = useOnlineAuth();
  const grant = useContext(CachedAccountContext);
  return grant ? { ...online, user: { ...grant.account, permissions: grant.permissions },
    isAuthenticated: false, isLoading: false, accessToken: null, permissions: grant.permissions, roles: [grant.account.role] } : online;
}
export function usePermissions() {
  const online = useOnlinePermissions();
  const grant = useContext(CachedAccountContext);
  if (!grant) return online;
  return { can: (permission: string) => permission.startsWith('read:') && grant.permissions.includes(permission),
    hasRole: (role: string) => role === grant.account.role,
    hasAnyRole: (roles: string[]) => roles.includes(grant.account.role),
    permissions: grant.permissions, roles: [grant.account.role] };
}
