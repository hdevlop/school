'use client'

import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, KeyRound, LogOut } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { credentialSetupApi } from '@/services/credentialSetupApi'
import { useTranslation } from '@/hooks/useLanguage';
import { AuthHeading } from '../AuthHeading';

// Min 8 to match Najm's default credential-setup password rule.
const changePasswordSchema = z.object({
  newPassword: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string().min(8, { message: 'Please confirm your password' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string } }; message?: string }
    return e.response?.data?.message ?? e.message ?? 'Could not set your password. The setup session may have expired.'
  }
  return 'Could not set your password. The setup session may have expired.'
}

// Reached only from a login that answered `nextStep: 'credential_setup'`. The
// user holds Najm's one-time setup cookie and no session, so this page is
// public and must never assume an authenticated identity.
const ChangePassword = () => {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    credentialSetupApi.getStatus()
      .then(() => { if (active) setChecking(false) })
      .catch(() => { if (active) window.location.replace('/login') })

    return () => { active = false }
  }, [])

  const mutation = useMutation({
    mutationFn: (newPassword: string) => credentialSetupApi.changePassword({ newPassword }),
    onSuccess: () => {
      toast.success(t('auth.success.passwordSet'))
      // Setup deliberately does not issue a session; a fresh login is required.
      window.location.replace('/login')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: () => credentialSetupApi.cancel(),
    onSettled: () => window.location.replace('/login'),
  })

  if (checking) {
    return (
      <div className='flex w-full flex-col items-center justify-center py-10'>
        <Loader2 className='animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.setupTitle')}
        subtitle={t('auth.page.setupSubtitle')}
      />

      <div className='flex w-full flex-col gap-2'>
        <NForm
          id='change-password-form'
          schema={changePasswordSchema}
          defaultValues={{ newPassword: '', confirmPassword: '' }}
          onSubmit={(values) => mutation.mutate(values.newPassword)}
        >
          <FormInput
            name='newPassword'
            type='password'
            formLabel={t('auth.form.newPassword')}
            placeholder={t('auth.form.newPasswordPlaceholder')}
            variant='default'
            icon='Lock'
          />

          <FormInput
            name='confirmPassword'
            type='password'
            formLabel={t('auth.form.confirmPassword')}
            placeholder={t('auth.form.confirmPasswordPlaceholder')}
            variant='default'
            icon='Lock'
          />
        </NForm>

        <NButton
          type='submit'
          form='change-password-form'
          className='w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45 disabled:text-primary-foreground/80 disabled:opacity-100 disabled:cursor-not-allowed [&_svg]:size-5'
          disabled={mutation.isPending || cancelMutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className='animate-spin' />
              {t('auth.page.savingPending')}
            </>
          ) : (
            <>
              <KeyRound />
              {t('auth.page.resetSubmit')}
            </>
          )}
        </NButton>

        <NButton
          type='button'
          variant='outline'
          className='w-full'
          disabled={mutation.isPending || cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          <LogOut />
          {t('auth.page.cancel')}
        </NButton>
      </div>
    </div>
  )
}

export default ChangePassword
