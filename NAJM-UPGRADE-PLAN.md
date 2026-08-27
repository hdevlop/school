# School Najm Platform Upgrade Plan

Status: **LOCAL SOURCE, BUILD, DATABASE, AND BROWSER GATES ALL GREEN; NONE OF
IT COMMITTED YET** — every gate this plan asks for now has real, local,
end-to-end evidence, including the browser acceptance suite that was the
plan's last open item. Full chronology in §11; summary: the 2026-08-14
seed-container repair (`ccd1ee6`) was in fact committed and pushed (the GitHub
Actions run record below once said otherwise); the resulting CI run passed
every gate through `build:all` and failed only in the new Playwright step; a
2026-08-26/27 audit found and fixed a second, independent seed-container
defect (`StudentRouteValidator`) and, after installing PostgreSQL 18 and
diagnosing a Bun-on-Windows browser-launch defect (use `node`, not `bun`, to
run Playwright's CLI on this host), root-caused and fixed the actual Playwright
failure plus three further issues it had been hiding — a `najm-kit` checkbox
accessibility gap, a duplicate-element locator, and a test-fixture data leak
between two tests. `tests/e2e/najm-upgrade.spec.ts` now passes all 4 tests
against a real local PostgreSQL 18, a real production build, and a real
Chromium. Nothing from this session is committed or pushed; a fresh CI run
against these exact changes is the one thing that would still add evidence
this local run cannot.

Last updated: 2026-08-27

Primary executor: **Claude Opus**

This plan upgrades School to the current Najm application architecture used by
Kafil while preserving School's own roles, routes, settings, data model, and
product UI. "Same as Kafil" means sharing the package-owned provider, auth,
session, preference, formatting, pagination, and sidebar contracts. It does not
mean copying Kafil domain code or authorization rules.

This is the authoritative execution plan for this upgrade in
`C:\Users\hdevlop\Desktop\school`. Kafil's
`C:\Users\hdevlop\Desktop\kafil\AUTH-SESSION-PLAN.md` remains authoritative
for the cross-repository React Server Component session adapter and its Najm
publication gate.

## Latest published target snapshot

The npm registry was rechecked on 2026-08-11. These are the exact published
Najm targets for this plan; they are not inferred from ranges or the local
source checkout:

| package | target |
|---|---:|
| `najm-api` | `2.0.3` |
| `najm-auth` | `3.1.1` |
| `najm-cache` | `2.0.2` |
| `najm-chatbot` | `2.0.2` |
| `najm-cookies` | `2.0.2` |
| `najm-core` | `2.0.5` |
| `najm-cors` | `2.0.2` |
| `najm-database` | `2.0.3` |
| `najm-email` | `2.0.2` |
| `najm-event` | `2.0.2` |
| `najm-guard` | `2.0.2` |
| `najm-i18n` | `2.0.3` |
| `najm-kit` | `2.11.2` |
| `najm-mcp` | `2.1.0` |
| `najm-rag` | `2.0.2` |
| `najm-rate` | `2.0.2` |
| `najm-storage` | `2.2.0` |
| `najm-theme` | `0.2.1` |
| `najm-validation` | `2.0.2` |
| `najm-whatsapp` | `2.0.2` |

`najm-auth@3.1.1` keeps the 3.1.0 runtime contract and adds the canonical
Next.js App Router boundary documentation and CLI scaffolding. `najm-kit@2.11.2`
is the current package-owned provider, page-state, settings-shell, query,
pagination, format, and server-bootstrap surface, and forwards native password
input attributes so labels and accessibility IDs survive composition.
`najm-theme@0.2.1` owns the
appearance, preset, branding, persistence, factory-asset, React, and settings
flows Kafil now consumes. School must use those published contracts rather than
copying Kafil's deleted app-owned theme implementation.

Recheck the registry before execution. If a newer release exists, update this
matrix and review its changelog/packed exports before changing manifests; do
not silently float to it through a range.

## 0. Historical execution record — auth slice, 2026-08-09

Phases 0, 1, 3, and 4 were executed as one scope, satisfying Moves 4 and 5 of
Kafil's `AUTH-SESSION-PLAN.md`. Phase 2 (`NajmAppProvider`) and Phase 5 (Najm
Kit visual audit) were deliberately excluded so the auth migration stays a
separate reviewable change, per rule §1. `najm-kit` therefore stays on `2.1.43`.

Resolved versions after one root `bun install`, one copy each, no nesting:

| package | before | after | forced by |
|---|---|---|---|
| `najm-auth` | 2.0.11 | **3.1.0** | the adapter release |
| `najm-core` | 2.0.4 | **2.0.5** | `najm-auth@3.1.0` dependency |
| `najm-i18n` | 2.0.2 | **2.0.3** | `najm-auth@3.1.0` dependency |
| `drizzle-orm` | 0.45.1 | **0.45.2** | `najm-auth@3.1.0` peer |
| `hono` | 4.12.14 | **4.13.1** | `najm-core@2.0.5` needs `^4.12.31` |
| `diject` | 0.1.8 | **0.1.8** (pinned) | `najm-core@2.0.5` |
| `najm-kit` | 2.1.43 | *unchanged* | Phase 2/5 scope |

This table records what that completed run actually used. It is intentionally
not rewritten to the newer target snapshot above.

Gate results at this state:

| gate | result |
|---|---|
| `bun run lint` | 0 errors, 3 pre-existing `no-img-element` warnings |
| `bun run test:server` | 1095 pass / 28 fail (all pre-existing, see below) |
| `bun run test:seed` | 9 pass |
| `bun run test:dashboard` (new script) | 24 pass |
| `bun run build:all` | passes |
| `bun run db:check` | clean |
| `bun run db:generate` | no further migration |

Notes carried forward:

- There is no `.env.local` in this worktree, so `build` was run with throwaway
  build-only secrets. No env file or secret was written to the repository.
- `packages/server/tests/{attendance,behaviorRewards,discipline}` replaced the
  whole `najm-i18n` module via `mock.module`. Because `mock.module` is
  process-global and `najm-auth` imports `I18nService`, every later test file
  failed to link. This was **pre-existing** — reproduced identically on a clean
  `HEAD` worktree with `najm-auth@2.0.11`. The four stubs now spread the real
  module, which unblocked 598 previously unreachable tests.
- The 28 remaining failures are `StudentService`/`ParentService` constructor
  drift: the tests pass 6 and 4 positional args against 8- and 5-arg
  constructors, so `this.storage` is undefined, and they still assert
  `userService.create` where the services now call `authService.provisionUser`.
  Unrelated to this migration and revealed, not caused, by the fix above.
- `roleRoutes` was **not** added. School has no documented route/role matrix and
  the plan forbids inventing Kafil's. `requireRole()` is therefore unused, and
  `forbiddenRoute` is left unset.
- The two credential-setup tables are re-exported through `@server/auth` from
  the `najm-auth` root, matching the five auth tables already composed there,
  rather than from `najm-auth/pg` as §7a words it. The root and `/pg` bundles
  export distinct table objects, so mixing sources in one schema file would be
  worse; the emitted DDL is identical, and `authConfig()` passes no `schema`
  override, so Najm uses its own internal tables at runtime regardless.
