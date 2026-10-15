import type { MetadataRoute } from 'next';
import { landingOrigin } from '@/features/Landing/config/landingOrigin';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const origin = landingOrigin();
  return { rules: [{ userAgent: '*', disallow: '/', allow: ['/welcome','/_next/','/images/','/api/branding/assets/','/api/branding/factory/'] }],
    ...(origin ? { sitemap: new URL('/sitemap.xml',origin).href } : {}) };
}
