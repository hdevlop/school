# Offline application and read acceptance

Updated: 2026-10-23. Phase 0 is in progress; Phase 1 has not started.

## Implemented scope

- Published `najm-next@0.13.0` and `najm-kit@3.7.0` adopted through exact root/workspace pins and the Bun lockfile.
- The neutral entry mounts exactly one `NajmAppProvider` with the public UI runtime, query/auth contexts, the same i18n/table defaults and existing `NSidebar`. Its session is null; it never fabricates a cached online login. The existing StudentProfile mounts through public build-only navigation/link/image adapters with explicit unavailable-data errors. No feature module files were changed.
- Bun packages the JavaScript entry and every emitted stylesheet/asset, including Leaflet CSS, School globals, Najm theme styles, flags and local fonts. The build checks compiled Tailwind utilities and every non-data CSS URL against the manifest. The generated HTML has a fixed CSP before its script. Unsupported `next/*` imports fail the build. Production generates the manifest before Next; browser environment references contain no server environment.
- The existing Najm worker uses bounded document fallback and staged updates, retaining its push integration. API/auth/RSC requests are excluded by the package worker.
- School's `OfflinePreparation` is the sole explicit registration owner. It registers after hydration on any route and silently retries after 2 s and 5 s, then stops after three failed School preparation attempts for that version across all open School tabs. Web Locks serialize attempts and identify the open-app lifetime; localStorage reserves attempts before downloading. Reconnection cannot reset an exhausted budget. A live install stays pending beyond the registration watchdog; unmount cancels its wait. A new version or reopening after every tab closes may retry. Denied storage/locks stops retries; a browser without Web Locks gets one attempt per mount. Update consent/pins connect independently once a worker is active; offline link handling is independent too. There are no preparation, completion or failure/retry notices. Najm owns the worker/cache/consent protocol. Browser-started update checks on an existing registration can still install outside School's limit; the upstream budget request remains open.
- Waiting updates expose the existing Update application action before sign-in and inside the dashboard. Activation requires that action or natural activation after old clients close. Timeout/silence never identifies a legacy worker and never triggers automatic activation. This consent action is separate from silent preparation.
- The online provider stores only public display preferences/navigation/year metadata. Explicit Najm logout events clear it; a null user during transient refresh failure no longer deletes it. Account change replaces it. Successful Najm `tokenRefresh` events explicitly renew this display record without depending on `usePermissions()` callback identity. This localStorage record is an explicitly temporary display-only stopgap with an eight-hour browser expiry, not authorization. Before private reads, it must migrate to the replica access row with a fresh server-issued grant, the Najm transactional helper, and explicit eight-hour `maxOfflineDurationMs`; the stopgap is then removed.
- Worker and local navigation share `routes.ts`. Registered documents show honest data-unavailable content. StudentProfile's actual hooks and router Back control are fixture-proven; other real feature views and all private records remain out of scope for this increment.
- Ordinary anchor navigation from a disconnected online page uses document navigation so the worker can respond; local shell navigation uses History APIs and supports Back.
- Readiness asks the worker controlling the page to confirm its generation, marker and complete assets. Cached assets belonging to a waiting update cannot announce readiness for an older controller. Status checks fail closed for legacy/unresponsive workers; no product readiness notice is rendered. All online/shell windows connect the update client. A visible action requests activation; tracked input/change events, visible business forms/dialogs, persisted grade drafts and active online mutations withhold consent. Generic inline input stays conservatively dirty until reset/unmount or the tab closes. Open business forms/dialogs must be closed even after saving; native login fields use edit tracking. This is a conservative fallback until an authoritative shared form-dirty registry is available. Two-tab dirty/refusal/reset/success behavior is fixture-proven. No automatic reload occurs.
- Retention keeps all durable tab-pinned versions plus two unused generations; pins never expire by age. Each tab holds a Web Lock named after its pin for its document's life; the browser keeps it for a suspended tab and releases it for a closed, crashed or discarded one, so a pin with no held lock is reclaimed with its build. Without Web Locks, or when lock state is unreadable, no pin is reclaimed. Cleanup runs after successful consented activation and on startup after the controlling worker confirms the running generation and complete assets. Startup cleanup pauses while any update is installing/waiting, rechecks that condition before each deletion, excludes staging caches and rereads pins. IndexedDB is never deleted.
- The neutral-entry unavailable-data gate applies only to shared `api.get`, before token refresh, including after reconnection. Direct file fetches, auth calls, mutations and multipart transport are not gated. Some carry cookies; a null React session is not an authorization boundary. No private records are cached in Phase 0. Additional views/private reads require direct-transport and server-authorization acceptance plus the Phase-1 server compatibility handshake.
- The document fallback deadline is now ten seconds. A live but slow server can still trigger it; the cached entry checks the public health endpoint and offers an explicit online retry. The fixture delays response headers for twelve seconds with a thirty-second server idle timeout.
- Preference callbacks write the authoritative School preference cookies as well as the display snapshot. Empty-bootstrap strings are localized; a provider-language effect seeds the public document language/direction on startup (online HTML normally gets these from its server layout). Both online font variables are declared and both font files are used.
- Online bundle version is injected from the generated manifest during the production build, not inferred from a possibly newer manifest fetched after deployment. Its pin therefore protects the actual running generation. The start URL `/home` is included in prepared navigation when the account has permitted pages.
- Update requests are serialized in the UI with a disabled pending button and recoverable refusal text. Resetting one form clears only that form's tracked input; other unsaved fields and persisted grade drafts still withhold consent. Cache reclamation explicitly protects the activation target, including an older rollback target, in addition to every pinned version and two unused generations.
- Dirty-input checks drop disconnected fields and exempt semantic search controls and existing Najm table-filter/page-header search regions outside forms. Form fields and unknown inline editors still block. The browser test leaves search text populated through a successful activation while separately proving inline edits and grade drafts block it. Search parameters are memoized by the search string and the router object is stable; browser rerender/query/path tests cover their identities.
- The browser boundary policy explicitly includes the neutral entry and has a regression proving detection without a client directive.
- Existing feature modules, per-module API functions, server business modules, Next config and database schema were not changed.

