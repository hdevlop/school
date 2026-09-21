'use client'

import React, { useState } from 'react';
import { z } from 'zod';
import { FileText, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { NAlert, NButton, NForm, FormInput, Label, useDialog } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';

import { useResetUserAccess } from '../hooks/useResetUserAccess';
import { resolveExpectedMode, type AccessResetRow } from '../config/accessResetModes';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? fallback;
  }
  return fallback;
};

const ResetAccessDialog = ({ user }: { user: AccessResetRow }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { resetAccess, isResettingAccess } = useResetUserAccess();
  const [failure, setFailure] = useState<string | null>(null);

  const mode = resolveExpectedMode(user);

  const reasonSchema = z.object({
    reason: z
      .string()
      .trim()
      .min(3, { message: t('users.accessReset.reasonTooShort') })
      .max(500, { message: t('users.accessReset.reasonTooLong') }),
  });

  if (!mode) {
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

  const consequence =
    mode === 'parent_credential_setup'
      ? t('users.accessReset.modes.parentCredentialSetup')
      : mode === 'reset_email_sent'
        ? t('users.accessReset.modes.resetEmailSent')
        : t('users.accessReset.modes.invitationResent');

  const handleSubmit = async ({ reason }: { reason: string }) => {
    setFailure(null);
    try {
      const result = await resetAccess({ userId: user.id, reason, expectedMode: mode });

      // A provider that accepted nothing is a failure the administrator has to
      // retry, so the dialog stays open and says so rather than closing on a
      // success it cannot vouch for.
      if (result.delivery === 'not_sent') {
        setFailure(t('users.accessReset.delivery.notSent'));
        return;
      }

      toast.success(
        result.delivery === 'simulated'
          ? t('users.accessReset.delivery.simulated')
          : result.delivery === 'not_applicable'
            ? t('users.accessReset.delivery.notApplicable')
            : t('users.accessReset.delivery.sent'),
      );
      pop();
    } catch (error) {
      setFailure(getErrorMessage(error, t('users.accessReset.failed')));
    }
  };

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='flex flex-col gap-0.5'>
        <Label className='text-sm font-semibold'>{user.name}</Label>
        <Label className='text-sm text-muted-foreground'>{user.email}</Label>
      </div>

      <NAlert
        tone={mode === 'parent_credential_setup' ? 'warning' : 'info'}
        look='soft'
        icon={mode === 'parent_credential_setup' ? KeyRound : Mail}
        description={consequence}
      />

      <NForm
        id='reset-access-form'
        schema={reasonSchema}
        defaultValues={{ reason: '' }}
        onSubmit={handleSubmit}
      >
        <FormInput
          name='reason'
          type='textarea'
          formLabel={t('users.accessReset.reasonLabel')}
          placeholder={t('users.accessReset.reasonPlaceholder')}
          variant='default'
          icon={FileText}
          required={true}
          autoFocus
        />
      </NForm>

      {failure && <NAlert tone='error' look='soft' description={failure} />}

      <div className='flex justify-end gap-2'>
        <NButton variant='outline' onClick={() => pop()} disabled={isResettingAccess}>
          {t('common.cancel')}
        </NButton>
        <NButton
          type='submit'
          form='reset-access-form'
          variant='destructive'
          loading={isResettingAccess}
          disabled={isResettingAccess}
        >
          {isResettingAccess
            ? t('users.accessReset.pending')
            : t('users.accessReset.confirmButton')}
        </NButton>
      </div>
    </div>
  );
};

export default ResetAccessDialog;
