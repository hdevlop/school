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

"Before" ran against the demo over the internet, and JHL's login page for that row.
"After" ran against a local production build, whose server wait is about 60 ms against
about 500 to 600 ms on the demo, so real times will be somewhat higher.

| Tiles visible | Before | After |
| --- | --- | --- |
| Returning visit, Fast 4G, CPU 4x slower | 4.5 s | 0.6 s |
| Returning visit, Slow 4G, CPU 6x slower | 5.2 s | 1.3 s |
| First visit, Slow 4G, CPU 6x slower | 16.5 s | 2.2 s (icons by 5 s) |

| App ready, when the first sign-in call starts | Before | After |
| --- | --- | --- |
| Returning visit, Fast 4G, CPU 4x slower | 2.3 s | 1.7 s |
| Returning visit, Slow 4G, CPU 6x slower | 3.7 s | 3.1 s |
| First visit, Slow 4G, CPU 6x slower | 15.1 s | 10.4 s |

| Other | Before | After |
| --- | --- | --- |
| Login page load, first visit, Slow 4G, CPU 6x slower | 26 to 29 s | 8.5 s |
| Images on the login page | 3,062 KB | 60 KB |
| Offline traffic on a reload, French interface | 14 calls, 3.7 MB | 2 calls, 2 KB |
| `/api/navigation/sidebar` calls per load | 1 | 0 |

Tiles are ordinary links until the page hydrates, so they work as soon as they show.

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

## Verification

On the final code: `bun run lint`, `typecheck`, `i18n:check`, `test` (2,640 tests),
`db:check`, `build`, `test:offline:transport` and the role sidebar script pass. So do
`test:offline:renewal`, `navigation`, `recovery`, `test-offline-startup` and
`test-offline-fallback`.

Four offline browser tests fail. All four failed at the same step on an untouched
checkout of the previous commit (2eb9484), so they do not come from this work:

| Test | Failure |
| --- | --- |
| `test-offline-shell` | No `Academic` button in the offline sidebar |
| `test:offline:session` | The stopped-server sidebar shows no feature icons |
| `test:offline:reads` | No `change class or section` button |
| `test:offline:lifecycle` | "Authoritative replacement did not arrive" after reconnecting |

## Still open

- The four failing offline browser tests above. The lifecycle one matters most now:
  after reconnecting, a fresh offline copy is kept for up to 15 minutes rather than
  replaced. French and Arabic schools used to hide this by downloading on every load.
- Whether the Redmi drops session cookies, which only the device can show.
- JHL's own timings after a deploy.
- The JavaScript itself. `@sms/contracts/locales` sends all four languages to every
  page (284 KB compressed, about 210 KB of it unused), and najm-kit is one bundle of
  368 KB. Sending one language needs najm-i18n to load a catalog asynchronously,
  because the provider needs one on its first render and putting it in the HTML would
  slow every return visit.
- Two `/api/offline/grant` calls per load, from the renewal on start and the one after
  the first token refresh. They are small, and removing one needs a guard in najm-offline.
- The proxy answers a passing recovery failure with a login redirect, where server
  components show an error instead. Najm offers no option to let the request through.
