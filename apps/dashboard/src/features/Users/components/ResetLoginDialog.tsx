'use client'

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { NAlert, NButton, NLoadingState, useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';

import { getResetTargetApi } from '@/services/userApi';
import ResetAccessDialog from './ResetAccessDialog';
import type { AccessResetRow } from '../config/accessResetModes';

/**
 * The access reset, opened from a row that knows only its account's id — a
 * staff member or a teacher. The account is read fresh so the confirmation
 * describes the login as it is now; the server decides again on submit.
 */
const ResetLoginDialog = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['access-reset-target', userId],
    queryFn: () => getResetTargetApi(userId) as Promise<{ data: AccessResetRow }>,
    staleTime: 0,
  });

  if (isLoading) return <NLoadingState surface="panel" label={t('common.loading')} className="min-h-32" />;

  const target = data?.data;
  if (isError || !target) {
    return (
      <div className='flex w-full flex-col gap-3 py-2'>
        <NAlert
          tone='warning'
          icon={ShieldAlert}
          title={t('users.accessReset.unsupported')}
          description={t('users.accessReset.unsupportedHint')}
        />
        <div className='flex justify-end'>
          <NButton variant='outline' onClick={() => pop()}>
            {t('common.close')}
          </NButton>
        </div>
      </div>
    );
  }

  return <ResetAccessDialog user={target} />;
};

export default ResetLoginDialog;
