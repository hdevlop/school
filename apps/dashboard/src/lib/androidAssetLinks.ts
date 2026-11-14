/**
 * Digital Asset Links for the Android app (a Trusted Web Activity wrapping this
 * site). Android shows the app full screen only when this file names the app's
 * package and the SHA-256 of the key that signed it; otherwise the app opens
 * with a browser address bar. Some phones (Xiaomi/Redmi on MIUI or HyperOS)
 * block home-screen PWA shortcuts, and a real app is not affected by that.
 *
 * ANDROID_APP_PACKAGE   e.g. com.myscolai.app
 * ANDROID_APP_SHA256    one or more fingerprints, comma separated: the upload
 *                       key and, with Play App Signing, Google's signing key.
 */

const PACKAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export interface AssetLinksEnv {
  ANDROID_APP_PACKAGE?: string;
  ANDROID_APP_SHA256?: string;
}

export type AssetLinkStatement = {
  relation: ['delegate_permission/common.handle_all_urls'];
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] };
};

/**
 * Where this site serves its Android app: `public/android/<package>.apk`.
 * Null unless the installation names its app and the file is actually there.
 */
export function androidApkPath(env: Pick<AssetLinksEnv, 'ANDROID_APP_PACKAGE'>, exists: (publicPath: string) => boolean) {
  const packageName = env.ANDROID_APP_PACKAGE?.trim();
  if (!packageName || !PACKAGE_NAME.test(packageName)) return null;
  const href = `/android/${packageName}.apk`;
  return exists(href) ? href : null;
}

/** An empty list (no linked app) unless both values are set; a malformed value throws. */
export function androidAssetLinks(env: AssetLinksEnv): AssetLinkStatement[] {
  const packageName = env.ANDROID_APP_PACKAGE?.trim();
  const fingerprints = (env.ANDROID_APP_SHA256 ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  if (!packageName && fingerprints.length === 0) return [];
  if (!packageName || !PACKAGE_NAME.test(packageName)) {
    throw new Error('ANDROID_APP_PACKAGE must be an Android package name such as com.myscolai.app.');
  }
  const invalid = fingerprints.find((value) => !FINGERPRINT.test(value));
  if (fingerprints.length === 0 || invalid) {
    throw new Error('ANDROID_APP_SHA256 must list SHA-256 fingerprints as 32 colon-separated hex pairs.');
  }
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: [...new Set(fingerprints)] },
  }];
}