- `(dashboard)/layout.tsx` declares `force-dynamic`. The protected tree reads
  the per-request session cookie, so prerendering it made `requireSession()`
  run without a request and fail as a configuration error — correct strict
  behavior, wrong build-time context.

Still open for this slice: the Phase 3 and Phase 4 browser acceptance lists, and
applying migration `0041_oval_venus.sql` to a disposable database. Both need a
real PostgreSQL target and a login, which this worktree has no credentials for.
The exact package alignment is now complete and its focused auth/session,
lint, server, seed, and production-build gates pass. Database and browser
acceptance remain separate. The Kit/Theme integration remains owned by Phase 2.

## 1. Non-negotiable execution rules

- Read root `AGENTS.md` before every implementation slice. Use Bun commands;
  do not replace the repository toolchain with npm, yarn, or pnpm.
- Re-read the installed declarations and changelogs at the start of execution.
  Versions and unpublished Najm work may have changed after this plan date.
- Never consume `C:\Users\hdevlop\Desktop\najm` through a workspace link,
  file dependency, copied source, or tarball. School adopts only a verified
  published package version.
- Do not publish a Najm package, push School, deploy School, or run a destructive
  database command without separate explicit authorization.
- Preserve the current unrelated School worktree. At plan creation it contains
  Behavior Rewards and Discipline page/server/test/localization work plus two
  deleted older plan files. Audit overlap before editing and never discard or
  absorb those changes into this upgrade accidentally.
- Keep database migration, application deployment, and production acceptance as
  three separate gates.
- Make one reviewable commit per phase. Do not combine the Najm Auth schema
  migration with the React session adapter or the broad Najm Kit visual audit.
- Backend authorization remains authoritative. Proxy, layouts, hidden buttons,
  and role-aware navigation are presentation and early-routing boundaries only.

## 2. Plan-creation baseline (historical)

The following was verified from the three local worktrees, installed package
manifests, declarations, and changelogs on 2026-08-09.

### School

- Root and installed versions include:
  - `najm-auth@2.0.11`
  - `najm-kit@2.1.43`
  - `najm-core@2.0.4`
  - `najm-i18n@2.0.2`
  - `najm-database@2.0.3`
  - `najm-storage@2.1.1`
- Root manifests use ranges, while `packages/server` and `packages/seed` use
  `*` for several Najm packages. The lockfile also contains nested
  `najm-kit@2.1.31` copies through storage/WhatsApp packages.
- `apps/dashboard/src/app/providers.tsx` manually composes React Query,
  `AuthProvider`, `KeyboardProvider`, `next-themes`, `NajmDesignProvider`,
  static design parsing, and manual typography variables.
- `apps/dashboard/src/providers/QueryProvider.tsx` already exists, so the app
  currently has two Query Client construction implementations.
- `apps/dashboard/src/app/layout.tsx` calls `auth.getSession()` directly and
  converts every error into an anonymous session.
- `apps/dashboard/src/app/(auth)/layout.tsx` performs a second independent
  `auth.getSession()` call in the same render.
- `apps/dashboard/src/app/(dashboard)/layout.tsx` has no Server Component
  session guard. It relies on proxy and client hydration.
- `apps/dashboard/src/proxy.ts` correctly imports the core auth object and
  preserves its speculative-prefetch exception. Keep this boundary free of
  React imports.
- The login form displays `rememberMe` but drops it from the call to `login()`.
  It also assumes the v2 result and always redirects to the dashboard.
- The catch-all API route passes every verb directly to `handle(server)` and
  does not wrap POST with Najm Auth cookie persistence.
- The Drizzle schema exports the v2 auth tables individually. It does not
  export the v3 credential-setup session and requirement tables.
- Student, parent, and staff provisioning intentionally retains Najm's existing
  password-or-email-invite behavior. This upgrade must not silently replace it
  with CIN or another temporary credential policy.
- School has settings for school name/logo, language, theme, time zone, and
  currency. Seeded values are French, light, `Africa/Casablanca`, and MAD.
- School imports `najm-kit/theme.css` already.
- School has custom F8 fillers in `DevFormFiller`, Student, Teacher, and Staff
  forms. Najm Kit 2.8 provides a package-owned schema-driven F8 contract.

### Kafil reference architecture

- At the 2026-08-09 refresh, Kafil consumes `najm-auth@3.1.0`, `najm-kit@2.8.2`,
  `najm-core@2.0.5`, `najm-i18n@2.0.3`, and Drizzle `0.45.2`.
- Kafil's `NajmProviders` name is a **local component**, not a Najm Kit export.
  Its shared package boundary is:

  ```ts
  import { NajmAppProvider } from "najm-kit/app";
  ```

- `NajmAppProvider` owns UI language, design, light/dark theme, time zone,
  branding, formatting, table defaults, and optional form development tools.
  Auth and React Query deliberately remain app-owned providers above it.
- Kafil seeds the provider from server-resolved session/cookies/settings and
  keeps the root `html` language, direction, theme class, and time-zone data
  attribute consistent with that initial state.
- Kafil's auth v3 adoption handles the discriminated login result,
  `rememberMe`, credential setup, auth-cookie persistence, and the two new auth
  schema tables.

### Najm source and release boundary

- The current local and published Najm source versions are `najm-kit@2.9.0`,
  `najm-auth@3.1.1`, `najm-core@2.0.5`, and `najm-i18n@2.0.3`; other Najm
  package versions used by School are otherwise unchanged.
- Najm Kit 2.4 changed `NTable`'s default pagination presentation to numbered.
  Versions 2.5-2.8 added app-wide table defaults, sidebar context, app provider,
  formatting, query/pagination helpers, form development tools, and
  person-image helpers. Version 2.9 adds the pure and React-request-cached
  server UI bootstrap subpaths.
- Najm Auth 3.0 is a breaking release: login returns `LoginResult`, credential
  setup adds two schema tables, and the standard POST handler owns cookie
  persistence for login/setup flows.
- `najm-auth/client/server/react` and `createReactServerAuth()` are published in
  `najm-auth@3.1.1`. Treat the registry tarball and installed declarations as
  authoritative, not an older local plan snapshot.

## 3. Target architecture

School will keep these explicit boundaries:

```text
apps/dashboard/src/lib/auth.ts       core defineAuth configuration; proxy safe
apps/dashboard/src/lib/session.ts    one React-server adapter singleton
apps/dashboard/src/lib/serverTheme.ts  one package-owned request-scoped theme snapshot
apps/dashboard/src/app/providers.tsx client provider composition
apps/dashboard/src/proxy.ts          core auth.middleware() only
```

The target client provider tree is:

```text
AuthProvider
  QueryProvider
    KeyboardProvider
      NajmAppProvider
        application children
```

`KeyboardProvider` stays only for School-owned shortcuts. Najm Kit owns F8 form
generation. `NajmAppProvider` replaces `next-themes`, the direct
`NajmDesignProvider`, manual typography variable application, and any new local
translation/format/table-default bridge.

The root Server Component resolves one initial snapshot and passes serializable
values to the client provider:

```text
session
language + html direction
light/dark theme
time zone
school branding
design config
currency + formatting locale
```

Precedence must be explicit:

1. a valid School UI cookie;
2. the authenticated user's relevant preference where one exists;
3. public School settings;
4. a typed application fallback.

