'use client'

import { NForm, NButton } from 'najm-kit';
import { FormInput } from 'najm-kit';

import React, { useMemo } from 'react'
import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'
import { z } from 'zod'
import { useLogin } from 'najm-auth/client/react'
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { AuthHeading } from '../AuthHeading';
import { loginRedirectPath } from '@/shared/loginRedirect';
import { authErrorMessage } from '../authMessages';

// `identifier` is Najm Auth's wire field. An account is reached by its email,
// its phone, or both, so either is accepted here; the server normalizes a
// local number such as 0612345678 to the stored international form.
const PHONE_IDENTIFIER = /^\+?[\d\s().-]{8,}$/;
const loginSchema = (t: (key: string) => string) => z.object({
  identifier: z
    .string()
    .trim()
    .refine(
      (value) => z.string().email().safeParse(value).success || PHONE_IDENTIFIER.test(value),
      { message: t('auth.validation.identifierInvalid') },
    ),
  password: z.string().min(6, { message: t('auth.validation.loginPasswordMinLength') }),
  rememberMe: z.boolean()
})

const getLoginRedirectPath = () => {
  const from = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('from');
  return loginRedirectPath(from);
};

const Login = () => {
  const { t } = useTranslation();
  const schema = useMemo(() => loginSchema(t), [t]);
  const { login, isLoading } = useLogin({
    // v3 login has two outcomes. Only the authenticated one has a session, so
    // only it may reach the dashboard. A hard navigation is required here: the
    // login response sets the session cookie, but a next/navigation router
    // transition can still serve the client router cache's pre-login RSC
    // render and bounce straight back to /login.
    onAuthenticated: () => {
      toast.success(t('auth.success.loginSuccessful'));
      window.location.replace(getLoginRedirectPath());
    },
    onCredentialSetup: () => {
      window.location.replace('/change-password');
    },
    onError: (error) => {
      toast.error(authErrorMessage(error, t, 'auth.errors.loginFailed', { 401: 'auth.errors.invalidCredentials' }));
    },
  });

  const defaultValues = {
    identifier: '',
    password: '',
    rememberMe: false
  }

  const handleLogin = async (credentials) => {
    await login(credentials);
  }

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.loginTitle')}
        subtitle={t('auth.page.loginSubtitle')}
      />

      <div className='flex w-full flex-col gap-2'>

        <NForm id='login-form' schema={schema} defaultValues={defaultValues} onSubmit={handleLogin}>
          <FormInput
            name='identifier'
            type='text'
            formLabel={t('auth.form.emailOrPhone')}
            placeholder={t('auth.form.emailOrPhonePlaceholder')}
            autoComplete='username'
            variant='default'
            icon="User"
          />

          <FormInput
            name='password'
            type='password'
            formLabel={t('auth.form.password')}
            placeholder={t('auth.form.passwordPlaceholder')}
            autoComplete='current-password'
            variant='default'
            icon="Lock"
          />

          <div className="flex w-full items-center justify-between">
            {/* Keep the checkbox caption inline beside the control. */}
            <FormInput
              name="rememberMe"
              type="checkbox"
              label={t('auth.page.rememberMe')}
              variant='ghost'
              className="w-auto shrink-0"
              classNames={{ item: "w-auto shrink-0" }}
            />

            <Link
              href="/forgot-password"
              className="mt-1 p-2 text-sm font-normal text-tertiary hover:underline"
            >
              {t('auth.page.forgotPassword')}
            </Link>

          </div>
        </NForm>

        <NButton
          type="submit"
          form="login-form"
          className="w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45 disabled:text-primary-foreground/80 disabled:opacity-100 disabled:cursor-not-allowed [&_svg]:size-5"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {t('auth.page.loginPending')}
            </>
          ) : (
            <>
              <LogIn />
              {t('auth.page.loginSubmit')}
            </>
          )}
        </NButton>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.page.noAccount')}{' '}
          <Link href="/register" className="font-medium text-tertiary hover:underline">
            {t('auth.page.signUp')}
          </Link>
        </p>

      </div>
    </div>
  )
}

export default Login
