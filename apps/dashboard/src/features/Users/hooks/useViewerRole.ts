'use client';

import { useAuth, usePermissions } from 'najm-auth/client/react';
import { isSchoolWideRole } from '@/shared/pageAccess';

/**
 * Who is looking at a page. Parents and students read their own or their
 * children's records and change none of them, so pages show them no create,
 * edit or delete actions. The server enforces the same rule.
 *
 * An action is shown for the permission its route asks for (`can`), and —
 * where the route reaches past ownership — for a school-wide role.
 */
export function useViewerRole() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const role = (user as { role?: string } | null)?.role;
  return { role, isFamily: role === 'parent' || role === 'student', isSchoolWide: isSchoolWideRole(role), can };
}