## Commands

From the repository root:

### Test manually at localhost:3102

`bun run dev` does **not** register or update the production worker. An old worker already installed at that origin can still display the old inline "MyScolAI is offline" document after the development server stops. That screen does not demonstrate that the new shell was prepared.

Production runtime also requires a reachable, password-protected `REDIS_URL`. A build does not require Redis and therefore cannot prove runtime readiness. Missing Redis caused empty API 500 responses while the public pages/assets and worker still returned 200.

Windows local setup now uses the installed **Memurai Windows service on port 6379**, with startup type **Automatic**. Its password, AOF persistence, 96 MB limit and no-eviction policy are persisted in the service configuration. School's sole ignored `.env.local` uses that password. No manual Redis startup is needed after Windows boots. `bun run redis:check` requires anonymous PING to fail with NOAUTH before accepting authenticated PONG; a password-free server cannot pass. Windows Services owns its lifecycle; the temporary manual configure/start/stop scripts were removed. Memurai Developer is for development/testing and has a ten-day maximum uptime before requiring a restart; actual deployment keeps using the production Compose Redis service.

The previous standalone instance on port 6380 was retired. With no School app server running during the move, the two remaining cache entries were copied into the initially empty installed service using serialized-value verification and absolute expiry times. Expired entries were not revived. Its old local data and a backup of the installed service's original configuration remain in ignored `.cache/local-redis` for rollback; nothing was flushed. The service password/configuration was verified on disk, anonymous access was refused, Windows reported `Running` and `Auto`, and the old port 6380 had no listener. No Windows reboot was performed as part of verification.

The official installer was run by the user. Automatic approval review blocked this session's installer download/extraction command; the user subsequently completed the installer manually. The repo check script only probes the configured local service; it does not install software, change service settings or open firewall rules.

1. Stop the development server and run `bun run preview:offline` (checks the automatically started Redis service, builds the application, then starts the production server on port 3102).
2. While the server is running, open `http://localhost:3102/home` in the same browser/profile and sign in if needed. Reload to load the new application. If offered, choose **Update application** after saving/discarding changes and closing open forms.
3. If an older worker is active, choose **Update application** after saving/discarding changes and closing editors, or close all School tabs and installed windows and reopen while the server is running. Natural activation after clients close remains supported. Do not clear site storage or drafts.
4. Preparation is silent. Before an acceptance-test shutdown, inspect the controlling worker's `NAJM_PWA_STATUS` reply: protocol 1, cache ID `myscolai-shell`, `ready: true`, and cacheVersion matching `/offline-shell/manifest.json`. Also verify nonexpired display metadata in `school.offline-shell.v1`. The automated registration/session checks do this without a product test hook. Then stop the server and reload `/home`; records remain unavailable in Phase 0.

An uninterrupted Next development/HMR session is not the supported offline test target. Keep the same origin and profile: localhost and 127.0.0.1, different ports, and different profiles have separate preparation.

### Automated checks

```text
bun run test:offline
bun run test:config
bun run test:boundaries
bun run lint
bun run typecheck
bun run i18n:check
bun run build
bun run test:offline:registration
bun run test:offline:browser
bun run test:offline:install
```

`test:offline:browser` uses Node to drive Playwright and Bun to serve the production-built public assets and the actual worker route. It runs both the shell scenarios and a separate legacy-worker migration/server-shutdown regression in each selected engine. The shutdown regression terminates its fixture server and proves `/home` launch, reload and sidebar navigation while `navigator.onLine` remains true. WebKit profiles get short names (`scripts/offline-profile.mjs`): Playwright's Windows WebKit cannot write cached files more than 260 characters deep, and a long profile name made its installs fail. Node's Playwright driver avoids a Windows Bun pipe issue. These tests do not contact a school database, use actual credentials or seed users.

`test:offline:registration` requires a current production build. It starts with a legacy worker on an isolated loopback port, replaces the fixture server with the real Next production server on that same origin, and opens the actual login page. The application itself must register the replacement worker and expose its update action while signed out. The test activates through that action, checks the controlling worker protocol and absence of preparation notices, stops the Next process, and verifies `/home` launch and refresh with browser connectivity still enabled. Only synthetic display metadata is used, and the test never registers the replacement worker manually. This catches the production integration path bypassed by earlier fixture tests.

`bun run test:offline:session` is the opt-in real-session check, now retained at `apps/dashboard/scripts/test-offline-session.mjs`. It needs Node 24, the current production build, local PostgreSQL/Redis and an existing account. It loads the sole `.env.local`; set `OFFLINE_SESSION_EMAIL`/`OFFLINE_SESSION_PASSWORD` or use configured `ADMIN_EMAIL`/`ADMIN_PASSWORD`. It never seeds an account or changes school records. `NAJM_NEXT_DIST_DIR` selects the same build directory used by `bun run build` (default `.next`). It authenticates by REST, restores the session before opening `/home`, injects a transient manifest failure, asserts zero `/login` navigations and notices, then proves stopped-server reload and profile reopen. Session profiles/logs stay ignored under `.cache`.

`test:offline:install` uses the actual staged worker with one missing immutable asset and multiple tabs, without a school database. It checks the shared three-attempt School budget, refusal after reconnect/new peer, no published incomplete manifest, and new-version/fresh-opening retries. A delayed successful asset must stay one pending attempt beyond the watchdog. An older active worker is installed at the same script URL, then three injected preparation-validation failures exhaust School's budget; subsequent `registration.update()` calls deterministically model browser update checks and demonstrate that more installs can happen outside that budget while the old worker remains active. Natural browser checks may run too. Count School calls and total failed installs separately. HTTP caching is enabled by default; set `OFFLINE_ASSET_CACHE_CONTROL=no-store` to measure the uncached case. Server counters report asset requests and uncompressed response bytes, not compressed wire/mobile billing bytes.

