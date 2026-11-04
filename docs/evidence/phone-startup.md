# Phone startup

Measured on 2026-11-04, after JHL's first production day: on phones such as Redmi,
the login page kept coming back and Home was slow.

## Causes

- **The login page came back.** "Keep me logged in" started unchecked, which makes
  the sign-in cookies last only until the browser closes. Removing every cookie with
  no expiry, as closing the browser does, sent `/home` to `/login`. With the box
  checked, Home opened directly. That the Redmi really drops them is still to be
  confirmed on the device.
- **Home waited for everything.** The tiles appeared only after all the JavaScript
  had started, the token had refreshed and the browser had asked for the sidebar
  order. First paint was already at 1 to 2.5 s; the tiles came up to 14 s later.
- **Every load downloaded the offline data again.** `@Headers('X-Language')` read
  undefined, because najm-core 3.1.0 looks names up in a lowercased map. So each
  snapshot was labelled `en`, and a browser in French or Arabic always found its copy
  stale. That was 14 API calls and 3.7 MB per load on the local data. An English
  school never saw it, which is why the demo did not show it and JHL did.
- **Images were far larger than their use.** Generated 1254 px PNGs of about 1 MB sat
  behind 56 px avatars and logos, and the sign-in page downloaded a 1.3 MB hero that
  phones never show.

## Changes

| Change | Where |
| --- | --- |
| "Keep me logged in" starts checked | `app/(auth)/login/loginDefaults.ts` |
| Tiles in the first HTML: the root layout reads the sidebar order and seeds the query | `najm.server.ts`, `features/Roles/context/SidebarOrderSeed.tsx` |
| Offline downloads labelled in the requested language | `modules/offline/OfflineController.ts`; the cause is fixed for later versions in najm-core |
| One fewer renewal on load | `offline/OfflineRuntime.tsx` |
| Hero is lazy, so a phone skips it | `app/(auth)/AuthFrame.tsx` |
| Chatbot and settings and profile sheets load when first shown | `shared/DashboardShell/index.tsx`, `features/Home/components/MobileHome.tsx` |
| Portraits 216 px and fee icons 192 px, 256-colour PNG | `public/images` |
| Logos 512 and 320 px; hero and sign-in backgrounds WebP | `packages/server/src/theme`, `public/images` |
| Fonts WOFF2; Roboto Mono no longer preloaded | `app/fonts`, `app/layout.tsx` |
| A day's caching for portraits, fee icons and sign-in backgrounds | `next.config.ts` |
| Limits on the sizes above | `tests/shared/imageBudget.test.ts` |

Originals remain in git history. flag-icons was left alone: its stylesheet is 28 KB
before compression.

## Results

An emulated phone in headless Chromium: 393 x 873, Android user agent, service worker
blocked so that throttling applies, admin role, medians of three.

Home ran against the demo over the internet, before and after, signed in. The login
page ran against JHL, before and after. The offline traffic ran against a local
production build, because the demo's English interface never had that problem.

| Tiles visible | Before | After |
| --- | --- | --- |
| Returning visit, Fast 4G, CPU 4x slower | 4.5 s | 0.9 s |
| Returning visit, Slow 4G, CPU 6x slower | 5.2 s | 1.2 s |
| First visit, Slow 4G, CPU 6x slower | 16.5 s | 3.8 s (icons by 5.5 s) |

| App ready, when the first sign-in call starts | Before | After |
| --- | --- | --- |
| Returning visit, Fast 4G, CPU 4x slower | 2.3 s | 1.9 s |
| Returning visit, Slow 4G, CPU 6x slower | 3.7 s | 3.0 s |
| First visit, Slow 4G, CPU 6x slower | 15.1 s | 10.8 s |

| Other | Before | After |
| --- | --- | --- |
| JHL login page load, first visit, Slow 4G, CPU 6x slower | 26 to 29 s | 8.7 to 9.3 s |
| JHL login page load, first visit, Fast 4G, CPU 4x slower | 10.0 s | 2.8 s |
| Images on JHL's login page | 3,062 KB | 60 KB |
| Offline traffic on a reload, French interface | 14 calls, 3.7 MB | 2 calls, 2 KB |
| `/api/navigation/sidebar` calls per load | 1 | 0 |

Tiles are ordinary links until the page hydrates, so they work as soon as they show.

On the demo after the change, the session check took 193 ms at the median and up to
876 ms, about a third of a page's 602 ms median server wait.

## Release

Deployed to JHL on 2026-11-04 as `d9da051`, taking it from `eebf211`, with no pending
migrations. The owner chose to deploy without an off-server backup, so the deploy log's
"backup done" is only the `--yes` flag's stock answer. Previous image:
`ghcr.io/hdevlop/school@sha256:195edba3fbe1...`, in the deploy log and Dokploy.

Checked on JHL: the revision, `/login`, `/api/health/status`, the `www` redirect, and an
emulated phone's login page with no browser errors. Not checked on JHL: signed-in pages,
the worker image and heartbeat, and mail delivery.

## Reading production

- **Server-Timing.** Every page answers `Server-Timing: session;dur=...`, the session
  check including its recovery call. A page's server wait minus that is the render.
- **`[school] slow first-render read`** in the logs names a settings, year or sidebar
  read that took 500 ms or more.
- **`[school] session recovery failed`** marks a login redirect caused by a passing
  server problem, not by being signed out.

JHL's signed-in loads waited up to 5.6 s on the server before these changes. The
repeated offline downloads are the likely cause, because they run heavy reads on every
load, but that is not proven until it is measured on JHL.

## Offline removed

School no longer reads offline; see the migration
`0099_remove_offline_reads.sql`. The measurements above were taken while it existed.
The worker remains only for push notifications and a plain page when a site cannot
be reached. The app can still be installed to the home screen.

Each page load deletes what a device still holds from that feature
(`lib/retiredOfflineData.ts`), because nothing else ever would. Going back to an image
from before this removal still works online, but its offline downloads will fail.

## Still open

- Whether the Redmi drops session cookies, which only the device can show.
- JHL's own signed-in timings, which need a JHL login.
- The JavaScript itself. `@sms/contracts/locales` sends all four languages to every
  page (284 KB compressed, about 210 KB of it unused), and najm-kit is one bundle of
  368 KB. Sending one language needs najm-i18n to load a catalog asynchronously,
  because the provider needs one on its first render and putting it in the HTML would
  slow every return visit.
- The proxy answers a passing recovery failure with a login redirect, where server
  components show an error instead. Najm offers no option to let the request through.
