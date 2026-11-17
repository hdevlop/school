import { env } from '@sms/server/env';
import { androidAssetLinks } from '@/lib/androidAssetLinks';

export const dynamic = 'force-dynamic';

/** Read by Android to verify the School Android app; public by design. */
export function GET() {
  return Response.json(androidAssetLinks({ ANDROID_APP_PACKAGE: env.android.packageName, ANDROID_APP_SHA256: env.android.sha256 }), {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  });
}
