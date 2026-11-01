'use client'

import React from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';

import ResetLoginDialog from '../components/ResetLoginDialog';
import { useViewerRole } from './useViewerRole';

/**
 * Access actions for people with their own login. Pending staff invitations
 * use the same permission, fresh-state checks and audited delivery as recovery.
 */
export function useResetLogin() {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const { can } = useViewerRole();
  const canReset = can('reset:users');

  const openReset = (userId: string, invitationApproval = false) => openDialog({
    title: t(invitationApproval ? 'staff.invitation.approve' : 'users.accessReset.title'),
    children: <ResetLoginDialog userId={userId} invitationApproval={invitationApproval} />,
    // The dialog owns its own confirm, as on the Users page.
    showButtons: false,
  });

  /** The menu item for a row's account, or none without permission or a login. */
  const resetItems = (userId?: string | null, { invitationApproval = false } = {}) => (canReset && userId
    ? [{ label: t(invitationApproval ? 'staff.invitation.approve' : 'users.accessReset.action'), icon: invitationApproval ? Mail : KeyRound, separatorBefore: true, onSelect: () => openReset(userId, invitationApproval) }]
    : []);

  return { canReset, resetItems, openReset };
}
