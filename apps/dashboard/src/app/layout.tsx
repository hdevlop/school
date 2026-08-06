import type { Viewport } from "next";
import "@/styles/globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Lora, Roboto_Mono } from 'next/font/google'
import { AppProviders } from './providers';
import { auth } from '@/lib/auth';
import { ThemeProvider } from '@/providers/themeProvider';
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
  const session = await auth.getSession().catch(() => {
  
    return null;
  });


  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${lora.className} ${lora.variable} ${robotoMono.variable} antialiased  h-screen w-screen overflow-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AppProviders initialSession={session}>
            {children}
            <NajmClientRoot />
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
