'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLogout } from 'najm-auth/client/react';
import { clearNajmUiPreferences } from 'najm-kit/server';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { schoolApp } from '@/najm.config';
import { SchoolSessionLoader } from '@/components/SchoolSessionLoader';

const SignOutTransition = createContext<{ signOut: () => Promise<void>; isSigningOut: boolean } | null>(null);
const navigateToLogin = () => window.location.replace(schoolApp.auth.loginRoute);

/** The transition outlives the shell when Najm clears its user during logout. */
export function SignOutTransitionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const [isLeaving, setIsLeaving] = useState(false);
  const { logout, isLoading } = useLogout({
    onSuccess: () => {
      setIsLeaving(true);
      // Preference cookies must not follow the next user. A failed cleanup
      // request must still leave this signed-out document for the login page.
      void clearNajmUiPreferences().then(navigateToLogin, navigateToLogin);
    },
    onError: () => toast.error(t('auth.page.logoutFailed')),
  });
  const isSigningOut = isLoading || isLeaving;

  return (
    <SignOutTransition.Provider value={{ signOut: logout, isSigningOut }}>
      <div className="contents" inert={isSigningOut} aria-hidden={isSigningOut || undefined}>{children}</div>
      {isSigningOut && <SchoolSessionLoader label={t('auth.page.logoutPending')} />}
    </SignOutTransition.Provider>
  );
}

export function useSchoolSignOut() {
  const transition = useContext(SignOutTransition);
  if (!transition) throw new Error('useSchoolSignOut requires SignOutTransitionProvider');
  return transition;
}
