'use client';

import { useAuth } from 'najm-auth/client/react';

/**
 * Who is looking at a page. Parents and students read their own or their
 * children's records and change none of them, so pages show them no create,
 * edit or delete actions. The server enforces the same rule.
 */
export function useViewerRole() {
  const { user } = useAuth();
  const role = (user as { role?: string } | null)?.role;
  return { role, isFamily: role === 'parent' || role === 'student' };
}
