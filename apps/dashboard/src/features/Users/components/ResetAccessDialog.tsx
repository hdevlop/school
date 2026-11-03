'use client'

import React, { useState } from 'react';
import { KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { NAlert, NButton, Label } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
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

const ResetAccessDialog = ({ user, invitationApproval = false }: { user: AccessResetRow; invitationApproval?: boolean }) => {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const { resetAccess, isResettingAccess } = useResetUserAccess();
  const [failure, setFailure] = useState<string | null>(null);
  const [temporaryCredential, setTemporaryCredential] = useState<string | null>(null);

  const mode = resolveExpectedMode(user);

  if (temporaryCredential) {
    return (
      <div className='flex w-full flex-col gap-4'>
        <Label className='text-sm font-semibold'>{user.name}</Label>
        <NAlert tone='warning' icon={KeyRound} description={t('users.accessReset.temporaryPasswordHint')} />
        <code className='select-all break-all rounded-md border bg-muted p-3 text-center font-mono text-lg' aria-label={t('users.accessReset.temporaryPassword')}>
          {temporaryCredential}
        </code>
        <div className='flex justify-end'>
          <NButton onClick={() => { setTemporaryCredential(null); pop(); }}>{t('common.close')}</NButton>
        </div>
      </div>
    );
  }

  if (!mode || (invitationApproval && mode !== 'invitation_resent')) {
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

  const recipient = '{recipient}';
  const consequence =
    mode === 'parent_credential_setup'
      ? t('users.accessReset.modes.parentCredentialSetup', { recipient })
      : mode === 'reset_email_sent'
        ? t('users.accessReset.modes.resetEmailSent', { recipient })
        : t(invitationApproval ? 'staff.invitation.approveDescription' : 'users.accessReset.modes.invitationResent', { recipient });

  const handleSubmit = async () => {
    setFailure(null);
    try {
      const result = await resetAccess({ userId: user.id, expectedMode: mode });

      // A provider that accepted nothing is a failure the administrator has to
      // retry, so the dialog stays open and says so rather than closing on a
      // success it cannot vouch for.
      if (result.delivery === 'not_sent') {
        setFailure(t('users.accessReset.delivery.notSent'));
        return;
      }

      if (result.temporaryCredential) {
        setTemporaryCredential(result.temporaryCredential);
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
      <NAlert
        tone={mode === 'parent_credential_setup' ? 'warning' : 'info'}
        look='soft'
        icon={mode === 'parent_credential_setup' ? KeyRound : Mail}
        className='[overflow-wrap:anywhere] [&_p]:opacity-100'
        description={consequence.split(recipient).map((text, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <strong className='font-semibold text-foreground'>
                {user.name && <bdi>{user.name}</bdi>}
                {user.name && user.email && ' '}
                {user.email && <bdi dir='ltr'>({user.email})</bdi>}
              </strong>
            )}
            {text}
          </React.Fragment>
        ))}
      />

      {failure && <NAlert tone='error' look='soft' description={failure} />}

      <div className='flex flex-wrap justify-end gap-2'>
        <NButton variant='outline' onClick={() => pop()} disabled={isResettingAccess}>
          {t('common.cancel')}
        </NButton>
        <NButton
          type='button'
          onClick={handleSubmit}
          variant={invitationApproval ? 'default' : 'destructive'}
          loading={isResettingAccess}
          disabled={isResettingAccess}
        >
          {isResettingAccess
            ? t(mode === 'invitation_resent' ? 'staff.invitation.sending' : 'users.accessReset.pending')
            : t(invitationApproval ? 'staff.invitation.approve' : 'users.accessReset.confirmButton')}
        </NButton>
      </div>
    </div>
  );
};

export default ResetAccessDialog;
