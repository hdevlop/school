'use client';

import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from 'najm-auth/client/react';
import { useTheme } from 'next-themes';
import { NajmDesignProvider, parseNajmDesignConfig } from 'najm-kit';
import { auth } from '@/lib/auth';
import { KeyboardProvider } from '@/providers/KeyboardProvider';
import smsDesignConfigJson from '../../../../sms-design-config.json';

const smsDesignConfig = parseNajmDesignConfig(smsDesignConfigJson);

function applySmsTypographyVars() {
  const { typography } = smsDesignConfig;

  if (typeof document === 'undefined' || !typography) {
    return;
  }

  const root = document.documentElement;
  const scaleFactor =
    typography.scale === 'compact' ? '0.95' : typography.scale === 'comfortable' ? '1.05' : '1';
  const vars: Record<string, string | undefined> = {
    '--font-sans': typography.fontSans,
    '--font-heading': typography.fontHeading,
    '--font-mono': typography.fontMono,
    '--font-size-base': typography.baseSize,
    '--font-scale': scaleFactor,
    '--line-height-base': typography.lineHeight,
    '--letter-spacing-base': typography.letterSpacing,
  };

  for (const [name, value] of Object.entries(vars)) {
    if (value) {
      root.style.setProperty(name, value);
    }
  }
}

// True once we have an access token (or confirmed no session)
const AuthReadyContext = createContext(false);
export const useAuthReady = () => useContext(AuthReadyContext);

type Props = {
  children: ReactNode;
  initialSession?: any;
};

export function AppProviders({ children, initialSession }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const designMode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    setMounted(true);
    applySmsTypographyVars();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={auth.client} initialSession={initialSession}>
        <KeyboardProvider>
          <NajmDesignProvider config={smsDesignConfig} mode={designMode} className="h-full w-full">
            {children}
          </NajmDesignProvider>
        </KeyboardProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
