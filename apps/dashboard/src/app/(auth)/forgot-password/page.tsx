'use client'

import React from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, Mail, MoveLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { auth } from '@/lib/auth'
import { useTranslation } from '@/hooks/useLanguage'
import { AuthHeading } from '../AuthHeading'

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

/**
 * Password recovery, as a route rather than the dialog it used to be, so it
 * shares the one auth frame with sign in, sign up, and the two password screens.
 *
 * The confirmation says the same thing whether or not the address is on file.
 * The endpoint answers identically for both, and saying more here would turn
 * this form into a way to test which emails have accounts.
 */
const ForgotPassword = () => {
  const { t } = useTranslation()

  const mutation = useMutation({
    mutationFn: (data: { email: string }) => auth.client.forgotPassword(data),
    onSuccess: () => {
      toast.success(t('auth.success.resetLinkSent'))
    },
    onError: () => {
      toast.error(t('auth.errors.resetEmailFailed'))
    },
  })

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.forgotTitle')}
        subtitle={t('auth.page.forgotSubtitle')}
      />

      <div className='flex w-full flex-col gap-2'>
        <NForm
          id='forgot-password-form'
          schema={forgotPasswordSchema}
          defaultValues={{ email: '' }}
          onSubmit={({ email }: { email: string }) => mutation.mutateAsync({ email })}
        >
          <FormInput
            name='email'
            type='text'
            formLabel={t('auth.form.email')}
            placeholder={t('auth.form.emailPlaceholder')}
            variant='default'
            icon={Mail}
          />
        </NForm>

        <NButton
          type='submit'
          form='forgot-password-form'
          className='w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45 disabled:text-primary-foreground/80 disabled:opacity-100 disabled:cursor-not-allowed [&_svg]:size-5'
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className='animate-spin' />
              {t('auth.page.forgotPending')}
            </>
          ) : (
            <>
              <Mail />
              {t('auth.page.forgotSubmit')}
            </>
          )}
        </NButton>

        <p className='mt-4 text-center text-sm text-muted-foreground'>
          <Link href='/login' className='inline-flex items-center gap-1.5 font-medium text-tertiary hover:underline'>
            <MoveLeft className='size-4 rtl:rotate-180' />
            {t('auth.page.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
