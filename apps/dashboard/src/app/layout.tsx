import type { Viewport } from "next";
import { NajmPwaRegistration } from 'najm-next/pwa/react';
import "@/styles/globals.css";
import "flag-icons/css/flag-icons.min.css";
import 'najm-theme/styles.css';
import localFont from 'next/font/local'
import { AppProviders } from '@/providers/AppProviders';
import { loadUiSnapshot } from '@/najm.server';
import NajmClientRoot from '@/components/NajmClientRoot';
import { AcademicYearSelectionOwner } from '@/features/AcademicYears/components/AcademicYearSelectionOwner';
import { RenderedActiveAcademicYearProvider } from '@/features/Settings/context/RenderedActiveAcademicYear';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

const lora = localFont({
  src: './fonts/Lora.ttf',
  weight: '400 700',
  display: 'swap',
  variable: '--font-lora',
})

const robotoMono = localFont({
  src: './fonts/RobotoMono.ttf',
  weight: '400 700',
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default async function RootLayout({ children,}: Readonly<{children: React.ReactNode;}>) {

  const snapshot = await loadUiSnapshot();
  const { preferences, settings } = snapshot;

  return (
    <html
      className={preferences.theme === 'dark' ? 'dark' : undefined}
      data-time-zone={preferences.timeZone}
      dir={preferences.direction}
      lang={preferences.language}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className={`${lora.className} ${lora.variable} ${robotoMono.variable} antialiased  h-screen w-screen overflow-hidden`}>
        <AppProviders snapshot={snapshot}>
          {/* The active year's label comes from the per-request School
              settings read, so the first render already knows it. The
              selection owner holds the tab's viewing year for pages and for
              the dialogs NajmClientRoot renders alike. */}
          <RenderedActiveAcademicYearProvider value={settings.activeAcademicYear}>
            <AcademicYearSelectionOwner />
            {children}
            <NajmClientRoot />
          </RenderedActiveAcademicYearProvider>
          <NajmPwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
