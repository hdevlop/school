# Android app (TWA)

Some Android phones — Xiaomi, Redmi and POCO on MIUI/HyperOS above all — block
the home-screen shortcut a PWA install creates, so "Install app" appears to work
and no icon shows up. The Android app avoids that: it is a real APK that opens
the School site in Chrome full screen (a Trusted Web Activity). It is the same
site, sign-in and push notifications; there is no second codebase, and a site
deploy updates the app's content with no new APK.

## Requirements

- The school site is online on its final **HTTPS** domain. The app is bound to
  that domain; each school domain needs its own app build.
- `https://<domain>/manifest.webmanifest` and
  `https://<domain>/.well-known/assetlinks.json` are reachable.

## 1. Build the app

1. Open <https://www.pwabuilder.com>, enter `https://<domain>`, start.
2. Choose **Package for stores → Android → Generate package**. Options:
   - **Package ID**: e.g. `com.myscolai.app` (or `com.myscolai.<school>`).
     It can never change after publishing.
   - **App name / short name**: the school's name.
   - **Signing key**: *Create new*. Fill in name and organisation.
   - **Fallback behavior**: *Web view*, for phones whose Chrome is disabled.
   - **Notification delegation**: on (keeps push notifications working).
3. Download the zip. It contains:
   - `app-release-signed.apk` — install this on phones directly;
   - `app-release-bundle.aab` — upload this to Google Play;
   - `signing.keystore` and `signing-key-info.txt` — **the key and its passwords**;
   - `assetlinks.json` — the package name and fingerprint for step 2.

> Keep `signing.keystore` and `signing-key-info.txt` safe and backed up
> outside the repository. Without them no update of the app can ever be
> installed over the existing one. Never commit them.

### Or build locally with Bubblewrap

Installed on the developer PC: `npm i -g @bubblewrap/cli`, a portable JDK 17
in `~/.bubblewrap/jdk`, the Android command-line tools in
`~/.bubblewrap/android_sdk` (with `build-tools;36.1.0`, `platforms;android-36`,
licenses accepted), and `~/.bubblewrap/config.json` pointing at both.
`bubblewrap doctor` must say both paths are valid.

Each school's project lives **outside this repository**, next to its key —
JHL's is `C:\Users\pc\Desktop\jhlschool-android` (package `com.jhlschool.app`,
alias `jhlschool`, passwords in its `signing-key-info.txt`). To ship a new
version, raise `appVersionCode` (and `appVersionName`) in its
`twa-manifest.json`, then in that folder:

```sh
export BUBBLEWRAP_KEYSTORE_PASSWORD=... BUBBLEWRAP_KEY_PASSWORD=...
bubblewrap update        # pulls the site's current manifest, icons, name
bubblewrap build --skipPwaValidation
```

Known snags on this machine:

- `'gradlew.bat' is not recognized`: the shell sets
  `NoDefaultCurrentDirectoryInExePath`; `unset` it for the build.
- `minSdkVersion 21 cannot be smaller than version 24`: set
  `"minSdkVersion": 24` in `twa-manifest.json` (Android 7+).
- The `.aab` signing step needs `jarsigner` on `PATH`
  (`~/.bubblewrap/jdk/bin`), or sign it by hand with the same key.

Content changes never need a new APK; rebuild only for the name, icon,
colours or Android settings.

## 2. Link the app to the site

From the downloaded `assetlinks.json`, copy `package_name` and the value in
`sha256_cert_fingerprints` into the server's `apps/dashboard/.env.local`:

```
ANDROID_APP_PACKAGE=com.myscolai.app
ANDROID_APP_SHA256=AB:CD:...:EF
```

Restart the app and check `https://<domain>/.well-known/assetlinks.json` shows
them. Without this the app still works but shows an address bar at the top.

If the app is published on Google Play with Play App Signing, Google re-signs
it: add the **App signing key certificate** SHA-256 from Play Console → *Test
and release → App integrity* as a second, comma-separated value.

## 3. Give it to teachers

- **Google Play** (recommended, one-time $25 developer account): upload the
  `.aab`. Teachers install and update it like any app; no warnings.
- **Direct APK**: share `app-release-signed.apk` (WhatsApp, the school site,
  a QR code). On Xiaomi the phone asks to allow installing apps from that
  source (WhatsApp, Files...) once; accept, then install. Updates must be
  shared the same way and signed with the same key.

## Checking a phone

Open the app. No address bar at the top means the link is verified. An address
bar means `assetlinks.json` does not match the installed APK's key — compare
the fingerprint, and for Play installs, add Google's signing key (step 2).
