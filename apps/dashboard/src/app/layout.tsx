import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import "flag-icons/css/flag-icons.min.css";
import 'najm-theme/styles.css';
import localFont from 'next/font/local'
import { headers } from 'next/headers';
import { NAJM_NONCE_HEADER } from 'najm-next/security';
import { AuthBootRefresh } from '@/components/AuthBootRefresh';
import { AppProviders } from '@/providers/AppProviders';
import { loadSidebarOrderSeed, loadUiSnapshot } from '@/najm.server';
import NajmClientRoot from '@/components/NajmClientRoot';
import { AcademicYearSelectionOwner } from '@/features/AcademicYears/components/AcademicYearSelectionOwner';
import { RenderedActiveAcademicYearProvider } from '@/features/Settings/context/RenderedActiveAcademicYear';

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/app-icons/32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/app-icons/180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

const lora = localFont({
  src: './fonts/Lora.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-lora',
})

const robotoMono = localFont({
  src: './fonts/RobotoMono.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-roboto-mono',
  // Only codes and ids in some lists use it, so the page does not wait for it.
  preload: false,
})

export default async function RootLayout({ children,}: Readonly<{children: React.ReactNode;}>) {

  const snapshot = await loadUiSnapshot();
  const { preferences, settings } = snapshot;
  const sidebarOrderSeed = await loadSidebarOrderSeed(snapshot.session?.user?.id);
  // Signed in, the auth client is hydrated without an access token and
  // refreshes as it starts; the server HTML starts that refresh (najm.auth.ts).
  // Signed out there is no refresh to start.
  const signedIn = Boolean(snapshot.session?.user);
  const nonce = signedIn ? (await headers()).get(NAJM_NONCE_HEADER) ?? undefined : undefined;

  return (
    <html
      className={preferences.theme === 'dark' ? 'dark' : undefined}
      data-time-zone={preferences.timeZone}
      dir={preferences.direction}
      lang={preferences.language}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className={`${lora.className} ${lora.variable} ${robotoMono.variable} antialiased  h-screen w-screen overflow-hidden`}>
        {signedIn && <AuthBootRefresh nonce={nonce} />}
        <AppProviders snapshot={snapshot} sidebarOrderSeed={sidebarOrderSeed}>
          {/* The active year's label comes from the per-request School
              settings read, so the first render already knows it. The
              selection owner holds the tab's viewing year for pages and for
              the dialogs NajmClientRoot renders alike. */}
          <RenderedActiveAcademicYearProvider value={settings.activeAcademicYear}>
            <AcademicYearSelectionOwner />
            {children}
            <NajmClientRoot />
          </RenderedActiveAcademicYearProvider>
        </AppProviders>
      </body>
    </html>
  );
}