Choose engines with `OFFLINE_BROWSERS=chromium,firefox,webkit`. On PowerShell:

```powershell
$env:OFFLINE_BROWSERS = 'chromium,firefox,webkit'
bun run test:offline:browser
Remove-Item Env:OFFLINE_BROWSERS
```

Playwright browser binaries must be installed for those engines. No browser installation occurs silently inside the test.

To exercise a served local production build, set `OFFLINE_ORIGIN` to its origin with a trailing slash before running the browser script. It still uses synthetic UI metadata, not real authenticated accounts. Real login redirects are preserved. Cleared-metadata coverage uses a cross-tab storage notification.

## Review correction verification (2026-10-23)

The corrections remove routine preparation notices from both the online runtime and neutral entry, add bounded silent retry, renew display metadata explicitly after successful token refresh, package the missing CSS/assets and CSP, reject unknown Next imports, and make waiting-worker activation explicit. Open custom forms/dialogs conservatively block activation until closed. No existing feature module, per-module API or server business module was edited in this correction; no private records are cached.

Verification artifacts are `.cache/offline-review-{build,typecheck,lint,boundaries,config,i18n,browser,startup,registration,session}.log`. The production build uses `NAJM_NEXT_DIST_DIR=.next-offline-review` to avoid replacing another local server's build. The browser harness checks computed Tailwind utility, Moroccan flag, theme and Leaflet styles inside the cached document, plus CSP presence. The real registration test uses worker status instead of visible success text. The separate existing-session check authenticates an existing local account via REST, restores that same session in a reopened profile, opens `/home` without `/login`, injects one transient manifest failure, and verifies silent retry and a stopped-server restart. Its isolated server points `NAJM_AUTH_INTERNAL_URL` to its own loopback port; it does not change the repository env file. It creates no school records.

| Check | Initial review-correction result (superseded where updated below) |
| --- | --- |
| Offline unit tests | PASS: 17 tests, 91 assertions |
| Config/contracts/dashboard tests | PASS: 649 tests, 4289 assertions |
| Boundaries/pins | PASS: 29 tests and graph check |
| Root lint | PASS; existing ParentsTable dependency warning only |
| Root typecheck | PASS |
| i18n | PASS |
| Production build | PASS: final shell `7feeb6d70a78f989644c` and isolated Next production build |
| Three-engine shell/CSS/CSP acceptance | PASS: Chromium, Firefox and WebKit on the final shell |
| Chromium/Firefox natural activation and real server shutdown | PASS after correcting the harness readiness prerequisite; see startup log |
| Real production-layout registration | PASS: explicit update action, internal worker readiness, no routine notice, stopped-server reload |
| Existing signed-in session, silent retry, server shutdown/reopen | PASS: zero `/login` navigations and zero preparation notices; existing local account, preserved locale |
| WebKit legacy migration; physical Android/iOS; deployment | NOT RUN / still open at the time. The WebKit migration has passed since 2026-10-24 (see below) |

The final three-engine shell checks passed, but the combined command initially failed the Firefox migration after shutdown: it had waited for `registration.active`, which can precede the document receiving control. The corrected startup harness requires the actual controlling worker to match the active worker and confirm complete assets before shutdown. The targeted Chromium/Firefox rerun passed; the failing combined log is retained, not reported as a passing command.

