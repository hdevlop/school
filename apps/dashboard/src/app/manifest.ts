import type { MetadataRoute } from 'next'

// No `icons`: School's logos are per-school branding stored at runtime, and
// the static `/icon-192x192.png` and `/icon-512x512.png` this listed never
// existed, so every page logged a 404. Add them here with real brand files.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyScolAI',
    short_name: 'MyScolAI',
    description: 'School management',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
  }
}
