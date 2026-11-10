'use client'

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { OAuthCallback } from 'najm-auth/client/react';
import { useTranslation } from 'najm-i18n/react';
import { SCHOOL_HOME_PATH } from '@/najm.config';

/**
 * Where Google sign-in lands once the server has opened the session
 * (`frontendCallbackPath`, najm-auth's default). It finishes the sign-in in
 * this tab and goes on to the page the person came from, or home. A refusal
 * goes to /login instead, which explains it.
 */
export default function GoogleCallbackPage() {
  const { t } = useTranslation();
  return (
    <OAuthCallback
      defaultRedirect={SCHOOL_HOME_PATH}
      fallback={(
        <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('auth.oauth.finishing')}
        </p>
      )}
      errorFallback={(
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center text-sm">
          <p>{t('auth.oauth.errors.failed')}</p>
          <Link href="/login" className="font-medium text-tertiary hover:underline">{t('auth.oauth.backToLogin')}</Link>
        </div>
      )}
    />
  );
}
