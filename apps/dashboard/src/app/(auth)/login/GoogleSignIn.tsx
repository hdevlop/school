'use client'

import { useEffect, useState } from 'react';
import { GoogleLoginButton } from 'najm-auth/client/react';
import { NButton } from 'najm-kit';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';

/** The refusals a person can act on; anything else is "try again". */
const EXPLAINED = new Set([
  'oauth_signup_disabled', 'oauth_account_link_required', 'oauth_account_inactive',
  'oauth_credential_setup_required', 'oauth_access_denied', 'oauth_state_invalid',
]);

/** Google's own mark, as its sign-in guidelines ask a "Continue with Google" button to show. */
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/**
 * "Continue with Google" under the password form. Google returns here with
 * `?oauthError=` when it could not sign the person in; the reason is shown
 * once, in the page's language, and taken off the address.
 */
export function GoogleSignIn({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('oauthError');
    if (!code) return;
    toast.error(t(EXPLAINED.has(code) ? `auth.oauth.errors.${code}` : 'auth.oauth.errors.failed'));
    url.searchParams.delete('oauthError');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [t]);

  return (
    <>
      <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {t('auth.oauth.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleLoginButton
        returnTo={returnTo}
        onError={() => { setRedirecting(false); toast.error(t('auth.oauth.errors.failed')); }}
      >
        <NButton type="button" variant="outline" className="w-full gap-2" loading={redirecting} onClick={() => setRedirecting(true)}>
          {!redirecting && <GoogleMark />}
          {t('auth.oauth.continueWithGoogle')}
        </NButton>
      </GoogleLoginButton>
    </>
  );
}
