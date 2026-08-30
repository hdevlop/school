'use client'

import React from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Loader2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { auth } from '@/lib/auth'
import { useTranslation } from '@/hooks/useLanguage'
import { AuthHeading } from '../AuthHeading'

// Mirrors najm-auth's `registerDto` password rule exactly. Restating it here is
// what lets the browser reject a weak password before the round trip; the
// server stays the authority and re-checks the same rule.
const registerSchema = z.object({
  name: z.string().trim().min(2, { message: 'Please enter your full name' }).max(100),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/\d/, { message: 'Password must contain at least one number' }),
  confirmPassword: z.string().min(8, { message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterValues = z.infer<typeof registerSchema>

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string } }; message?: string }
    return e.response?.data?.message ?? e.message ?? 'Could not create your account. Please try again.'
  }
  return 'Could not create your account. Please try again.'
}

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
      toast.error(getErrorMessage(error))
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
          schema={registerSchema}
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
            formLabel={t('auth.form.password')}
            placeholder={t('auth.form.passwordPlaceholder')}
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
