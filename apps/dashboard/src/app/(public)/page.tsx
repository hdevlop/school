import type { Metadata, ResolvingMetadata, Viewport } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession, loadUiSnapshot } from '@/najm.server';
import { schoolApp } from '@/najm.config';
import { schoolI18n, type SchoolLocale } from '@sms/contracts/locales';
import { LandingPage } from '@/features/Landing/components/LandingPage';
import { landingOrigin } from '@/features/Landing/config/landingOrigin';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true };
const load = cache(async () => {
  const { loadSchoolLandingProfile, loadLandingCycles, loadSchoolLandingContent } = await import('@sms/server');
  const [session, snapshot, profile, cycles, content] = await Promise.all([getSession(), loadUiSnapshot(), loadSchoolLandingProfile(), loadLandingCycles(), loadSchoolLandingContent()]);
  if (!content.published) notFound();
  return { session, snapshot, profile, cycles, content };
});
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { profile, snapshot } = await load();
  const title = `${profile?.schoolName || schoolApp.appName} — ${schoolI18n.translate(snapshot.preferences.language, 'landing.meta.tagline')}`;
  const description = schoolI18n.translate(snapshot.preferences.language, 'landing.meta.description');
  const origin = landingOrigin();
  return { title, description, metadataBase: origin, icons: { ...(await parent).icons, icon: snapshot.branding.slots.authLogo ?? undefined }, alternates: { canonical: '/' }, openGraph: { title, description, images: ['/images/landing/og.webp'] } };
}
export default async function SchoolLanding() {
  const { profile, cycles, content, session, snapshot } = await load();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'School', name: profile?.schoolName || schoolApp.appName,
    ...(profile?.schoolAddress ? { address: profile.schoolAddress } : {}), ...(profile?.schoolPhone ? { telephone: profile.schoolPhone } : {}),
    ...(profile?.schoolAddressLatitude != null && profile.schoolAddressLongitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: profile.schoolAddressLatitude, longitude: profile.schoolAddressLongitude } } : {}) };
  return <><script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <LandingPage profile={profile} cycles={cycles} content={content} signedIn={!!session} language={snapshot.preferences.language}
      defaultLanguage={schoolI18n.supportedLanguages.includes(snapshot.settings.school.language as SchoolLocale) ? snapshot.settings.school.language as SchoolLocale : 'en'} /></>;
}
