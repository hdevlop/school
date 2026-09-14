import type { Viewport } from "next";
import { NajmPwaRegistration } from 'najm-next/pwa/react';
import "@/styles/globals.css";
import "flag-icons/css/flag-icons.min.css";
import 'najm-theme/styles.css';
import { Lora, Roboto_Mono } from 'next/font/google'
import { AppProviders } from './providers';
import { loadUiSnapshot } from '@/najm.server';
import NajmClientRoot from '@/components/NajmClientRoot';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

const lora = Lora({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-lora',
})

const robotoMono = Roboto_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto-mono',
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snapshot = await loadUiSnapshot();
  const { preferences } = snapshot;

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
          {children}
          <NajmClientRoot />
          <NajmPwaRegistration />
        </AppProviders>
      </body>
    </html>
  );
}