## 4. Phase 0 - freeze contracts and protect the worktree

- [x] Record `git status --short` and identify ownership of every modified,
  deleted, and untracked School file.
- [x] Confirm no planned file overlaps unresolved Behavior Rewards or
  Discipline work. If overlap exists, finish or isolate that work first.
- [x] Re-read School `AGENTS.md`, the installed Next.js 16 guides for providers,
  auth, layouts, and proxy, and the installed Najm declarations.
- [x] Compare School manifests, installed packages, `bun.lock`, Najm package
  changelogs, built declarations, and packed export surfaces.
- [x] Confirm the exact published package containing
  `najm-auth/client/server/react`. Do not infer availability from the local
  Najm source or from Kafil's plan.
- [x] Confirm the exact target versions in a dependency matrix before editing.

Target policy:

- Pin `najm-auth@3.1.1` everywhere after verifying its registry metadata,
  changelog, packed exports, and installed declarations.
- Pin `najm-kit@2.11.2` everywhere and `najm-theme@0.2.1` in the dashboard and
  server consumers. Together they contain the required app, query, pagination,
  format, form-dev-tools, page-state, server bootstrap, appearance, branding,
  preset, persistence, and settings exports.
- Align `najm-core` to `2.0.5`, `najm-i18n` to `2.0.3`, `diject` to `0.1.8`,
  and Drizzle to a version compatible with Najm Auth v3 (`0.45.2` in the
  current reference baseline).
- Pin the other Najm packages to the exact versions in the latest published
  target snapshot above. They already match School's intended versions; do not
  perform unrelated source refactors merely because the manifests are made
  exact.
- Add a root override for `najm-kit` so nested Najm packages do not keep stale
  2.1.x copies. Prove one resolved version after install.
- Do not upgrade Next.js, React, AI packages, charts, or unrelated UI packages
  in this plan unless a verified peer constraint blocks the Najm migration.

Phase 0 gate:

- [x] The target is published and its tarball exposes every documented subpath.
- [x] The worktree ownership audit is recorded.
- [x] The dependency matrix contains no `*`, caret, or conflicting Najm version
  for packages owned by this migration.

## 5. Phase 1 - align package manifests and lockfile

Files in scope:

- `package.json`
- `apps/dashboard/package.json`
- `packages/server/package.json`
- `packages/seed/package.json`
- `bun.lock`

Tasks:

- [x] Replace School's mixed ranges and `*` Najm dependencies with the exact
  approved versions in every direct consumer.
- [x] Add/align root overrides for `najm-auth`, `najm-kit`, `najm-core`,
  `najm-i18n`, `najm-database`, and `diject` where needed.
- [x] Align Drizzle and Hono with Najm Auth v3's installed peer declarations.
- [x] Run `bun install` once from the root.
- [x] Inspect `bun.lock` rather than accepting a blind lockfile rewrite.
- [x] Prove that root, dashboard, server, and seed resolve one `najm-auth` and
  one `najm-kit`, including nested storage/WhatsApp consumers.
- [x] Run a compile/build baseline before changing providers or auth behavior.

Phase 1 gate:

```bash
bun install
bun run build:server
bun run build:seed
bun run lint
bun run build
```

If package alignment alone breaks source, record each declaration mismatch and
fix it in the owning later phase; do not hide it with `any`, a copied type, or a
local compatibility package.

Latest-version follow-up completed on 2026-08-11:

- [x] Update root, dashboard, server, and seed manifests plus root overrides to
  the exact registry matrix, including `najm-auth@3.1.1`,
  `najm-kit@2.11.2`, and `najm-theme@0.2.1`.
- [x] Run one root `bun install`, audit `bun.lock`, and prove one resolved copy
  of every key Najm package.
- [x] Rerun the auth/session tests after 3.1.1 and keep the Kit/Theme provider,
  persistence, factory-definition, and settings implementation in Phase 2.

## 6. Phase 2 - migrate to `NajmAppProvider`

### 6a. Build typed School preference inputs

- [x] Add a small School-owned preferences module defining:
  - supported languages: `en`, `fr`, `ar`, `es`;
  - BCP 47 formatting locales such as `en-MA`, `fr-MA`, `ar-MA`, `es-MA`;
  - supported light/dark themes;
  - supported/normalized IANA time zones;
  - safe currency fallback, with current School settings as the normal source.
- [x] Do not pass School's stored `system` value to Najm Kit. Najm Kit's
  verified `NajmMode` is only `light | dark`.
- [x] Choose and implement one honest `system` migration:
  - preferred: convert existing `system` rows to `light`, change the settings
    default and DTO/UI options to `light | dark`, and generate a separate
    School migration;
  - do not keep a visible `system` option that silently behaves as `light`.
- [x] Keep the theme data migration separate from the auth v3 schema migration.

Implementation notes (2026-08-11):

- `apps/dashboard/src/preferences/index.ts` owns every allowlist and
  normalizer: languages, `*-MA` formatting locales, `light | dark`, the
  supported IANA zones, and the currency list with a `MAD` fallback.
- The `system` migration is `0043_tricky_micromax.sql`: it sets the column
  default to `light` and converts stored `system` and `auto` rows. `auto` was
  included because the settings validator had been accepting it, so it is a
  value the new `light | dark` enum can no longer parse. Rows already holding
  `light`/`dark`, and `NULL` rows, are untouched. The migration is separate
  from Auth `0041` and `najm-theme` `0042`, and contains no DDL beyond the
  default change.
- The `system` option is gone from `SystemSection`, the settings DTO, the
  frontend schema, the service fallback, the validator, and the seed types.
  `packages/server/tests/settings/SettingsTheme.test.ts` covers all of it.
- Currency reaches the provider from School settings through
  `apps/dashboard/src/lib/serverSettings.ts`, backed by a new narrow
  `loadSchoolUiSettings()` read exported from `@sms/server`.

### 6b. Add preference cookie endpoints

Create School equivalents of Kafil's three application-owned handlers:

- `apps/dashboard/src/app/api/ui-language/route.ts`
- `apps/dashboard/src/app/api/ui-theme/route.ts`
- `apps/dashboard/src/app/api/ui-timezone/route.ts`

Requirements:

- [x] Validate request JSON against the typed School allowlists.
- [x] Use School-specific cookie names such as `school-ui-language`,
  `school-ui-theme`, and `school-ui-timezone`.
- [x] Set `httpOnly`, `sameSite: "lax"`, `path: "/"`, and a deliberate max age.
- [x] Return 400 for unsupported values and never persist an arbitrary locale,
  class name, or time zone.
- [x] Decide explicitly whether language also updates the user's database
  preference. If it does, perform that through the existing authenticated
  service contract; the cookie remains the immediate render preference.

Implementation notes (2026-08-11):

- All three handlers are implemented. The names, the cookie policy, and the
  endpoint paths live once in `apps/dashboard/src/preferences/cookies.ts`.
- **The language decision**: the cookie does *not* write the user row.
  School's existing authenticated `PUT /users/language` service stays the
  single writer of the durable preference; `useUpdateLang` now calls both — the
  service for the record, and `najm-i18n`'s `changeLanguage` (which POSTs
  through `NajmAppProvider`'s `languageEndpoint`) for the cookie and the client
  catalog. The catalog swaps only after the server accepts, so a rejected
  update never leaves the UI in a language the account is not set to.
