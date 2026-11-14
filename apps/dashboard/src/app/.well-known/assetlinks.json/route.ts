import { androidAssetLinks } from '@/lib/androidAssetLinks';

export const dynamic = 'force-dynamic';

/** Read by Android to verify the School Android app; public by design. */
export function GET() {
  const { ANDROID_APP_PACKAGE, ANDROID_APP_SHA256 } = process.env;
  return Response.json(androidAssetLinks({ ANDROID_APP_PACKAGE, ANDROID_APP_SHA256 }), {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  });
}
