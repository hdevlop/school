'use client'

import React from 'react';
import { KeyRound } from 'lucide-react';
import { useDialog } from '@/shared/useDialog';
import { useTranslation } from 'najm-i18n/react';

import ResetLoginDialog from '../components/ResetLoginDialog';
import { useViewerRole } from './useViewerRole';

/**
 * The "Reset access" row action for lists of people with a login of their own
 * (staff, teachers), shown to whoever holds reset:users — the principal, who
 * has no Users page, as well as the administrator.
 */
export function useResetLogin() {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const { can } = useViewerRole();
  const canReset = can('reset:users');

  const openReset = (userId: string) => openDialog({
    title: t('users.accessReset.title'),
    children: <ResetLoginDialog userId={userId} />,
    // The dialog owns its own confirm, as on the Users page.
    showButtons: false,
  });

  /** The menu item for a row's account, or none when it has no login. */
  const resetItems = (userId?: string | null) => (canReset && userId
    ? [{ label: t('users.accessReset.action'), icon: KeyRound, separatorBefore: true, onSelect: () => openReset(userId) }]
    : []);

  return { canReset, resetItems };
}
