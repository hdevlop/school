import { describe, expect, it } from 'bun:test';
import { androidApkPath, androidAssetLinks } from '@/lib/androidAssetLinks';

const FP = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join(':');

describe('Android asset links', () => {
  it('links no app until one is configured', () => {
    expect(androidAssetLinks({})).toEqual([]);
    expect(androidAssetLinks({ ANDROID_APP_PACKAGE: ' ', ANDROID_APP_SHA256: '' })).toEqual([]);
  });

  it('names the package and every fingerprint, normalised and deduplicated', () => {
    expect(androidAssetLinks({ ANDROID_APP_PACKAGE: 'com.myscolai.app', ANDROID_APP_SHA256: `${FP}, ${FP.toUpperCase()}` })).toEqual([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: 'com.myscolai.app', sha256_cert_fingerprints: [FP.toUpperCase()] },
    }]);
  });

  it.each([
    [{ ANDROID_APP_PACKAGE: 'com.myscolai.app' }],
    [{ ANDROID_APP_SHA256: FP }],
    [{ ANDROID_APP_PACKAGE: 'myscolai', ANDROID_APP_SHA256: FP }],
    [{ ANDROID_APP_PACKAGE: 'com.myscolai.app', ANDROID_APP_SHA256: 'AB:CD' }],
  ])('refuses a half or malformed configuration: %o', (env) => {
    expect(() => androidAssetLinks(env)).toThrow();
  });
});

describe('Android app download', () => {
  const present = (href: string) => href === '/android/com.jhlschool.app.apk';

  it('offers the APK only when the installation names its app and ships the file', () => {
    expect(androidApkPath({ ANDROID_APP_PACKAGE: 'com.jhlschool.app' }, present)).toBe('/android/com.jhlschool.app.apk');
    expect(androidApkPath({ ANDROID_APP_PACKAGE: 'com.myscolai.app' }, present)).toBeNull();
    expect(androidApkPath({}, present)).toBeNull();
  });

  it('never builds a path from a malformed package name', () => {
    const seen: string[] = [];
    expect(androidApkPath({ ANDROID_APP_PACKAGE: '../../secret' }, (href) => { seen.push(href); return true; })).toBeNull();
    expect(seen).toEqual([]);
  });

  it('ships the JHL app in the public folder', () => {
    expect(androidApkPath({ ANDROID_APP_PACKAGE: 'com.jhlschool.app' }, (href) => Bun.file(`apps/dashboard/public${href}`).size > 1_000_000)).not.toBeNull();
  });
});