- Each handler also exports `DELETE`, and sign-out calls all three through
  `clearSchoolUiPreferences()`. This is required, not optional: the cookies
  outrank the signed-in user's stored preferences by design, so an uncleared
  cookie would render the next person's session on a shared machine in the
  previous person's language, theme, and time zone.

### 6c. Adopt the published `najm-theme` server contract

- [x] Create one canonical `packages/server/src/theme/` factory directory with
  `theme.json` plus the four fixed factory files: expanded sidebar logo,
  collapsed sidebar logo, auth logo, and auth hero. Define it once with
  `defineTheme(import.meta.url)` and export it as `@sms/server/theme`; never
  resolve factory files from `process.cwd()` or a dashboard-relative import.
- [x] Spread `najm-theme/pg` into the composed School schema and generate one
  additive migration containing only the package appearance, branding, and
  preset tables. Keep it separate from Auth migration `0041` and never edit a
  deployed migration.
- [x] Register `theme(schoolTheme, policy)` after database, auth, MCP, and
  storage prerequisites. School owns the public-read decision, admin/principal
  management guards, byte ceilings, storage namespace, audit sink, sanitized
  diagnostics, scope policy, and route base; the package owns controllers,
  validation, persistence, asset lifecycle, presets, and MCP tools.
- [x] Use package routes for appearance, branding, presets, stored assets, and
  factory assets. Do not create School copies of Kafil's deleted appearance,
  branding, preset, storage, API-client, query-key, hook, or editor layers.
- [x] Backfill only the current School design/logo values that have a real
  semantic match. Keep school name, locale, currency, and time-zone settings in
  School's settings domain. *(The existing marks and design are the factory
  definition. The disposable database confirmed no legacy appearance or
  branding row needs a misleading managed-row backfill. School name, language,
  currency, and time zone remain in `loadSchoolUiSettings()`.)*
- [x] Add package adoption tests for schema identity, route/guard policy,
  storage isolation, public projections, factory files, and the absence of
  app-owned duplicate theme modules.

### 6d. Add the package-owned React server theme snapshot

- [x] Add one `apps/dashboard/src/lib/serverTheme.ts` module with
  `server-only` that calls `schoolTheme.react(...)` exactly once at module
  scope and imports the definition only through `@sms/server/theme`.
- [x] Use School's single-process server binding; do not make a public-origin
  HTTP self-fetch and do not import `najm-kit`'s client barrel from a Server
  Component.
- [x] Export the combined loader and appearance/branding accessors from the same
  singleton so root, auth, first-login, and dashboard layouts share one
  request-scoped snapshot while the next request sees saved changes.
- [x] Preserve independent appearance and branding fallback. A missing stored
  logo must not discard a valid appearance, and a malformed stored appearance
  must not replace valid factory branding.
- [x] Keep diagnostics sanitized. Never log response bodies, headers, cookies,
  raw thrown values, private settings, or asset bytes.
- [x] Add tests for independent fallback, invalid envelopes/payloads, visible
  throwing factory errors, one resolution within a render, fresh resolution
  across requests, and a client-bundle guard. *(School's boundary tests pass;
  the published package React-server suite passes 21/21 and covers the
  request-cache and independent-fallback behavior under `react-server`.)*

Implementation notes (2026-08-11):

- Independent fallback is the package's, not School's: `serverTheme.ts` is
  three lines delegating to `schoolTheme.react()`, and the root layout awaits
  `loadServerAppearance()` and `loadServerBranding()` as two independent
  resolutions in one `Promise.all`. School adds no coordinating layer that
  could couple them.
- `apps/dashboard/src/lib/serverSettings.ts` is the one place School logs a
  theme/settings failure, and it logs only `error.name` — never the row, the
  payload, the connection string, or the thrown value. It returns `null` on
  failure rather than taking the login screen down for a display preference.
- `apps/dashboard/src/lib/themeAdoption.test.ts` covers the single module-scope
  `schoolTheme.react()` call, `server-only` on both snapshot modules, the
  `cache()` per-render resolution, the sanitized diagnostic, and the documented
  precedence order. The remaining bullets — invalid envelopes, a throwing
  factory, cross-request freshness — exercise package behavior through a real
  request and belong with the browser/database acceptance run.

### 6e. Replace the client provider composition

Refactor `apps/dashboard/src/app/providers.tsx`:

- [x] Import `NajmAppProvider` from `najm-kit/app`. Do not look for or import a
  package export named `NajmProviders`.
- [x] Reuse `apps/dashboard/src/providers/QueryProvider.tsx`; remove the second
  Query Client implementation from `app/providers.tsx`.
- [x] Keep `AuthProvider` and pass the typed `initialSession`.
- [x] Keep `KeyboardProvider` only for real School shortcuts.
- [x] Mount one `NajmAppProvider` with translations, initial language, design,
  theme, time zone, currency, locales, and the School preference endpoints.
  Mount one `NThemeBrandingProvider` from `najm-theme/react` inside it using the
  same server snapshot, and import `najm-theme/styles.css` once.
- [x] Remove the direct `NajmDesignProvider`, `useTheme`, mount-only theme
  workaround, and manual `applySmsTypographyVars()` after proving the package
  applies the same design/typography tokens.
- [x] Keep `NajmClientRoot` once for dialogs/toasts.
- [x] Keep form dev tools disabled by default. If School needs F8, expose a
  development/admin setting and pass it to `formDevTools`; never hard-enable it
  for every production user.

### 6f. Replace duplicated consumers

- [x] Change `PageHeaderGlobalActions` from `next-themes` to
  `useNajmTheme()`.
- [x] Migrate `useLanguage.tsx` consumers to Najm i18n's provider/hook, keeping
  one temporary facade if needed to avoid a broad unsafe rewrite.
- [x] Remove `next-themes` and `themeProvider.tsx` only after `rg` proves no
  remaining consumer.
- [x] Remove custom F8 logic from `DevFormFiller`, Student, Teacher, and Staff
  forms only after package-owned filling handles their schemas and relation
  fields. Use per-form overrides for relation IDs; do not generate fake IDs.
- [x] Wrap `DashboardShell` in `NSidebarProvider` and use its context for the
  mobile trigger. Remove the Zustand sidebar store only if no non-Kit state
  still needs it.
- [x] Use the sidebar logo render prop for collapsed/mobile state instead of
  reading a separate approximation of the sidebar state.
- [x] Compose `najm-theme/react` appearance, branding, and preset settings
  components inside School's existing settings surface. Keep School account,
  academic, database, and other product settings app-owned.
- [x] Render sidebar, login, and credential-setup marks with `NThemeImage` slot
  components. Do not introduce a School branding-image wrapper or hard-coded
  public factory paths.

Implementation notes (2026-08-11):

- `useLanguage.tsx` is now a thin facade over `najm-i18n/react`. The catalog,
  the active language, and `changeLanguage` all come from the `I18nProvider`
  that `NajmAppProvider` mounts, so there is one translation source. The facade
  keeps exactly one behavior the package deliberately lacks — a per-key
  fallback to English — because `najm-i18n` echoes a missing key by design and
  School builds four locales from one source catalog. `i18n:check` remains what
  makes a gap visible; the fallback only keeps the screen readable.
