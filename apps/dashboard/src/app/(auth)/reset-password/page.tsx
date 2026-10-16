'use client'

import React, { Suspense, useMemo } from 'react'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, KeyRound } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { auth } from '@/najm.auth'
import { useTranslation } from 'najm-i18n/react';
import { AuthHeading } from '../AuthHeading';
import { authErrorMessage, newPasswordSchema } from '../authMessages';

// Whether the link came from an account invitation rather than a password
// reset. Only the wording depends on it: the payload is read, not trusted, and
// the server verifies and consumes the token either way.
const isInvitationToken = (token: string) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return false
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)?.type === 'invite'
  } catch {
    return false
  }
}

// Used for both password reset and account invites — both arrive here with a
// one-time ?token= and set a new password via the same endpoint. Accepting an
// invitation also verifies the email and activates the pending account.
const ResetPasswordForm = () => {
  const { t } = useTranslation();
  const schema = useMemo(() => newPasswordSchema(t), [t]);
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const isInvitation = isInvitationToken(token)

  const mutation = useMutation({
    mutationFn: (data: { token: string; newPassword: string }) => auth.client.resetPassword(data),
    onSuccess: () => {
      toast.success(isInvitation ? t('auth.success.accountActivated') : t('auth.success.passwordSet'))
      router.replace('/login')
    },
    onError: (error) => {
      toast.error(authErrorMessage(error, t, 'auth.errors.setPasswordFailed', { 400: 'auth.errors.resetLinkInvalid' }))
    },
  })

  const handleSubmit = async ({ newPassword }: { newPassword: string }) => {
    await mutation.mutateAsync({ token, newPassword })
  }

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={isInvitation ? t('auth.page.activateTitle') : t('auth.page.resetTitle')}
        subtitle={isInvitation ? t('auth.page.activateSubtitle') : t('auth.page.resetSubtitle')}
      />

      {!token ? (
        <div className='flex flex-col items-center gap-3 text-center'>
          <p className='text-muted-foreground'>{t('auth.page.invalidLink')}</p>
          <Link href='/login' className='text-tertiary hover:underline'>{t('auth.page.backToLogin')}</Link>
        </div>
      ) : (
        <div className='flex w-full flex-col gap-2'>
          <NForm
            id='reset-password-form'
            schema={schema}
            defaultValues={{ newPassword: '', confirmPassword: '' }}
            onSubmit={handleSubmit}
          >
            <FormInput
              name='newPassword'
              type='password'
              autoComplete='new-password'
              formLabel={t('auth.form.newPassword')}
              placeholder={t('auth.form.resetNewPasswordPlaceholder')}
              variant='default'
              icon={KeyRound}
            />

            <FormInput
              name='confirmPassword'
              type='password'
              autoComplete='new-password'
              formLabel={t('auth.form.confirmPassword')}
              placeholder={t('auth.form.resetConfirmPasswordPlaceholder')}
              variant='default'
              icon={KeyRound}
            />
          </NForm>

          <NButton
            type='submit'
            form='reset-password-form'
            className='w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className='animate-spin' />
                {t('auth.page.savingPending')}
              </>
            ) : (
              isInvitation ? t('auth.page.activateSubmit') : t('auth.page.resetSubmit')
            )}
          </NButton>
        </div>
      )}
    </div>
  )
}

const ResetPasswordPage = () => (
  <Suspense fallback={null}>
    <ResetPasswordForm />
  </Suspense>
)

export default ResetPasswordPage
