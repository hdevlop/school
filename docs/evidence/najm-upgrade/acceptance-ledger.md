# Najm upgrade acceptance ledger

Candidate branch: `agent/finish-najm-upgrade`

Candidate commit: `ccd1ee6` (seed-container repair; committed and pushed,
correcting this file's earlier note that it was uncommitted)

Date: 2026-08-14; follow-up audit 2026-08-26/27

## Published package boundary

- School resolves `najm-auth@3.1.1`, `najm-kit@2.11.2`,
  `najm-core@2.0.5`, `najm-i18n@2.0.3`, and `najm-theme@0.2.1` exactly.
- `najm-kit@2.11.2` is the registry release containing the password-input
  native attribute and label-association fix. Its source release branch was
  pushed as `agent/najm-theme-settings-release`.
- No School dependency points at the local Najm checkout, a tarball, or a
  filesystem link. The dependency-resolution tests fail on a nested or
  mismatched Najm copy.

## Local source and build gates

| Gate | Result |
| --- | --- |
| `bun install` | pass; lockfile resolved with exact pins |
| `bun run lint` | pass; 0 errors, 3 existing `no-img-element` warnings |
| `bun run test:server` | pass; 1137 tests, 2053 assertions, 0 failures |
| `bun run test:dashboard` | pass; 39 tests, 100 assertions, 0 failures |
| `bun run test:seed` | pass; 9 tests, 29 assertions, 0 failures |
| `bun run i18n:check` | pass; all four catalogs contain every static key |
| `bun run db:check` | pass |
| `bun run db:generate` | pass; 74-table schema, no migration generated |
| `bun run build:all` | pass; server declarations, seed typecheck, Next production build and route generation |
| focused seed/schema regression | pass; 3 tests, 6 assertions, 0 failures |

The old 28 Parent/Student service failures were stale fixtures, not accepted
debt. Their constructor mocks now include `AuthService`, storage and transport
dependencies in the real order, and create assertions target
`AuthService.provisionUser`. The complete server suite is green.

The historical `bun run --cwd packages/najm-theme test:rsc` result was not
rerun: School has no local `packages/najm-theme` workspace and consumes only
the published package.

2026-08-26 addendum: `test:dashboard`'s 39/0 result above does not reproduce
on a Windows checkout (38 pass/1 fail). Git's `core.autocrlf=true` gives
`apps/dashboard/src/lib/session.ts` CRLF line endings, and
`session.test.ts`'s strict `\n`-split string-equality check fails on the
resulting `\r` suffix. GitHub's Linux runner checks out LF and is unaffected —
this is local environment brittleness, not a regression.

## Disposable PostgreSQL acceptance

The local run used a fresh PostgreSQL 18 cluster on port `55432`. All
non-vector migration statements were applied in journal order; the host has no
Windows pgvector build, so only migrations `0014` and `0020` used local
test-only `real[]`/index substitutions. The committed SQL was not changed for
that accommodation. GitHub runs the unmodified chain against the
`pgvector/pgvector:pg18` service.

The fresh-chain audit found and fixed four historical migration defects:

- `0003` and `0004` no longer recreate enums already owned by `0000`;
- `0004` and `0005` no longer create the same token-history columns twice;
- additive `0044_auth_v3_schema_repair.sql` supplies Auth v3 columns and keys
  that the existing Drizzle snapshot had assumed but historical SQL omitted.
- additive `0045_staff_assignment_schema_repair.sql` supplies the
  `security_assignments` and `bus_assistant_assignments` tables that historical
  snapshots contained but no migration created.

On 2026-08-14, all 46 journaled migrations produced 75 public tables. The full
demo seed then completed with 1,224 users, 500 students, 3,945 payments, 1,000
payslips, 58,740 attendance rows, 23 alerts, 24 refuels, and 16 maintenance
records. This is the post-repair proof for the prior `StorageService` failure.

Earlier 2026-08-11 local runtime checks against that database passed:

- admin seed and role seed;
- wrong-password rejection and successful admin login;
- session-mode and persistent Remember Me cookie attributes;
- authenticated protected navigation and anonymous redirect;
- language, dark theme and `Africa/Casablanca` first-render attributes;
- invalid preference rejection;
- credential-setup temporary login, status, password replacement, replay
  denial, and required fresh normal login.

Production cookies are `Secure`. The production build therefore uses
`http://localhost` in Playwright/CI (Chromium's local secure-origin exception),
while the PowerShell REST acceptance used the development HTTP server. A plain
production `http://127.0.0.1` cookie jar is intentionally not a valid auth
environment.

## Browser and migration CI

`.github/workflows/najm-upgrade.yml` applies the unmodified migration chain to
pgvector PostgreSQL, seeds isolated demo data, repeats every source/build gate,
then boots the production Next build under Bun and runs
`apps/dashboard/tests/e2e/najm-upgrade.spec.ts`.

The four serial browser scenarios are designed to cover:

- anonymous/protected and authenticated/login redirects;
- form label association from `najm-kit@2.11.2`;
- server-first `lang`, `dir`, theme and time-zone attributes;
- factory auth branding load and invalid preference rejection;
- wrong password, Remember Me session/persistent modes, mobile sidebar and
  logout clearing auth plus School preference cookies;
- credential setup completion, cancellation, expiry, replay denial and fresh
  login;
- admin, principal, teacher, accounting, student and parent roles across en,
  fr, ar/RTL and es at phone, tablet and desktop widths, including dark mode,
  touch contexts, keyboard focus and screenshot artifacts.

GitHub result: **failed before browser acceptance**. Run `31543464909` at
commit `69114a8` failed in `seed:full` because `StudentRouteService` was
omitted before `StorageService` in the seed container's `StudentService`
registration. The local repair and structural regression test pass.

Update, 2026-08-26: the repair was in fact committed (`ccd1ee6`) and pushed,
triggering run `31846324773` (43m34s). That run confirms the `seed:full` fix:
lint, `test:server`, `test:dashboard`, `test:seed`, `i18n:check`, `db:check`,
`build:all`, the full migration chain, and Chromium installation all passed.
It still failed — now in the new "Run Najm upgrade browser acceptance" step.
Test 1 of 4 (`tests/e2e/najm-upgrade.spec.ts:94`) threw
`TypeError: "/api/ui-language" cannot be parsed as a URL` from
`page.request.post(...)` at line 100 and closed the browser context before
tests 2-4 ran. No browser-acceptance evidence exists for any Phase 2-5
checklist item. Kafil's equivalent, working pattern
(`page.request.get(relativePath)` in `test/e2e/image-delivery.e2e.ts:61-63`)
ruled out the general baseURL-resolution mechanism as broken; a standalone
local reproduction confirmed the same. The CLI-invocation difference from
Kafil (`bunx playwright test` vs. School's direct `@playwright/test/cli.js`
under `bun`) could not be tested either way — installing the pinned Chromium
revision resolved the "executable doesn't exist" error, but `chromium.launch()`
now hangs indefinitely on this host instead (the debugging-pipe issue noted
below, persisting after the browser install), so no invocation style can
reach a real browser here.

Two real defects were found and fixed by inspection instead:
`loginInNewContext` and the role/locale/viewport matrix test
(`najm-upgrade.spec.ts`, originally lines 75 and 219) both created contexts
via `browser.newContext()` with no `baseURL` option, unlike the default
`page` fixture, which gets it from the project config automatically.
Separately, every `page.request.*` call in the file (15 sites) used a
relative path — the precise dependency that failed for test 1. Fixed: both
`newContext()` calls now pass `{ baseURL }`; a new `apiPath()` helper builds
an absolute URL via `new URL(path, baseURL)` for every request call;
`playwright.najm-upgrade.config.ts` exports `baseURL` as a named export so
the spec reuses the config's own value. Verified: `bunx playwright test
--list` resolves all 4 tests with a dummy `DB_URL`; `tsc --noEmit` shows zero
new errors on either file. Not verified: a live run, since this host has
neither a local Postgres for the suite's queries nor a browser that
completes launch. Not committed.

This same audit found a second, independent seed-container defect, unrelated
to the one above: `packages/server/src/modules/seed.ts` registered
`StudentRouteValidator` with only `[StudentRouteRepository]`, one dependency
short of its real two-argument constructor. Every seeded bus-route assignment
therefore threw and was silently caught as a skip —
`31846324773`'s own seed log reads "Student routes seeded (0 records)" despite
the step reporting success, and transport-fee auto-creation never ran for any
seeded student. The 2026-08-14 seed counts below never mention student routes,
consistent with the same silent zero then. Fixed locally by adding
`StudentRepository` to that registration (not yet committed); `bun run
build:server` and the full server suite (1137 pass/0 fail) show no
regression.

Local Playwright result, 2026-08-27: **all 4 tests pass.** Installed
PostgreSQL 18 locally (winget's own downloader hit an HTTP 403 from its CDN;
the same file downloaded fine via plain `curl`, so the installer was fetched
directly and run silently), ran the migration chain and `seed:admin` against
it. Diagnosed the local browser-launch hang precisely with `DEBUG=pw:browser`:
Chromium launches as a real process either way, but Playwright's
`--remote-debugging-pipe` connection to it hangs indefinitely under Bun and
completes in 22ms under plain Node — reproduced identically with this
session's tool sandbox on and off, ruling that out. This is a Bun-on-Windows
named-pipe gap, not a School defect; CI's Linux runner doesn't have it (its
browser already launched in the failed run above). Running Playwright's CLI
via `node` instead of `bun` unblocked local testing.

With a live database and a working browser, the suite then surfaced and let
this audit fix four further real, previously-unreachable defects — CI never
got past test 1, so none of these were visible before:

1. The `baseURL`/`apiPath` fix above resolved test 1 exactly as intended —
   first real confirmation it was correct, not just plausible.
2. Test 2 hung on `getByLabel('Keep me logged in')`: the checkbox's
   `<label for="...">` id is never applied to either the visible
   `<button role="checkbox">` or the paired hidden `<input>` — a
   `najm-kit@2.11.2` accessibility defect in `FormInput`'s checkbox variant,
   not fixable in School's code (published package; patching `node_modules`
   is against this plan's own rules). Two call sites also passed the wrong
   prop name outright (`label` instead of the typed `formLabel`):
   `apps/dashboard/src/app/(auth)/login/page.tsx:145` and
   `apps/dashboard/src/features/Parents/components/SimpleParentForm.tsx:189,197`
   — corrected for API consistency and layout, though that alone doesn't fix
   the id-wiring defect. The test now finds the checkbox by DOM structure
   instead of the broken label association.
3. Test 2 then hit a strict-mode violation: two elements matched
   `button:has(svg.lucide-log-out)` after a viewport resize, because the
   sidebar keeps both desktop and mobile variants mounted and toggles
   visibility with CSS — normal responsive behavior, not a defect. The
   locator now adds `:visible`.
4. Test 3's expiry check passed locally only after a further local-only fix:
   this machine's fresh Postgres install defaulted to `Africa/Casablanca`
   (UTC+1), while `najm-auth` always writes/compares `expires_at` via JS
   `Date.toISOString()` (UTC); the test's raw SQL `now() - interval
   '1 minute'` used the server's local wall-clock time, so the 1-hour skew
   swallowed the 1-minute backdate. Reset the local server to UTC rather than
   touching the test — CI's Postgres container has no `TZ` override and
   defaults to UTC, so this doesn't reproduce there.
5. Test 4 then failed because it reuses `ensureRoleUser`'s deterministic ids,
   and test 3 leaves `admin`/`principal`/`teacher` with an outstanding
   `credential_setup_requirements` row — correct behavior for the cancelled
   and expired cases, which test 4 didn't account for. Test 3 now clears
   `required`/`completed_at` for the three users it touches at the end.

Result: `4 passed (38.4s)`, against a real database, a real production build,
and a real browser. None of this session's changes are committed or pushed.

## Separation of gates

- npm: no new publication was needed; `najm-kit@2.11.2` was already current.
- Najm GitHub: the existing 2.11.2 release commits were pushed to their release
  branch; unrelated local `najm-storage` work remains untouched.
- School database: disposable only; no production database was mutated.
- School deployment: not performed.
- School GitHub: candidate branch exists; the seed-container repair is
  committed and pushed (`ccd1ee6`). Two workflow results exist: the failed
  pre-fix run (`31543464909`) and the post-fix run (`31846324773`), which
  passed every gate through `build:all` and failed only at browser
  acceptance. No PR is open; both `main` and `agent/finish-najm-upgrade` point
  at `ccd1ee6`.
- This audit, 2026-08-26/27: fixed the independent `StudentRouteValidator`
  seed defect; removed an orphaned `settings.system.systemTheme` locale key
  from all four catalogs; corrected the plan's `najm-kit/person-images`
  checkbox (§9), which was marked done but has zero call sites in the
  repo — left as-is pending a product decision rather than force-adopted;
  installed a local disposable PostgreSQL 18 and diagnosed a Bun-on-Windows
  Playwright browser-launch defect (use `node`, not `bun`); and, with that
  unblocked, root-caused and fixed the real browser-acceptance failure plus
  three further defects it had been hiding (a `najm-kit` checkbox
  accessibility gap, a duplicate-element locator, a test-fixture data leak).
  `tests/e2e/najm-upgrade.spec.ts` now passes all 4 tests locally end to end.
  Nothing from this session is committed or pushed; a real CI run against
  these changes is the only remaining way to add evidence beyond this local
  run.