- `common.pagination.*` was added to all four locale files, so `NTable`'s
  labels are localized globally rather than rendering raw keys. The locale
  edits are additive only; the compact one-line objects the Discipline and
  Behavior Rewards work uses were left byte-identical.
- `DevFormFiller` turned out to be inert — its `handleF8` prop defaulted to
  `false` and no call site passed it, so it registered no listener and every
  form was already driving the package contract through `NForm devTools`. The
  component and its 17 usages are deleted. The three `WizardForm` screens
  (Student, Teacher, Staff) dropped their hand-rolled F8 listeners and
  `wizardKey` remount trick for `WizardForm`'s own `devTools`, which resets the
  steps and seeds every step itself. School still supplies the fill values —
  `buildFill` generates Moroccan names, phones, and student codes and picks
  real relation IDs from loaded options, which is exactly what the package
  cannot know and why no fake IDs are generated.
- F8 now defaults **off** in production. `isDevFill` previously defaulted to
  *enabled* unless a deployment opted out; it now requires
  `NEXT_PUBLIC_FORM_FILL_ENABLED` to opt in and is otherwise limited to
  non-production builds.
- `NSidebarProvider` wraps the shell so `NPageHeader` resolves `openMobile()`
  from context; the legacy standalone hamburger is gone. `NSidebar` is now
  uncontrolled, and `SidebarStore.ts` plus its only consumer
  `useSidebarResponsive.ts` are deleted, which also made `react-responsive`
  unused and removable. `FinancialOperationsPage` is the one dashboard route
  with no `NPageHeader`, so it got a small context-driven trigger of its own
  rather than being left unnavigable on a phone.
- The theme settings surface is `AppearanceSection`, mounted beside the
  settings form rather than inside it, because `najm-theme` persists each
  resource against its own revision through its own routes.

Phase 2 focused acceptance:

- [x] Initial server HTML has the correct `lang`, `dir`, dark class, and
  `data-time-zone` without hydration correction. *(2026-08-26/27: verified by
  `tests/e2e/najm-upgrade.spec.ts` test 1 against a real production build,
  Postgres, and Chromium — see §11.)*
- [x] Language, theme, and time-zone changes persist across refresh. *(same
  run: cookie set, `page.reload()`, attributes re-checked.)*
- [x] Arabic switches the full document to RTL. *(same run, plus test 4 across
  admin/en, principal/fr, teacher/ar, accounting/es, student/ar, parent/fr.)*
- [x] School name/logo and design load without a client flash. *(same run:
  auth logo visibility and `naturalWidth > 0` polled directly.)*
- [ ] Money/date/number formatting follows language, Morocco locale mapping,
  School currency, and School time zone. *(not exercised by this suite — no
  test asserts a formatted amount/date value.)*
- [ ] NTable pagination labels are localized globally. *(not exercised — the
  suite never opens a table view; static basis already recorded in
  `docs/evidence/najm-upgrade/kit-surface-inventory.md`.)*
- [x] Mobile sidebar triggers work from nested `NPageHeader` components.
  *(same run, test 2: 390×844 viewport, "Open sidebar" button.)*
- [ ] F8 is unavailable for unauthorized/production users and works for each
  opted-in supported form without invalid relation values. *(not exercised by
  this suite.)*

## 7. Phase 3 - migrate Najm Auth v2 to v3

### 7a. Schema and migration

- [x] Import and re-export `credentialSetupSessionsTable` and
  `credentialSetupRequirementsTable` from the exact installed
  `najm-auth/pg` declarations in School's schema composition.
- [x] Keep the existing auth table aliases and domain foreign keys unchanged.
- [x] Generate a new additive School migration with `bun run db:generate`.
- [x] Review every statement. It must add only the v3 credential-setup storage
  for this phase and must not recreate users, roles, permissions, or tokens.
- [x] Add schema and migration-content tests.
- [x] Run the migration against a disposable/backup-restorable PostgreSQL
  database before any production consideration. *(2026-08-14: a fresh local
  PostgreSQL 18 cluster applied all 46 journaled migrations and exposed 75
  public tables. Because this Windows host has no pgvector build, only the
  temporary local input for `0014`/`0020` used the already documented
  `real[]`/index substitutions; committed SQL stayed unchanged.)*

### 7b. Server auth configuration and provisioning

- [x] Verify `authConfig()` against the installed v3 declarations, including
  dialect, encryption, email, identity preset, frontend URL, cookie paths,
  session secret, and recovery URL behavior.
- [x] Add the required environment values to School's real env documentation
  and deployment templates. Never commit secrets.
- [x] Keep existing Student/Parent/Staff provisioning behavior:
  - explicit password for seed/import workflows;
  - no password for Najm's email invitation flow.
- [x] Do not introduce CIN-based temporary login merely because Kafil uses a
  Moroccan temporary credential for its family domain. That is a separate
  School product/security decision.
- [x] If School later opts into temporary credentials, use v3
  `temporaryCredential + requireCredentialSetup` together and add domain tests;
  never send a permanent password in the same call. *(Not enabled in School's
  product provisioning; the isolated E2E fixture uses the exact pair only to
  exercise the package-owned setup flow.)*

### 7c. Login and credential setup

- [x] Update the login schema and UI to send `identifier`, `password`, and
  `rememberMe` unchanged to Najm Auth.
- [x] Branch on `LoginResult.nextStep`:
  - `authenticated` -> safe requested path or School dashboard;
  - `credential_setup` -> School's public password-change route.
- [x] Keep safe same-origin redirect validation and reject auth/API/static-file
  destinations.
- [x] Add a public credential-setup route and UI using Najm's standard
  status/change/cancel endpoints. Do not recreate setup tokens or password
  policy locally.
- [x] After setup, require a fresh normal login as the installed contract
  specifies.
- [x] Wrap only the catch-all POST handler with
  `withAuthCookiePersistence`; keep GET/PUT/PATCH/DELETE on the normal server
  handler.
- [x] Use a School-specific remember-preference cookie and keep login, refresh,
  setup completion, logout, and expiry semantics consistent.

### 7d. Proxy and routing

- [x] Keep `apps/dashboard/src/lib/auth.ts` core/proxy safe.
- [x] Keep `apps/dashboard/src/proxy.ts` importing only `auth.ts`.
- [x] Preserve the speculative-prefetch behavior unless the installed Najm
  contract explicitly replaces it.
- [x] Make the auth layout redirect an already authenticated user to the
  School dashboard.
- [x] Do not invent Kafil role routes. Build School `roleRoutes` only from a
  documented route/role matrix and retain controller/policy enforcement.

Phase 3 browser acceptance against a real test database:

*(2026-08-26/27: the four items below marked `[x]` are verified by
`tests/e2e/najm-upgrade.spec.ts` against a real local PostgreSQL 18, a real
production build, and a real Chromium — see §11. The three still `[ ]` are
real gaps this suite does not exercise, not merely unattempted before.)*

- [x] Existing admin login.
- [x] Existing teacher/staff login and permitted navigation. *(covered for
  admin, principal, teacher, accounting, student, parent — not every School
  role, e.g. driver/nurse/etc. are not in this matrix.)*
