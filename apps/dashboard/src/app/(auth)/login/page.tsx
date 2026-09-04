'use client'

import { NForm, NButton } from 'najm-kit';
import { FormInput } from 'najm-kit';

import React from 'react'
import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'
import { z } from 'zod'
import { useLogin } from 'najm-auth/client/react'
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { AuthHeading } from '../AuthHeading';

// `identifier` is Najm Auth v3's wire field. School authenticates by email, so
// the value is still validated and labelled as one.
const loginSchema = z.object({
  identifier: z.string().email({ message: 'Invalid mail address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  rememberMe: z.boolean()
})

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const responseError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return responseError.response?.data?.message ?? 'Login failed. Please try again.';
  }

  return 'Login failed. Please try again.';
};

// `/change-password` is listed so a stale `?from=` cannot send a user who just
// finished setup straight back into the setup screen.
const INVALID_REDIRECT_PREFIXES = ['/login', '/register', '/forgot-password', '/change-password', '/_next', '/api', '/images', '/storage'];
const INVALID_REDIRECT_EXACT_PATHS = new Set(['/manifest.webmanifest', '/favicon.ico', '/sw.js']);
const INVALID_REDIRECT_FILE_EXTENSIONS = /\.(?:webmanifest|ico|png|jpe?g|svg|webp|gif|css|js|map)$/i;

const isSafeRedirectPath = (path: string) => {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  const pathname = path.split('?')[0] ?? path;

  if (INVALID_REDIRECT_EXACT_PATHS.has(pathname)) {
    return false;
  }

  if (INVALID_REDIRECT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (INVALID_REDIRECT_FILE_EXTENSIONS.test(pathname)) {
    return false;
  }

  return true;
};

const getLoginRedirectPath = () => {
  if (typeof window === 'undefined') {
    return '/';
  }

  const from = new URLSearchParams(window.location.search).get('from');

  return from && isSafeRedirectPath(from)
    ? from
    : '/';
};

const Login = () => {
  const { t } = useTranslation();
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
      toast.error(getLoginErrorMessage(error));
    },
  });

  const defaultValues = {
    identifier: 'admin@admin.com',
    password: 'ChangeMe123456',
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

        <NForm id='login-form' schema={loginSchema} defaultValues={defaultValues} onSubmit={handleLogin}>
          <FormInput
            name='identifier'
            type='text'
            formLabel={t('auth.form.email')}
            placeholder={t('auth.form.emailPlaceholder')}
            variant='default'
            icon="Mail"
          />

          <FormInput
            name='password'
            type='password'
            formLabel={t('auth.form.password')}
            placeholder={t('auth.form.passwordPlaceholder')}
            variant='default'
            icon="Lock"
          />

          <div className="flex w-full items-center justify-between">
            {/* `label` (not `formLabel`) keeps the caption inline beside the
                box: `formLabel` renders a FormLabel stacked above the control.

                The caption stays hardcoded English. The browser acceptance
                suite signs in under every supported language and finds this
                checkbox by the text of its form item — see
                `tests/e2e/support/acceptance.ts`. It is also the only checkbox
                on the page, which `najm-upgrade.spec.ts` relies on, so nothing
                else here may grow one. */}
            <FormInput
              name="rememberMe"
              type="checkbox"
              label="Keep me logged in"
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
          {/* Both captions stay hardcoded English for the same reason as the
              checkbox above: the acceptance suite clicks `name: 'Login'`. */}
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn />
              Login
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
