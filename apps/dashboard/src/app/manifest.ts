import type { MetadataRoute } from 'next'
import { schoolApp, SCHOOL_HOME_PATH } from '@/najm.config';
import { loadSettings } from '@/najm.server';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { school } = await loadSettings();
  const name = school.schoolName || schoolApp.appName;
  return {
    id: '/',
    name,
    short_name: name,
    description: 'School management',
    start_url: SCHOOL_HOME_PATH,
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [192, 512].map((size) => ({
      src: `/app-icons/${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    })),
  }
}