- [x] Wrong password ... *(only the wrong-password case is covered.)*
- [ ] ... inactive user, revoked session, and locked user. *(not exercised.)*
- [x] Remember Me off and on ... *(off = session-cookie `expires:-1`; on =
  persistent cookie `expires>0` in a fresh context.)*
- [ ] ... across browser restart. *(a fresh context is a reasonable proxy but
  not a literal restart; not distinguished from the on/off check above.)*
- [ ] Refresh and signed-session recovery. *(not exercised.)*
- [x] Login result requiring credential setup.
- [x] Successful password replacement, cancellation, expiry, replay denial,
  and fresh normal login.
- [x] Logout clears the correct auth and preference cookies.

## 8. Phase 4 - adopt the shared React server session adapter

Hard prerequisite: the adapter-containing Najm Auth release has passed the
Najm gates in Kafil's `AUTH-SESSION-PLAN.md` and is verified in the registry.

- [x] Add `apps/dashboard/src/lib/session.ts`:

  ```ts
  import "server-only";

  import { createReactServerAuth } from "najm-auth/client/server/react";

  import { auth } from "./auth";

  export const serverAuth = createReactServerAuth(auth);
  ```

- [x] Create this singleton exactly once at module scope. Never call the
  factory inside a layout, page, component, route handler, or request helper.
- [x] Use `serverAuth.getSession()` in the root layout for the optional initial
  session.
- [x] Use the same singleton in the auth layout so root and nested layouts share
  one resolution.
- [x] Use `serverAuth.requireSession()` in the dashboard layout.
- [x] Add `serverAuth.requireRole()` only at real School server-presentation
  boundaries backed by the documented role matrix.
- [x] Do not catch operational/configuration errors and convert them to a login
  redirect. Only an actual unauthenticated outcome should redirect to login.
- [x] Do not import the React adapter from proxy, route handlers, scripts, the
  backend package, or client components.
- [x] Add focused tests proving one resolution across root/auth/dashboard/page
  calls and isolation between separate requests.

Phase 4 acceptance:

- [x] Anonymous protected navigation redirects to login. *(2026-08-26/27:
  `najm-upgrade.spec.ts` test 1, `/students` → `/login?from=%2Fstudents`.)*
- [x] Authenticated navigation to the login page redirects to the dashboard.
  *(test 2, `/login` → `/` once authenticated.)*
- [ ] Root and nested layouts observe one session snapshot. *(covered as a
  static property by `session.test.ts`'s source-text assertions, not by a
  live E2E check — not the same evidence.)*
- [ ] Wrong-role navigation reaches the forbidden destination without a login
  loop. *(N/A under the plan's own §7d decision not to invent `roleRoutes`
  without a documented matrix — nothing to exercise yet.)*
- [ ] Expired signed-session recovery occurs once for a render. *(not
  exercised.)*
- [ ] Missing secrets, invalid recovery configuration, and transport failure
  remain visible operational failures. *(not exercised — would need
  deliberately broken config.)*
- [x] Proxy/Edge builds without importing React-server code.
- [x] `bun run db:generate` produces no migration for this phase.

## 9. Phase 5 - audit Najm Kit 2.1 to 2.11 behavior changes

This is a visual and interaction acceptance phase, not permission to redesign
every School screen.

### Tables and pagination

- [x] Inventory every `NTable` surface and record whether its data is local or
  server-paginated, its total/pageCount contract, desktop mode, card mode, and
  dynamic-height behavior.
- [x] Accept the new numbered pagination intentionally or pass
  `paginationVariant="compact"` where School must preserve the old UI.
- [x] Never show numbered pages for untrustworthy manual pagination totals.
- [ ] Validate exact page-size boundaries, mobile card continuation, append
  retry, loading skeletons, and RTL controls.
- [x] Adopt `najm-kit/pagination` and `najm-kit/query` only for real
  server-backed lists. Do not mechanically rewrite every table in the provider
  phase.

### Headers, sidebar, cards, inputs, and images

- [x] Review every non-card `NPageHeader` because 2.6 changed it to full-bleed
  layout and a taller mobile height.
- [ ] Verify `NPageLayout` spacing, existing School `gap-2` shell styles, and
  sidebar/header alignment visually; do not compensate with unverified CSS.
- [ ] Verify select item icons, remote comboboxes, touch-visible row actions,
  image inputs, dialogs, and RTL behavior.
- [ ] Consider `najm-kit/person-images` only for missing person-image fallbacks.
  Do not replace real uploaded School avatars. *(2026-08-26 audit: not adopted.
  No call site in the repo references `najm-kit/person-images`; the actual
  fallback is a local initials generator,
  `apps/dashboard/src/lib/avatar.ts`'s `getAvatarFallback()`. No rationale for
  the deviation is recorded elsewhere. This is a product decision to revisit,
  not a correctness bug — the package offers illustrated, role/gender-aware
  placeholder art that initials do not.)*
- [x] Replace local chart/format helpers only when the shared contract covers
  the behavior and focused tests prove no domain regression.
- [x] Verify the `najm-theme@0.2.1` definition bootstrap preserves independent
  appearance/branding fallback, shares one snapshot per React render, retries
  on the next request, and never enters the client bundle.

Phase 5 browser matrix:

- roles: admin, principal, teacher, accounting, student, parent, and one role
  denied from an operator surface;
- locales: en, fr, ar RTL, es;
- viewports: phone, tablet, desktop;
- states: empty, loading, error, one item, exact page, multiple pages, dialog
  open, keyboard-only, touch actions, and dark mode.

*(2026-08-26/27: `najm-upgrade.spec.ts` test 4 covers 6 of these cells
directly — admin/en/1440×900/light, principal/fr/1024×768/dark,
teacher/ar/390×844/dark, accounting/es/768×1024/light, student/ar/390×844/light,
parent/fr/1024×768/dark — asserting `lang`/`dir`, dark class, one keyboard-focus
target, and a full-page screenshot per case, against a real login and real
per-role routing. Not covered: the denied-operator-surface role, and the
empty/loading/error/dialog-open/touch-action states — this suite only exercises
the login→dashboard landing, not any table or dialog interaction.)*

Store screenshots and a short acceptance ledger under a new
`docs/evidence/najm-upgrade/` folder or the School repository's established
evidence location.

## 10. Phase 6 - other Najm packages and cleanup

- [x] Confirm `najm-auth@3.1.1` preserves the accepted 3.1.0 login,
  credential-setup, cookie persistence, and React server session behavior.
- [x] Confirm `najm-core@2.0.5` controller/server behavior, `.load(moduleObject)`,
  catch-all `handle(server)`, decorators, and exports compile without app-local
  shims.
- [x] Confirm `najm-i18n@2.0.3` supplies the frontend catalog and backend
  locale parity without two translation sources.
- [x] Confirm auth, storage, MCP, RAG, chatbot, email, rate, guard, validation,
  and database packages retain their existing School behavior. Their unchanged
  versions are not a reason for unrelated refactors.
