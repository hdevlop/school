'use client'

import { NForm, NButton } from 'najm-kit';
import { FormInput } from 'najm-kit';

import React from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { z } from 'zod'
import { useLogin } from 'najm-auth/client/react'
import { useRouter } from 'next/navigation'
import { useForgotPasswordStore } from '@/stores/ForgotPasswordStore'
import { toast } from 'sonner';

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
const INVALID_REDIRECT_PREFIXES = ['/login', '/change-password', '/_next', '/api', '/images', '/storage'];
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
  const router = useRouter();

  const { login, isLoading } = useLogin({
    // v3 login has two outcomes. Only the authenticated one has a session, so
    // only it may reach the dashboard.
    onAuthenticated: () => {
      toast.success('Login successful');
      router.replace(getLoginRedirectPath());
    },
    onCredentialSetup: () => {
      router.replace('/change-password');
    },
    onError: (error) => {
      toast.error(getLoginErrorMessage(error));
    },
  });
  const { openDialog } = useForgotPasswordStore();

  const defaultValues = {
    identifier: 'admin@admin.com',
    password: 'ChangeMe123456',
    rememberMe: false
  }

  const handleLogin = async (credentials) => {
    await login(credentials);
  }

  const handleForgotPasswordClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    openDialog()
  }

  return (
    <div className='flex flex-col  justify-center items-center  p-8 w-full md:w-[500px]'>
      <span className='text-2xl my-5 md:text-3xl font-semibold'>Welcome To Academix!</span>
      <div className='flex flex-col h-full w-full gap-2 '>

        <NForm id='login-form' schema={loginSchema} defaultValues={defaultValues} onSubmit={handleLogin}>
          <FormInput
            name='identifier'
            type='text'
            formLabel='Email'
            placeholder='Enter your email'
            variant='default'
            icon="Mail"
          />

          <FormInput
            name='password'
            type='password'
            formLabel='Password'
            placeholder='Enter your password'
            variant='default'
            icon="Lock"
          />

          <div className="flex w-full justify-between">
            <FormInput
              name="rememberMe"
              type="checkbox"
              formLabel="Keep me logged in"
              variant='ghost'
            />

            <NButton
              variant="link"
              className=" text-sm text-tertiary hover:underline cursor-pointer mt-1 p-2 font-normal"
              onClick={handleForgotPasswordClick}
            >
              Forgot password?
            </NButton>

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
              Logging in...
            </>
          ) : (
            <>
              <LogIn />
              Login
            </>
          )}
        </NButton>

      </div>
    </div>
  )
}

export default Login
