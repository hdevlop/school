'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { auth } from '@/najm.auth'
import { useTranslation } from 'najm-i18n/react'
import { AuthHeading } from '../AuthHeading'
import { authErrorMessage, emailSchema, strongPasswordSchema } from '../authMessages'

// Mirrors najm-auth's `registerDto` password rule exactly. Restating it here is
// what lets the browser reject a weak password before the round trip; the
// server stays the authority and re-checks the same rule.
const registerSchema = (t: (key: string) => string) => z.object({
  name: z.string().trim().min(2, { message: t('auth.validation.fullNameRequired') }).max(100),
  email: emailSchema(t),
  password: strongPasswordSchema(t),
  confirmPassword: z.string().min(8, { message: t('auth.validation.confirmPasswordRequired') }),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.validation.passwordsMismatch'),
  path: ['confirmPassword'],
})

type RegisterValues = z.infer<ReturnType<typeof registerSchema>>

/**
 * Self-service account creation against najm-auth's public `/auth/register`.
 *
 * Registration issues no session and grants no role — the account arrives
 * unverified with nothing attached to it, so an administrator still has to give
 * it a role before it can reach anything in the dashboard. That is why this page
 * hands over to /login rather than to the dashboard.
 */
const Register = () => {
  const { t } = useTranslation()
  const schema = useMemo(() => registerSchema(t), [t])
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: (values: RegisterValues) => auth.client.register({
      name: values.name,
      email: values.email,
      password: values.password,
    }),
    onSuccess: () => {
      toast.success(t('auth.success.register'))
      router.replace('/login')
    },
    onError: (error) => {
      toast.error(authErrorMessage(error, t, 'auth.errors.registerFailed'))
    },
  })

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.registerTitle')}
        subtitle={t('auth.page.registerSubtitle')}
      />

      <div className='flex w-full flex-col gap-2'>
        <NForm
          id='register-form'
          schema={schema}
          defaultValues={{ name: '', email: '', password: '', confirmPassword: '' }}
          onSubmit={(values: RegisterValues) => mutation.mutateAsync(values)}
        >
          <FormInput
            name='name'
            type='text'
            formLabel={t('auth.form.fullName')}
            placeholder={t('auth.form.fullNamePlaceholder')}
            variant='default'
            icon='User'
          />

          <FormInput
            name='email'
            type='text'
            formLabel={t('auth.form.email')}
            placeholder={t('auth.form.emailPlaceholder')}
            variant='default'
            icon='Mail'
          />

          <FormInput
            name='password'
            type='password'
            autoComplete='new-password'
            formLabel={t('auth.form.password')}
            placeholder={t('auth.form.passwordPlaceholder')}
            variant='default'
            icon='Lock'
          />

          <FormInput
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            formLabel={t('auth.form.confirmPassword')}
            placeholder={t('auth.form.confirmPasswordPlaceholder')}
            variant='default'
            icon='Lock'
          />
        </NForm>

        <NButton
          type='submit'
          form='register-form'
          className='w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45 disabled:text-primary-foreground/80 disabled:opacity-100 disabled:cursor-not-allowed [&_svg]:size-5'
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className='animate-spin' />
              {t('auth.page.registerPending')}
            </>
          ) : (
            <>
              <UserPlus />
              {t('auth.page.registerSubmit')}
            </>
          )}
        </NButton>

        <p className='mt-4 text-center text-sm text-muted-foreground'>
          {t('auth.page.haveAccount')}{' '}
          <Link href='/login' className='font-medium text-tertiary hover:underline'>
            {t('auth.page.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