- [x] Remove only dependencies and wrappers proven unused after migration:
  duplicate Query Provider logic, `next-themes`, the theme wrapper, obsolete
  F8 helpers, and obsolete translation bridges. *(Also removed after `rg`
  proved no consumer: `SidebarStore.ts`, `useSidebarResponsive.ts`,
  `DevFormFiller.tsx`, and the `react-responsive` dependency. The
  `useLanguage.tsx` facade is kept deliberately, for the per-key English
  fallback documented in §6f.)*
- [x] Update `AGENTS.md`, `CLAUDE.md`, and README commands/contracts so Claude
  does not reintroduce npm commands, old Najm versions, direct
  `NajmDesignProvider`, or direct layout `auth.getSession()` calls.
- [x] Add a dependency-resolution test or documented command that fails when
  multiple `najm-auth`/`najm-kit` versions return.

## 11. Verification gates

Latest local evidence (2026-08-14, uncommitted CI repair):

- `bun run lint`: pass, 0 errors and the same 3 `<img>` warnings.
- `bun run test:server`: 1137 pass, 0 fail, 2053 assertions. The 28 stale
  Parent/Student fixtures are fixed against the current constructors and
  `AuthService.provisionUser` contract.
- `bun run test:dashboard`: 39 pass, 0 fail, 100 assertions.
- `bun run test:seed`: 9 pass, 0 fail, 29 assertions.
- `bun run i18n:check`: no missing static keys across `ar`, `en`, `es`, `fr`.
- `bun run db:check`: pass. `bun run db:generate`: 74-table schema, no changes.
- `bun run build:all`: pass, including server declarations, seed typecheck,
  Next compile/typecheck/page generation, proxy and every new route.
- Focused CI regression: 3 pass, 0 fail, 6 assertions for StudentService
  dependency order, additive migration content, and journal order.
- Fresh PostgreSQL 18: 46 migrations applied, 75 public tables, and the full
  seed completed with 1,224 users, 500 students, 3,945 payments, 1,000
  payslips, and 58,740 attendance rows. Temporary local vector substitutions
  were used as documented; committed SQL stayed unchanged.
- `bun run --cwd packages/najm-theme test:rsc` was not rerun because School has
  no local `packages/najm-theme` workspace; School consumes the published
  package only.
- Production Playwright: not executed. The required Chromium 1217 headless
  shell is missing; cached/system browsers launch but cannot connect to the
  Playwright debugging pipe. The in-app browser is also unavailable in this
  session.
- GitHub Actions run `31543464909` failed before browser acceptance in
  `seed:full`; the local dependency-order repair has not been pushed, so no
  green post-fix run exists yet.

Follow-up audit (2026-08-26):

- The repair above was in fact committed (`ccd1ee6`) and pushed to both `main`
  and `origin/agent/finish-najm-upgrade`, contradicting the bullet immediately
  above it, which is left unedited as the historical record of what was true
  on 2026-08-14.
- That push triggered GitHub Actions run `31846324773` (43m34s) against
  `ccd1ee6`. `seed:full` now passes — the original `StorageService` ordering
  defect is confirmed fixed. Lint, `test:server`, `test:dashboard`,
  `test:seed`, `i18n:check`, `db:check`, `build:all`, the full migration chain,
  and Chromium installation all passed. The run still failed, in the new
  "Run Najm upgrade browser acceptance" step: test 1 of 4
  (`tests/e2e/najm-upgrade.spec.ts:94`) threw
  `TypeError: "/api/ui-language" cannot be parsed as a URL` from
  `page.request.post(...)` at line 100, closing the browser context before
  tests 2-4 (login, credential setup, role/locale/viewport matrix) could run.
  Every Phase 2-5 browser-acceptance checkbox in this plan is therefore still
  unverified, not merely unattempted. A working, directly comparable pattern —
  `page.request.get(relativePath)` against a configured `baseURL` — exists and
  passes in Kafil's `test/e2e/image-delivery.e2e.ts:61-63`, which ruled out
  the general mechanism as broken; a standalone reproduction confirmed the
  same locally. The CLI-invocation difference from Kafil
  (`bunx playwright test` vs. School's direct `@playwright/test/cli.js` under
  `bun`) could not be tested either way, because launching a real browser
  hangs indefinitely on this host once past the missing-Chromium error
  (installing the pinned revision did not resolve the debugging-pipe issue
  noted below) — both invocation styles need a browser to reach the code path
  that matters, so neither could be exercised.

  Two real defects were found and fixed by inspection instead:
  `loginInNewContext` and the role/locale/viewport matrix test both created
  contexts via `browser.newContext()` with no `baseURL` option at all (lines
  75 and 219 as they were), unlike the default `page` fixture, which gets it
  from the project config automatically — so every relative call made through
  those manually created contexts had no base to resolve against, regardless
  of what made the default-fixture case fail. Separately, every
  `page.request.*` call in the file used a relative path, which is the
  precise dependency that failed for test 1. Both are fixed in
  `apps/dashboard/tests/e2e/najm-upgrade.spec.ts`: the two `newContext()`
  calls now pass `{ baseURL }`, and a new `apiPath()` helper builds an
  absolute URL via `new URL(path, baseURL)` for all 15 request call sites, so
  no call site depends on implicit relative-path resolution at all.
  `playwright.najm-upgrade.config.ts` now exports `baseURL` as a named export
  so the spec can reuse the exact value the config computes rather than
  duplicating that formula. Verified: `bunx playwright test --list` resolves
  all 4 tests cleanly with a dummy `DB_URL`, and `tsc --noEmit` shows zero new
  errors on either file. Not verified: an actual live run — this host has no
  local Postgres for the suite's own queries, and, as above, no browser
  launch completes here regardless of CLI invocation. Not committed.
- Independently of the above, this audit found a second seed-container defect:
  `packages/server/src/modules/seed.ts` registered `StudentRouteValidator`
  with only `[StudentRouteRepository]`, one dependency short of its real
  two-argument constructor in `StudentRouteValidator.ts`. Every seeded
  bus-route assignment therefore threw
  `TypeError: undefined is not an object (evaluating 'this.studentRepository.getById')`
  and was silently caught as a skip — GitHub run `31846324773`'s own seed log
  reads "Student routes seeded (0 records)" despite the step reporting
  success, and the transport-fee auto-creation tied to route assignment never
  ran for any seeded student. The 2026-08-14 evidence below never reports a
  student-route count, consistent with the same silent zero having gone
  unnoticed then too. Fixed by adding `StudentRepository` to that
  registration; `bun run build:server` and the full server suite (1137
  pass/0 fail) confirm no regression. Not yet committed.
- `bun run test:dashboard` fails on this Windows checkout specifically (38
  pass/1 fail, not the 39/0 recorded above): `session.test.ts` fails because
  git's `core.autocrlf=true` (confirmed set) gives `session.ts` CRLF line
  endings, breaking the test's strict `\n`-split string-equality check. The
  same suite passes on GitHub's Linux runner. Environment-specific test
  brittleness, not a logic defect — left unfixed pending a decision on
  whether to normalize line endings or loosen the assertion.
- Two minor completeness gaps, both fixed in this pass: an orphaned
  `settings.system.systemTheme` translation key (no source reference) removed
  from all four locale catalogs; and the `najm-kit/person-images` checkbox in
  §9, which was marked done but never adopted — corrected there rather than
  forcing adoption, since swapping the avatar fallback is a visible product
  decision, not a bug fix.