The final manifest contains 10 assets totaling 9,314,463 uncompressed bytes (2,763,794 bytes when each asset is gzip-compressed independently for measurement), including the complete flag styles/assets. This is a measured artifact size, not phone performance acceptance or proof of production compression. Lazy-route/chunk work and representative-device storage/download budgets remain required before Phase 2 expansion. The generated CSS has no remaining Tailwind directives and every external CSS asset URL is packaged. `apps/dashboard/scripts/build-offline.mjs` consumes all bundler outputs following the [Bun CSS asset contract](https://bun.sh/docs/bundler/loaders#css).

The support recovery sequence is to serve a compatible known-good worker at the same `/sw.js`, preserve old assets and stored work, then close all old School clients and reopen online. A worker-only unregister is a support fallback after preserving work; clearing site data is not part of recovery. Broken-worker recovery and real custom-editor lifecycle remain release acceptance gates. Auth/recovery-document branded fallback and navigation preload need a published Najm capability, not local edits to the read-only reference checkout. The follow-up corrections below supersede the stylesheet size and unlimited retry behavior from this earlier pass.

## Follow-up review corrections (2026-10-23)

The shell now selects only School's rectangular US, French, Spanish and Moroccan language flags from `flag-icons`. The build refuses a main stylesheet above 500,000 bytes; cached browser checks require all four flags and exclude the unused `xx` flag. Manifest `2f294f655ed2ccc62ee5` contains six assets plus its HTML document: **4,269,428 uncompressed bytes**, or 1,264,913 bytes when compressed independently with gzip for measurement. Main CSS is **427,847 bytes** (66,976 gzip); Leaflet CSS is a separate 15,278 bytes. The earlier 9,314,463-byte download is superseded. These are artifact measurements, not physical-phone acceptance or deployed compression evidence.

The missing-file regression passed with two concurrent tabs: only three installation attempts for the version, no incomplete ready marker, no reset on reconnect or a new peer, and renewed eligibility for a new version or fresh app opening. With immutable HTTP caching, the first three failures served 4,085,728 asset bytes and six successful asset responses; subsequent scenarios reused that cache. With `no-store`, three failures served **12,257,184 bytes** across 18 successful asset responses. The counters exclude the missing 404 body and worker-script traffic and are uncompressed response sizes, not mobile wire usage. This confirms caching can soften the cost but cannot replace a finite retry budget. Logs: `.cache/offline-fixes-install.log` and `.cache/offline-fixes-install-uncached.log`.

The plan now requires Phase 1 grants on every successful token refresh plus a 15-minute online schedule, with expiry eight hours after fresh server authorization. It also requires measured per-route cache-display deadlines: a slow request continues, a valid late response replaces its interim cached result, and only actual connection failure selects known-outage mode. These are Phase 1 contracts; the Phase 0 shell still downloads no private records or grants.

The retained signed-in runner is opt-in through `bun run test:offline:session`; its prerequisites are described above. Dashboard fallback coverage now includes all eight paths from the follow-up review. Auth/recovery branded fallback remains a **deployment blocker** requiring a published Najm capability. The file-map/status and historical "below" wording were corrected. Work remains uncommitted on `main`; no Git publication, package publication or deployment is claimed.

| Follow-up check | Result / evidence |
| --- | --- |
| Offline units | PASS: 18 tests, 101 assertions; `.cache/offline-fixes-unit.log` |
| Config/contracts/dashboard | PASS: 650 tests, 4299 assertions; `.cache/offline-fixes-config.log` |
| Boundaries/pins | PASS: 29 tests plus graph check; `.cache/offline-fixes-boundaries.log` |
| Root lint / root typecheck | PASS, existing ParentsTable warning only; `.cache/offline-fixes-lint-final.log`, `.cache/offline-fixes-typecheck.log` |
| Final production build | PASS, isolated `.next-offline-fixes`; `.cache/offline-fixes-build-final.log` |
| Shell/CSS/CSP browser checks | PASS: Chromium, Firefox, WebKit; `.cache/offline-fixes-browser.log` and `.cache/offline-fixes-browser-retry.log` |
| Legacy activation / eight unavailable routes after server shutdown | PASS: Chromium and Firefox; `.cache/offline-fixes-startup.log` and `.cache/offline-fixes-startup-retry.log` |
| Real Next registration | PASS, explicit update and stopped-server reload; `.cache/offline-fixes-registration.log` |
| Retained existing-session runner | PASS, zero login navigation/notices, injected retry, stopped-server reload and fresh-process reopen; `.cache/offline-fixes-session.log` |
| Failed install / mobile-data bound | PASS with immutable caching and `no-store`; install logs named above |

The first combined shell run passed Chromium but failed to launch Firefox inside the execution sandbox (`Failed to launch utility subprocess`, then launch timeout). The Firefox/WebKit rerun outside that sandbox passed. The first combined startup run likewise passed Chromium (including all eight added fallback paths) but failed Firefox launch; the Firefox startup rerun outside the sandbox passed. These failed commands remain in the original logs; they are not reported as passing combined runs. Physical-device acceptance and WebKit legacy-worker migration remain open.

## Lifecycle and late-response review corrections (2026-10-23)

Update consent, build pins and offline link interception now run independently of the limited preparation operation. Each online tab connects its update client when a worker is active even when the shared budget is exhausted. `registerSchoolShell` waits for a live install to finish or become redundant without applying the 30-second watchdog to its asset download; unmount aborts that wait. The retained actual-Next test exhausts the budget before opening a peer tab, then proves that peer pins its build, activates a staged update through consent and intercepts an offline link after the server stops. It creates no private records.

All four `offlineShell.unavailable` messages now mean "This page is not available offline." The six unused preparation/readiness message keys were removed from every catalog. The four selected flags are immutable external SVG assets, included in the manifest and CSS completeness checks; the Spanish SVG is 80,958 bytes rather than about 108 KB of inlined CSS. The three-engine browser test decodes all four images while offline and rejects inlined flag backgrounds. Current manifest `45f4b663c25d74e7f5db` contains ten assets plus its document: **4,240,369 uncompressed bytes**, 1,253,546 bytes when gzip-compressed independently for measurement. Main CSS is **318,483 bytes** (40,618 gzip), leaving about 182 KB below the 500,000-byte budget. These measurements supersede the preceding pass and still do not establish deployed compression or physical-device acceptance.

Phase 1 now chooses an explicit central route-to-query binding bridge: commit a validated exact late projection, publish its revision, then update only the matching existing query after its current fetch settles and identity/epoch/sequence checks still pass. `api.get` does not infer its caller. The Students list/detail key shapes and response projection are specified in plan §7.3. **Deadline fallback remains off by default and in the initial proof** until the bridge, measured deadline and races/error paths pass; no private-read implementation was added here.

The [Najm capability request](../design/NAJM-OFFLINE-WORKER-REQUEST.md) now requires a branded public fallback for **every document outside the shell allowlist**, including public, migration, auth/recovery and arbitrary unlisted routes. That is a deployment blocker. It also requests a persistent worker-side failed-install budget: School's three attempts do not govern browser-started update checks on an older registration. The retained test exhausts School's scheduler with three injected validation failures, observes an independent browser check and forces two further `registration.update()` checks; the old controlling worker remains active. In the uncached run those last two checks served another **8,479,442 asset bytes** while the School attempt count stayed at three. Total mobile-data bounds remain an upstream release gate, rather than a claimed School guarantee. This is a handoff document; no upstream issue filing, package publication or Najm source edit is claimed.

The older-worker test initially exposed two harness assumptions: `register()` may return an old active registration without starting another download, and an independently scheduled browser check may happen before an explicit `update()`. More importantly, the installed Playwright `waitForFunction` implementation treats an async predicate's Promise as truthy before its resolved boolean is checked, so false async readiness checks were not retried. `wait-offline-condition.mjs` now explicitly awaits and retries each check, and all affected readiness waits use it. A focused check proves false→false→true retries and an always-false timeout. Retained failed logs include `.cache/offline-lifecycle-install-{before,second,before-poll-fix}.log` and the corresponding uncached-before logs; the latest complete install logs supersede them.

Explicit polling also exposed Firefox leaving the first online fixture document uncontrolled after a migrated worker activates on browser restart. The original stricter wait timed out; diagnostics (`.cache/offline-lifecycle-startup-firefox-diagnostic.log`) show no controller but an activated `/sw.js`. The final migration test proves that active worker's exact manifest version and complete assets **before** stopping the server, then navigates offline without an extra online reload and requires the **new document's controlling worker** to match its shell version and report readiness. Chromium and Firefox pass this two-stage proof. The failed combined run is retained in `.cache/offline-lifecycle-startup-before-poll-fix.log`; it is not counted as a passing run. The actual signed-in/registration tests retain controlling-worker readiness checks before their shutdowns.

| Current check | Result / evidence |
| --- | --- |
| Offline units | PASS: 20 tests, 106 assertions; two new live-install/abort regressions |
| Config/contracts/dashboard | PASS: 652 tests, 4304 assertions; `.cache/offline-lifecycle-config.log` |
| Boundaries/pins | PASS: 29 tests and graph check; `.cache/offline-lifecycle-boundaries.log` |
| Lint / root typecheck / i18n | PASS, existing ParentsTable warning only; `.cache/offline-lifecycle-{lint,typecheck,i18n}.log` |
| Production build | PASS, isolated `.next-offline-lifecycle`; `.cache/offline-lifecycle-build.log` |
| Three-engine shell, external flag decode, CSS/CSP | PASS: Chromium, Firefox, WebKit; `.cache/offline-lifecycle-browser.log` |
| Actual Next lifecycle with exhausted budget | PASS with explicit async readiness polling; `.cache/offline-lifecycle-registration-final.log` |
| Legacy migration, stopped server and eight unavailable routes | PASS: Chromium and Firefox, explicit active-before/controller-after version checks; `.cache/offline-lifecycle-startup-final.log` |
| Existing signed-in session, retry and stopped-server reopen | PASS with explicit async readiness polling; `.cache/offline-lifecycle-session-final.log` |
| Missing asset, shared budget, slow install, older-worker/browser checks | PASS, immutable cache and `no-store`; `.cache/offline-lifecycle-install.log`, `.cache/offline-lifecycle-install-uncached.log` |

Work is still uncommitted on `main`; unrelated edits are preserved. Private-data access, physical devices, WebKit legacy-worker migration, published Najm capabilities and deployment remain separate open gates.

## Worker manifest pinning and offline sidebar (2026-10-24)

**Stale worker manifest.** The local production server on :3102 (started 19:26 from a 17:11 build) advertised the shell regenerated at 21:01, and 7 of its 11 files returned 404. `/sw.js` read `public/offline-shell/manifest.json` on every request, while `next start` serves only the public files present when it started; any later shell build (a test run or another build) broke that server's worker installs. The build now also writes `manifest-<version>.json`, and `/sw.js` reads the manifest of the version inlined into its own build (`src/app/sw.js/shellManifest.ts`); unbuilt runs (development, fixtures) still read `manifest.json`. A missing or malformed version fails closed rather than borrowing another shell. The compiled route in the isolated build contains the inlined version literal and no runtime environment lookup.

**Missing logo and icons.** The display record stored only each page's link and label, so the shell drew a flat, icon-less list. Grouped pages lost their group: "Élèves" and "Personnel" appeared twice. The shell also rendered the app name in place of the logo. The school's sidebar logo is an API-served branding image, and the worker never caches `/api`. The shell now draws the online sidebar tree (groups, feature icons, current-language labels) for the prepared routes. The record adds the role, which selects the family layout. A signed-in online visit stores the two sidebar logo slots in School's own `school-offline-branding` cache; the shell reads them as `blob:` URLs, within its existing `img-src` policy. Unit tests cover the tree and labels, family layout, cache writes and pruning, refusal of other origins and non-images, and stored-copy substitution. The browser shell test checks icons, groups and a decoded stored logo in all three engines. The signed-in session test proves a real session stores the role and the logos, then shows both after server shutdown.

| Check | Result / evidence |
| --- | --- |
| Offline units | PASS: 28 tests, 130 assertions (manifest pinning, sidebar tree, branding cache, role validation) |
| Config/contracts/dashboard | PASS: 660 tests, 4,328 assertions, run alone. An earlier run concurrent with typecheck/lint timed out in the unrelated `permissionControls.test.ts` (5 s limit) and passed when rerun alone |
| Lint / typecheck / boundaries | PASS, existing ParentsTable warning only; boundary graph 1,550 files |
| Isolated production build | PASS, `.next-offline-manifest`, shell `994784b6556418559a6f`; compiled `/sw.js` pins that version |
| Shell browser test | PASS: Chromium, Firefox, WebKit, including sidebar icons/groups/stored logo |
| Legacy migration and stopped server | PASS: Chromium and Firefox; WebKit still NOT RUN (unchanged gap) |
| Real Next registration | PASS on the isolated build |
| Signed-in session | PASS: zero `/login`, stored role and sidebar logos, stopped-server reload with icons and logo, fresh-process reopen |

A browser keeps its previous shell until the new worker activates: after rebuilding, open School online, choose **Update application** (or close all School tabs), and reload once while signed in so the logo is stored before testing offline.

## WebKit migration and the Najm worker candidate (2026-10-24)

**WebKit migration.** Both failures were in the test, not in School or Najm:

- **Path limit.** Playwright's Windows WebKit stores each cached response body 196 characters below the browser profile and cannot write past the Windows 260-character limit. The migration test's profile name (`.cache/offline-startup-webkit-XXXXXX`) put those files at 265 characters. Every `cache.put` failed with "Failed writing data to the file system", so the staged install went redundant. The shell test's shorter name had 2 characters to spare. `scripts/offline-profile.mjs` now gives WebKit profiles a short name and stops with a clear error if the checkout path leaves no room.
- **Reload race.** The test reloaded while the old worker was still activating, and WebKit then never finished activating. A deployed legacy worker finished activating long ago, so the test now waits for `activated` first.

Real Safari and iOS are not exercised; they remain part of the physical-device gate.

**Najm capabilities.** Najm `master` `c9f6b16` (unreleased) adds two options:

- `navigationFallback.otherDocuments: 'offlineDocument'`: an unlisted document gets the inline branded page on an actual connection failure. Its HTTP responses, redirects and slow loads are kept, and it never gets the shell.
- `installBudget`: failed downloads per version are limited within a window. Each install reserves an attempt in IndexedDB before downloading. WebKit discards Cache API writes made by an install that then fails, so the cache can't hold this record.

School still pins `0.13.0`, so neither is active here. `.cache/offline-najm-candidate/run.mjs` runs School's real shell and route options, plus the two settings, on the locally built candidate. Its output is in `run.log`.

In Chromium, `registration.update()` called from the branded page fails with "ServiceWorker cannot be started", because that page's `default-src 'none'` policy blocks its requests. School registers and updates only from its own documents. The candidate test checks updates from an online page.

| Check | Result / evidence |
| --- | --- |
| Shell browser test | PASS: Chromium, Firefox, WebKit; `.cache/offline-webkit-migration-browser.log`, shell `994784b6556418559a6f` |
| Legacy migration and stopped server | PASS: Chromium, Firefox and **WebKit**; same log |
| Candidate: unlisted branded page | PASS in three engines with the origin stopped and connectivity on: `/`, `/welcome`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/change-password`, `/public-page`, `/academic-year-migration` and an arbitrary path, including reload. `/home` and `/students/*` keep the shell; `/api` stays a browser error; an evicted shell gives the branded page |
| Candidate: online responses kept | PASS: unlisted 200 and 404, `/students` auth redirect to `/login`, download |
| Candidate: install budget | PASS: five `registration.update()` checks of a broken version fetch its missing asset 3 times (33 asset requests in total); the active worker keeps answering for the current shell |
| Najm unit and browser suites | PASS: see Najm `docs/tests/pwa-navigation.md` and `docs/tests/pwa-staged-updates.md` |

## najm-next 0.14.0 adopted (2026-10-24)

`najm-next@0.14.0` and `najm-database@2.3.3`, which moves its browser peer to `fast-idb@0.3.1`, were released from Najm `2a3efa6`. The `najm-next` registry integrity matches the packed tarball. School pins `najm-next@0.14.0`, and `/sw.js` sets `otherDocuments: 'offlineDocument'` and `installBudget: { attempts: 3, windowMs: 86_400_000 }`. School still pins `najm-database@2.2.1` and uses no browser sync entry, so the fast-idb change doesn't reach School yet.

| Check | Result / evidence |
| --- | --- |
| `test:offline:browser`, three engines | PASS: shell, legacy migration with server shutdown, and the new `test-offline-fallback.mjs`. Ten unlisted documents get the branded page with the server stopped, including on reload; listed routes keep the shell; `/api` stays a browser error; an evicted shell falls back to the branded page; online 200, 404, sign-in redirect and download are unchanged. Log: `.cache/offline-fallback-browser.log` |
| `test:offline:install` | PASS: three School attempts shared across tabs. A new School key and a fresh app opening retry School calls, but the failed version is downloaded only 3 times in total. On the older worker, five `registration.update()` checks, plus one Chromium started itself, download it exactly 3 times and keep the old worker. Log: `.cache/offline-budget-install.log` |
| Isolated production build | PASS, `NAJM_NEXT_DIST_DIR=.next-offline-release` |
| `test:offline:registration` (real Next) | PASS after the owner restarted a hung local PostgreSQL: update consent, silent preparation, stopped-server `/home` launch and reload, the real sign-in redirect for `/students`, and the branded page for `/login`, `/welcome`, `/forgot-password`, `/academic-year-migration` and an arbitrary path. Log: `.cache/offline-release-registration.log` |
| `test:offline:session` (real Next, existing account) | PASS: zero `/login` navigations, stored role and sidebar logos, stopped-server reload, fresh-process reopen; no school-record changes. Log: `.cache/offline-release-session.log` |
| Typecheck / lint / boundaries / config / offline units | PASS: lint has the existing ParentsTable warning only; 29 boundary and pin tests; 660 config tests; 28 offline unit tests |

## Earlier results, before the silent-preparation correction

The records below are historical. Their visible preparation notices and timeout-based automatic legacy activation are superseded by the correction above.

| Check | Result | Boundary |
| --- | --- | --- |
| Production build | PASS | Includes generated public shell and Next production compilation |
| Root typecheck | PASS | Contracts, server source/tests, seed, dashboard source/tests |
| Config/contracts tests | PASS: 645 tests | Includes expanded offline/readiness/registration/cache-cleanup tests and four locale catalogs |
| Offline bootstrap/update/auth/readiness/registration tests | PASS: 13 tests, 78 assertions | Routes, drafts, retention, metadata expiry, refresh/logout, controller identity, registration, active-version startup cleanup, waiting/installing exclusion and newly created pins |
| Boundaries/pins | PASS: 29 tests plus graph checker | Explicit neutral entry regression and exact pins |
| Lint | PASS with existing ParentsTable warning | Existing missing `parentFilters` dependency warning; no new error |
| i18n scan | PASS | No missing keys in the four catalogs |
| Chromium fixture | PASS, current correction | Actual StudentProfile/router, offline refresh/restart, Arabic startup, slow-online recovery, stable hook identities, searches versus inline/detached fields, two-tab/grade-draft consent |
| Firefox fixture | PASS, current correction | Actual StudentProfile/router, offline refresh/restart, Arabic startup, slow-online recovery, stable hook identities, searches versus inline/detached fields, two-tab/grade-draft consent |
| WebKit fixture | PASS, current correction | Actual StudentProfile/router, offline refresh/restart, Arabic startup, slow-online recovery, stable hook identities, searches versus inline/detached fields, two-tab/grade-draft consent |
| Local Next production server, Chromium | PASS | Actual StudentProfile/router with synthetic display metadata against `next start` on port 3117; refresh/restart and metadata invalidation; RTL and slow/update scenarios use the isolated fixture |
| Public asset/auth boundary on local production server | PASS | Public shell and `/sw.js`: HTTP 200; unauthenticated `/students`: HTTP 307 to login |
| Local production API with configured Redis | PASS | `/api/health/status`: HTTP 200, `status=ready`, cache/database both `ok`, verified again on loopback port 3117 after moving School to the automatic Windows service on port 6379; no rebuild required for the runtime env correction |
| Actual Next automatic legacy upgrade, Chromium | PASS | `bun run test:offline:registration`: actual login layout registers the worker, exposes signed-out Update, activates through consent, retains readiness after activation, then opens/reloads `/home` with the Next process stopped. Synthetic display metadata, no manual replacement-worker registration |
| Signed-in local production flow, Chromium | PASS | Existing local admin authenticated through REST; actual application at `http://localhost:3102/home` showed preparation complete with 32 permitted navigation entries. Actual Next process stopped; `/home` refresh and fresh browser process on the same profile opened the cached app with `navigator.onLine=true`. No new people/accounts or school-record mutations; cached records remain unavailable |
| Chromium and Firefox legacy upgrade / actual server shutdown | PASS, current correction | Natural activation after old windows close, with no Update click; startup prunes old unpinned caches while retaining pinned/recent/staging caches. `/home` launches, reloads and navigates after the fixture process exits with browser network connectivity still enabled |
| WebKit legacy upgrade / actual server shutdown | OPEN / NOT RUN | Legacy-to-staged install failed in the new harness; remaining shutdown scenarios were not accepted. Existing fresh-worker shell/restart tests pass separately |

The browser fixture supplies **synthetic UI-only metadata**. It intentionally loads no student record. Each engine closes its persistent browser context, launches a new browser process against that profile, disables network again, and opens a new document. Profiles and screenshots are retained under ignored `.cache/offline-*` paths for inspection.

Latest correction-pass outputs are in ignored `.cache/offline-corrections-{build,browser,tests,typecheck,lint,boundaries}.log`. The browser log covers all three engines. The production-origin script is a narrower smoke test: it preserves actual login redirects rather than converting those into shell success. Root build/type checks and fixture acceptance do not establish real-account authorization or physical installed-PWA acceptance.

The development-mode diagnosis/readiness correction has separate logs at `.cache/offline-startup-{build,browser,typecheck,lint,boundaries,config}.log`. The new readiness unit tests reject old, unresponsive, mismatched and replaced controllers. The production build, root typecheck and lint passed; lint retains the existing ParentsTable dependency warning. No access to the owner's actual Chrome tab was available in this session, so its worker upgrade still requires the manual steps above.

Redis runtime diagnosis is recorded in `.cache/offline-redis-api.log`. Redis's [Windows guide](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/) lists Memurai; its [Developer download page](https://www.memurai.com/get-memurai?version=windows-redis) describes the testing-only scope and uptime limit. Local setup does not weaken the server's production Redis requirement.

The automatic-service consolidation was checked with `bun run redis:check`, the saved service configuration, Windows service/listener inspection, and the live production API. The API output is in `.cache/redis-service-api.log`; lint is in `.cache/redis-service-lint.log` (existing ParentsTable dependency warning only).

The production registration gap was reproduced before the fix: `.cache/offline-registration-before.log` records an active `/sw-legacy.js`, a waiting `/sw.js`, and no visible update action on the actual login page. `.cache/offline-registration-after.log` records the passing production-layout regression. Installation errors/stalls now surface instead of silently disappearing; activation readiness listens to both controller and worker-state transitions and ignores stale old-controller probes.

Current correction checks are in `.cache/offline-registration-{build,lint,typecheck,config,boundaries,i18n}.log`. The connected local sign-in/shutdown/restart check is recorded in `.cache/offline-signedin-check.log`; its cropped readiness image is `.cache/offline-ready-status.png`, and its offline result is `.cache/offline-signedin-stopped.png`. The ad-hoc connected runner uses existing configured/local seed credentials without printing them. Browser profiles contain ordinary session state and stay ignored. This establishes one local admin's public-shell/display-preparation lifecycle, not all-role private-read authorization or access-grant acceptance.

The subsequent Claude follow-up corrections have fresh outputs in `.cache/offline-polish-{build,lint,typecheck,config,boundaries,browser,registration,signedin}.log`. The browser log reruns Chromium, Firefox and WebKit against the corrected bundle; its natural-activation/cache-cleanup extension runs in Chromium and Firefox and still explicitly skips WebKit's unresolved legacy migration. The actual production-layout upgrade and localhost admin sign-in/shutdown/restart checks were also repeated. No stored pin is expired by age; orphan/crashed pins remain an explicit device-recovery limitation rather than being treated as safely dead.

The pin-lock pass (2026-10-23) superseded that limitation: each tab now holds a Web Lock for its pin, and cleanup reclaims only pins whose lock no tab holds. Outputs are in `.cache/offline-locks-{browser,registration}.log`. A fresh production build carried the change; Chromium, Firefox and WebKit pass the shell scenarios; Chromium and Firefox pass the startup scenario, which now keeps a pin whose lock an open page still holds and reclaims both the cache and the pin left by a crashed tab (WebKit migration still NOT RUN); and the production-layout registration upgrade passes. Unit tests cover a held lock, a missing lock and unreadable lock state. The corner "prepared" notice now hides after six seconds. That timer was confirmed in the built layout chunk but is not exercised by a signed-in browser run.

Pre-offline worker upgrade (2026-10-23): the owner ran `bun start`, stopped the server and still saw "MyScolAI is offline". That page comes only from the pre-offline worker, or from the new worker when its shell is incomplete, and the waiting upgrade had needed a click or every tab closed. An online window now activates that first upgrade itself when the controller never answers the status protocol, subject to every tab's consent. `test:offline:registration` now passes without clicking Update (`.cache/offline-legacy-registration.log`), after a fresh production build (`.cache/offline-legacy-build.log`). The three-engine browser harness still passes, including the click-based staged-to-staged update (`.cache/offline-legacy-browser.log`).

The corrected bundle includes the real StudentProfile and full provider: approximately 3.43 MB minified JavaScript and 254 KB CSS before compression, plus fonts. It still uses `splitting: false`. Before expanding screens in Phase 2, add lazy route boundaries and immutable chunks, precache every required emitted asset atomically, and test interrupted installation/deep links/lazy navigation/rollback. Representative-phone compressed-size, preparation-time and storage budgets are required before that expansion. The first placeholder-only bundle was approximately 2.34 MB JS. Display preparation and future server-issued offline access both use an explicit **eight-hour** maximum; the current display preparation duration is one shared browser constant.

## Remaining implementation and release gates

- **Deployment blocker:** every same-origin document outside `SHELL_PATHS` must retain the branded offline fallback on real connection failure. Include `/`, `/welcome`, `/public-page`, `/academic-year-migration`, auth/recovery and an arbitrary unlisted path. School's eight added dashboard paths show "This page is not available offline." when outside the account's prepared navigation. Preserve HTTP errors/auth redirects and exclude non-document traffic.
  - Adopted with `najm-next@0.14.0` (`otherDocuments: 'offlineDocument'`); `test-offline-fallback.mjs` passes in three engines.
  - The real Next server passes `test:offline:registration`, including unlisted pages and the sign-in redirect. Still to do: verify the deployed image.
- **Mobile-data release gate:** resolved for update downloads. School's worker sets `installBudget: { attempts: 3, windowMs: 86_400_000 }`, and `test:offline:install` shows five browser update checks downloading a broken version exactly three times. Physical-device data budgets remain part of the device gate.
- Expand the now-passing local admin sign-in/shutdown/restart flow to real session expiry, actual logout/account switching, other roles, permission revocation and a supported cached-account access bridge. The current local display metadata must never authorize later record reads; integrate the planned server-issued entitlement/transactional Najm helper before exposing any private data.
- Verify the already-open Next document transition when Wi-Fi remains associated but the server is unreachable. The current anchor interception uses `navigator.onLine` only for the definite disconnected case; document fallback covers new/reloaded navigations with a ten-second deadline. Slow-online fallback and explicit recovery are fixture-proven.
- Expand the finite public adapter surface only with tests for additional real views. StudentProfile and its router Back action now pass; this is not all-feature compatibility acceptance.
- Physical Android/iOS installed-PWA launch. Desktop engine persistent-profile restart is fixture-proven.
- Resolved 2026-10-24: WebKit's legacy-to-staged migration and its actual stopped-server scenario pass. The failure was the Windows path limit and a reload race in the harness. Real Safari/iOS stays in the physical-device gate.
- Interrupted asset installation/eviction and explicit device recovery remain open. Two-tab dirty-input activation is now exercised; additional real application forms and grade-editor lifecycle still need connected acceptance.
- Physical-device cache budgets, and confirmation on Android/iOS that a killed or discarded tab releases its pin lock while a suspended one keeps it. Old versions in use are deliberately retained; do not reclaim a suspended tab's build based on a timeout.
- Visual acceptance for desktop/mobile/RTL, denied storage and expiry states.
- Verify the actual deployed image includes `public/offline-shell` and that `/sw.js` can read its build's `manifest-<version>.json` at runtime. The Dockerfile already copies dashboard public assets; no deployment is claimed.

Phase 0/release is not marked complete until its required gates are resolved. A bounded Phase 1 development proof requires browser startup/navigation and the private-access prerequisites; physical-device and all-role durability remain release gates. Do not begin School record downloads simply because a public-shell fixture passes.


## Historical preparation notes moved from the root plan

These notes describe the earlier visible-notice and automatic-legacy-activation implementation. The silent-preparation correction above supersedes those behaviors. Retained as prior evidence, not current instructions.

Local Phase-0 testing uses **production mode**: stop `bun run dev`, then run `bun run preview:offline` from the root. Open School online and verify completed preparation before stopping the server. The current implementation shows a six-second "prepared" notice; remove it to meet the silent-preparation requirement and adapt the acceptance harness to inspect internal readiness without a user-facing indicator. Development mode does not register/update the worker, so an existing legacy worker can keep showing the former reconnect page. For that first migration, load the production application while the server is running: with no unsaved work it replaces the old worker by itself. If unsaved work blocks it, save and choose **Update application**, or close all School tabs/windows and reopen while the server is running. Detailed current steps are in [offline acceptance](docs/tests/offline-read.md#test-manually-at-localhost3102); update them with the implementation. Readiness requires confirmation from the controlling worker, not merely a downloaded cache belonging to a waiting update.

The production preparation/update status is now visible on the sign-in page too. A legacy worker previously hid the update action until sign-in, leaving the old reconnect document active despite having downloaded a waiting replacement. `OfflinePreparation` now owns the one registration path, waits for installation, reports failure/retry, and follows both controller changes and completion of activation. `bun run test:offline:registration` exercises the actual production layout's automatic registration and visible signed-out activation action before stopping the server; earlier fixtures registered the replacement worker manually and missed this gap.

Playwright now passes that real-layout upgrade test and a separate connected check using the existing local admin at `http://localhost:3102/home`: visible preparation, actual server shutdown, refresh, and a fresh browser process using the same prepared profile. That admin prepared 32 navigation entries. The cached application opens and explicitly reports records unavailable; private-data/access-grant work and other-role/device gates remain open. Evidence and screenshot paths are in the [acceptance report](docs/tests/offline-read.md).

The production server requires password-protected Redis even for local testing. The owner's Windows machine (as configured on 2026-10-23) uses the installed Memurai service on loopback port **6379**, with startup type **Automatic**, a persisted password, AOF persistence, a 96 MB limit and no eviction. School's ignored `.env.local` points to that service. It starts with Windows; no manual Redis start command is needed after reboot. The former standalone instance on port 6380 was stopped after copying its remaining cache entries with their expiry times. `bun run redis:check` verifies authentication, and `preview:offline` runs that check before building. A successful build with no Redis is not evidence of working API startup.

