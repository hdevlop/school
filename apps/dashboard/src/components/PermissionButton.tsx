'use client';

import type { ComponentProps } from 'react';
import { NButton } from 'najm-kit';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';
import { canPerformAction } from '@/shared/actionPermissions';

/** Keep unavailable actions visible, with native disabled behavior. */
export function PermissionButton({ permission, disabled, onClick, ...props }: ComponentProps<typeof NButton> & {
  permission: string;
}) {
  const viewer = useViewerRole();
  const blocked = disabled || !canPerformAction(viewer, permission);
  return <NButton {...props} disabled={blocked} onClick={blocked ? undefined : onClick} />;
}
