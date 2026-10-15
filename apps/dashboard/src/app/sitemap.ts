import type { MetadataRoute } from 'next';
import { landingOrigin } from '@/features/Landing/config/landingOrigin';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = landingOrigin(); if (!origin) return [];
  const { loadSchoolLandingContent } = await import('@sms/server');
  if (!(await loadSchoolLandingContent()).published) return [];
  return [{ url: new URL('/',origin).href }];
}
