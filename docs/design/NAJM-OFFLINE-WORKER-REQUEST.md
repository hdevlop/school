# Najm worker capability request

School consumer: published `najm-next@0.13.0`. This file is the handoff for the two Najm capabilities below.

**Status (2026-10-24): released and adopted.** Both capabilities shipped in `najm-next@0.14.0` (Najm `c9f6b16`, release `2a3efa6`; registry integrity matches the packed tarball). School pins `0.14.0`, and `apps/dashboard/src/app/sw.js/route.ts` sets `otherDocuments: 'offlineDocument'` and `installBudget: { attempts: 3, windowMs: 86_400_000 }`.

- `test-offline-install.mjs` now asserts that five browser update checks download a broken version exactly three times, and that a fresh app opening doesn't refill the worker's limit.
- `test-offline-fallback.mjs` (part of `test:offline:browser`) is the School version of the acceptance below.
- The real Next registration test now also checks the sign-in redirect and branded unlisted pages. It hasn't run on the 0.14.0 build yet, because local PostgreSQL stopped answering connections.

Pre-release candidate acceptance: `.cache/offline-najm-candidate/run.mjs` (ignored; log `run.log`) ran School's real shell and these exact worker options on the locally built candidate. It passed in Chromium, Firefox and WebKit:
- With the origin process stopped and connectivity on, `/`, `/welcome`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/change-password`, `/public-page`, `/academic-year-migration` and an arbitrary path load the branded offline page, including on reload.
- `/home` and `/students/*` keep the shell, and `/api` stays a browser error.
- An evicted shell gives the branded page.
- Online 200, 404, auth redirects and downloads are unchanged.
- Five `registration.update()` checks of a broken build download its missing asset three times, and the active worker stays.

Najm's own unit tests and its three-engine browser runs are recorded in its `docs/tests/pwa-navigation.md` and `docs/tests/pwa-staged-updates.md`.

## Branded fallback for all uncovered document navigations

School's allowlist selects its independent application shell. Every other same-origin document navigation should retain the configured public `offlineDocument` on an actual connection failure, rather than the browser error page. This includes `/`, `/welcome`, `/public-page`, `/academic-year-migration`, sign-in/recovery routes and arbitrary unlisted paths. Do not add those paths to School's private shell just to obtain an error page.

Requested public contract: preserve the explicit shell allowlist and add a document-only public fallback for its complement. Continue excluding API/auth API requests, RSC/prefetch, downloads, static assets, worker scripts and other origins. Preserve real HTTP responses, including 401/403/404/5xx and redirects; an actual server response is not a connection failure. Do not cache authenticated documents. A slow uncovered page must not become an offline success solely because the shell deadline elapsed.

Acceptance: complete preparation; stop the real origin server while browser connectivity stays enabled; open/reload each named path and an arbitrary unlisted path; verify branded fallback rather than a browser error. Repeat for an incomplete/evicted shell. Confirm supported shell documents still use the shell; real auth redirects and HTTP errors are unchanged; API/RSC/download requests are never replaced by HTML. Run installed Android/iOS and supported desktop migration cases before School deployment. This is a School deployment blocker.

## Bound failed downloads initiated by browser update checks

School caps its explicit registration attempts across tabs. That does not govern the browser's own service-worker update checks on an existing registration. A failing staged update can therefore run `candidate.addAll(PRECACHE)` again after School has stopped calling `register`. Do not unregister a working worker or remove user data to enforce a scheduling policy.

Request a persistent, atomic failure/attempt budget at the worker install boundary, keyed by cache ID and immutable version, shared across installers/tabs and automatic browser checks. Reserve before asset download, keep a slow live install pending rather than counting a timer as a failed download, retain the old working generation on failure, and define safe recovery/reset behavior for a genuinely new app opening or new version. An explicit limit must not disable message handling, dirty-editor consent, pins or the old active worker. The public reset contract must not let each new tab silently refill a failed version's budget. Bound stale reservations after a killed install without guessing that a suspended tab is closed.

School's retained missing-file test includes an older active worker and an explicit `registration.update()` as a deterministic proxy for a browser-started update check. It must report School attempt counts separately from total failed installs/transferred bytes. Until a published worker-side contract and that acceptance pass, the three-attempt claim applies only to School's own calls. Resolve the total-download budget before claiming the mobile-data limit or releasing broadly.
