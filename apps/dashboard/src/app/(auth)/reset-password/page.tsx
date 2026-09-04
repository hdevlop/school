'use client'

import React, { Suspense } from 'react'
import { z } from 'zod'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, KeyRound } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { useTranslation } from 'najm-i18n/react';
import { AuthHeading } from '../AuthHeading';

// Min 8 to match the backend's confirmResetPasswordDto password rule.
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string().min(8, { message: 'Please confirm your password' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string } }; message?: string }
    return e.response?.data?.message ?? e.message ?? 'Could not set your password. The link may have expired.'
  }
  return 'Could not set your password. The link may have expired.'
}

// Used for both password reset and account invites — both arrive here with a
// one-time ?token= and set a new password via the same endpoint.
const ResetPasswordForm = () => {
  const { t } = useTranslation();
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const mutation = useMutation({
    mutationFn: (data: { token: string; newPassword: string }) => auth.client.resetPassword(data),
    onSuccess: () => {
      toast.success(t('auth.success.passwordSet'))
      router.replace('/login')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleSubmit = async ({ newPassword }: { newPassword: string }) => {
    await mutation.mutateAsync({ token, newPassword })
  }

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.resetTitle')}
        subtitle={t('auth.page.resetSubtitle')}
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
            schema={resetPasswordSchema}
            defaultValues={{ newPassword: '', confirmPassword: '' }}
            onSubmit={handleSubmit}
          >
            <FormInput
              name='newPassword'
              type='password'
              formLabel={t('auth.form.newPassword')}
              placeholder={t('auth.form.resetNewPasswordPlaceholder')}
              variant='default'
              icon={KeyRound}
            />

            <FormInput
              name='confirmPassword'
              type='password'
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
              t('auth.page.resetSubmit')
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