Full local browser-acceptance resolution (2026-08-27), superseding the
"not verified: an actual live run" line above:

- Installed PostgreSQL 18 locally (winget's own download failed with an
  HTTP 403 from its CDN; the same URL worked fine via plain `curl`, so the
  installer was fetched directly and run silently). Ran the real migration
  chain (with the same documented, reverted-after `vector`→`real[]`
  substitution in `0014`/`0020` for the missing Windows pgvector build) and
  `bun run seed:admin` against it — sufficient for this suite, which creates
  its own throwaway users and only needs `roles` seeded. (`seed:demo`'s
  payment-generation step hung consuming CPU with Postgres itself idle,
  i.e. an application-side loop, not a lock or slow query, on a
  `MoneyError: Invalid money value: 2424.6800000000003`-adjacent record — a
  separate, pre-existing float-precision issue in the demo generator, out of
  this plan's scope and not investigated further; the full demo dataset was
  not needed and the run was killed rather than chased.)
- Diagnosed the local browser-launch hang precisely with `DEBUG=pw:browser`:
  Chromium launches as a real OS process in both cases, but connecting
  Playwright's `--remote-debugging-pipe` to it hangs indefinitely under Bun
  while completing in 22ms under plain Node — reproduced identically with
  this session's tool sandbox both enabled and disabled, ruling that out.
  This is a Bun-on-Windows child-process/named-pipe gap, unrelated to
  School's code; CI's Linux runner does not have it (its browser already
  launched in the failed run above). Running Playwright's CLI via `node`
  instead of `bun` unblocks local browser testing on this host generally.
- With a live database and a working local browser, ran the actual suite
  (`node --env-file=.env.local ../../node_modules/@playwright/test/cli.js
  test --config=playwright.najm-upgrade.config.ts` from `apps/dashboard`,
  against `bun run build:all`'s production build) and iterated to a full
  pass, fixing four real, previously-unreachable defects in turn — CI never
  got past test 1, so none of these were visible before:
  1. The `baseURL`/`apiPath` fix above did resolve test 1 exactly as
     intended — first real evidence it was correct, not just plausible.
  2. Test 2 then hung on `getByLabel('Keep me logged in')`. The rendered
     checkbox's `<label for="...">` id is never applied to either the
     visible `<button role="checkbox">` or the paired hidden
     `<input type="checkbox">` — a `najm-kit@2.11.2` accessibility defect in
     `FormInput`'s checkbox variant, not something School's code can fix
     (published, versioned package; the plan's own rules forbid patching
     `node_modules`). Two School call sites were passing the wrong prop name
     entirely (`label` instead of the typed `formLabel`) —
     `apps/dashboard/src/app/(auth)/login/page.tsx:145` and two checkboxes in
     `apps/dashboard/src/features/Parents/components/SimpleParentForm.tsx:189,197`
     — corrected for consistency with the package's actual API and a better
     label-above-checkbox layout, but this alone does not fix the id-wiring
     defect. The test's `login()` helper now finds the checkbox by DOM
     structure (`[data-slot="form-item"]` containing the label text) instead
     of the broken `for`/id association.
  3. Test 2 then hit a strict-mode violation: two elements matched
     `button:has(svg.lucide-log-out)` after a viewport resize, because the
     sidebar keeps both its desktop and mobile variants mounted and toggles
     visibility with CSS rather than unmounting — ordinary responsive
     behavior, not a defect. The locator now adds `:visible`.
  4. Test 3 then passed the credential-setup expiry check locally only after
     a further local-only fix: this machine's freshly installed Postgres
     defaulted to `Africa/Casablanca` (UTC+1), while `najm-auth` always
     writes and compares `expires_at` via JS `Date.toISOString()` (UTC); the
     test's raw SQL `now() - interval '1 minute'` used the server's local
     wall-clock time, so the 1-hour skew swallowed the 1-minute backdate and
     the "expired" session still validated. Reset the local server to UTC
     (`ALTER SYSTEM SET timezone TO 'UTC'`) rather than touching the test —
     CI's Postgres container has no `TZ` override and defaults to UTC, so
     this does not reproduce there; it was purely this local install
     inheriting the host's timezone.
  5. Test 4 then failed because it reuses `ensureRoleUser`'s deterministic
     ids, and test 3 leaves the `admin`/`principal`/`teacher` e2e users with
     an outstanding `credential_setup_requirements` row — correct behavior
     for the cancelled and expired cases (they never completed setup) that
     test 4 didn't account for. Test 3 now explicitly clears
     `required`/`completed_at` for the three users it touches at the end of
     the test.
- Result: `4 passed (38.4s)` — the complete suite, including every item
  above, now passes against a real database, a real production build, and a
  real browser. None of this session's changes are committed or pushed. The
  only remaining way to add evidence beyond this local run is a real CI run
  against the same changes, which needs a push and was not done without
  separate authorization.

The exact runtime and CI matrix is in
`docs/evidence/najm-upgrade/acceptance-ledger.md`.

Run focused tests during each phase. Close the complete local implementation
with:

```bash
bun run lint
bun run test:server
bun run test:seed
bun run build:all
bun run db:check
bun run db:generate
```

Additional required evidence:

- [x] Auth and settings tests use a real disposable PostgreSQL database where
  migrations, credential requirements, refresh families, or cookie recovery
  cannot be proven with mocks.
- [x] Add a focused Playwright auth/provider suite if School has no current
  runnable equivalent. The runner must boot the production Next.js build under
  Bun and use an isolated test database.
- [x] Record exact pass/fail counts and commands, not only "tests passed".
- [x] After the auth migration, `db:generate` must report no further drift.
- [x] After the session-adapter phase, `db:generate` must create nothing.
- [x] Run `git diff --check` and audit the complete worktree for unrelated
  changes and secrets.

## 12. Production ordering and rollback

1. Verify and back up the intended production database.
2. Apply only the reviewed additive Najm Auth v3 schema migration.
3. Deploy the v3-compatible app with the exact matching packages and secrets.
4. Run normal login, Remember Me, refresh/recovery, setup-required login, and
   logout acceptance.
5. Deploy provider/session/UI phases only after their own local and browser
   gates.
6. Treat app rollback and database rollback separately. The old v2 runtime can
   ignore additive v3 tables; do not drop them during an emergency app rollback.

Do not combine Najm publication, School merge/push, School database migration,
School deployment, and production acceptance into one status. Report each as a
separate pass/fail boundary.

## 13. Completion definition

The plan is complete only when:

- School resolves one exact approved version of every upgraded Najm package;
- `NajmAppProvider` is the single UI-provider boundary and no duplicate theme,
  translation, formatting, table-default, or F8 ownership remains;
- School's auth v3 schema, login result, Remember Me, credential setup, cookie
  persistence, refresh/recovery, and logout flows pass against a real database;
- root, auth, dashboard, and protected pages share the published React server
  session adapter without cross-request leakage;
- proxy stays core/Edge safe and backend authorization remains authoritative;
- the full source, build, database, browser, RTL, responsive, and worktree gates
  are recorded at one accepted School commit;
- publication, GitHub, database, deployment, and production status are reported
  truthfully and separately.
