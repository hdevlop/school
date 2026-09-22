# Workspace standardization v2 — School evidence

Plan: [`WORKSPACE-STRUCTURE-STANDARDIZATION-PLAN.md`](../../../WORKSPACE-STRUCTURE-STANDARDIZATION-PLAN.md).
Recorded 2026-09-22 on the maintainer's Windows workstation. Secret-free: every
runtime probe used a throwaway PostgreSQL cluster and synthetic values, and no
value from `apps/dashboard/.env.local` was read or printed.

Gate states: **passed**, **failed**, **blocked** (the environment cannot run
it), **not run** (deliberately skipped, with the reason).

## Baseline

| Item | Value |
| --- | --- |
| Branch / HEAD | `main` / `48c9eecfaf44c81718d5ffcd5704a82aa666988b` |
| Dirty tree at start | 67 paths. v1 workspace changes (root scripts, Dockerfile, CI, env docs, seed/server manifests, `dev-with-server.mjs`, boundary script, docs) and unrelated table/feedback edits (46 feature files, deleted `shared/PageLoadingState.tsx`, `TableEmptyState.tsx`, `TableErrorState.tsx`, untracked `services/apiError.ts`). Both were preserved; none were reverted or staged. |
| Toolchain | Bun 1.3.14, Node 24.16.0, Next 16.2.12, TypeScript 6.0.3; Najm pins unchanged from the root `package.json` (for example `najm-next` 0.8.0, `najm-kit` 2.16.10, `najm-i18n` 2.1.2) |
| Docker | Not installed on this workstation |

Baseline gates on the dirty tree, before any v2 edit:

| Command | Exit | Result |
| --- | --- | --- |
| `bun run lint` | 0 | Dashboard only |
| `bun run typecheck` | 0 | Included `build:types` and a seed `tsc` |
| `bun run i18n:check` | 0 | No missing keys |
| `bun run test` | 0 | 181 config, 60 access-reset, regex boundary script |

## What changed

- **Source exports.** `@sms/server` exports `src/*.ts` for every existing
  subpath except `./locales`, which moved to contracts. A codemod replaced all
  558 `@server/*` alias imports in 280 server source and test files with
  relative paths; none pointed at a missing file. The root, server, seed and
  dashboard tsconfigs no longer define cross-package aliases.
- **Retired machinery.** Removed `build-types.mjs`, `tsup.config.ts`, the
  `build`/`build:js`/`build:types` server scripts, `apps/dashboard/scripts/dev-with-server.mjs`,
  root `build:server`, `build:seed` and `seed:prepare`, and the `tsup` root
  dependency. An audit found no CI, Docker or Compose user of these. `build:all`
  remains an alias of `build`.
- **Contracts.** `@sms/contracts` gained `./locales` (the catalog, moved
  byte-for-byte; `diff --strip-trailing-cr` against HEAD matches for all five
  files) and `./fixtures` (`fakers.ts`, `staticData.ts`, `entities.ts` and the
  four reference-data JSON files, moved unchanged except as noted below). It
  now depends on `najm-i18n` 2.1.2, `@faker-js/faker` and `nanoid`.
- **App → seed removed.** The dashboard's two faker imports now come from
  `@sms/contracts/fixtures`, and `formFill.ts` moved into
  `apps/dashboard/src/lib`. The exam and assessment generators no longer read
  the seed-generated `teachers.json`: every caller already overrides class,
  section, subject and teacher with live options (`ExamForm`,
  `AssessmentForm`), so those values never reached a form. `formFill.test.ts`
  pins override precedence.
- **Translation key typing.** Source consumption exposed that the old compiled
  `dist/locales/index.d.ts` imported a JSON file that was not in `dist`. So
  `SchoolTranslationKey` had silently been `string`, and 49 dynamic-key calls
  in 26 files depend on that. The registry now declares
  `SchoolTranslationKey | (string & {})`, which keeps autocomplete and the
  same checking. Narrowing is recorded debt.
- **Clean-checkout typecheck.** v1 had moved CI to `bun run check`, which
  typechecks, but a clean checkout has no generated `next-env.d.ts`, so image
  imports failed to typecheck. The dashboard `typecheck` script now runs
  `next typegen` first, as the installed Next 16 documentation prescribes.
- **Boundary checker.** `scripts/check-workspace-boundaries.mjs` (TypeScript
  compiler API resolution and graph traversal from every `"use client"`
  module) replaces the regex script. Its policy is
  `scripts/workspace-boundaries.config.mjs`, and 24 fixture cases run the
  real checker and policy. The same checker and test files are used in Kafil.
  Two defects were found while running it and fixed, each with a regression
  case or proof. A package installed in a workspace's own nested
  `node_modules` was being treated as workspace code; it is now external
  (found through Kafil's test fixture). And a lowercase drive letter in the
  working directory made every ownership check fail on Windows; the root is
  now canonicalized.
- **Lint.** Root `lint` now covers the dashboard, contracts, server, seed and
  `scripts/`. ESLint and `eslint-config-next` are declared at the root, which
  moved Bun's hoisted `semver` copy from 7.7.4 to 6.3.1. No version changed:
  every `^7` dependent (`sharp`, `jsonwebtoken`, `is-bun-module`,
  `@typescript-eslint/typescript-estree`) has a nested 7.x entry. One
  pre-existing `@ts-ignore` in the moved fakers became `@ts-expect-error`.
  The 47 pre-existing warnings (46 unused variables, 1 `prefer-const`) are
  recorded debt.
- **Dockerfile.** The install stage now copies `bunfig.toml` (it selects the
  hoisted linker, which the image previously ignored). The build stage copies
  the whole installed tree instead of per-workspace `node_modules` paths that a
  hoisted install does not create; those `COPY` lines would have failed on a
  clean build. The runtime file list is documented per command.
- **Docs.** Updated CLAUDE.md, AGENTS.md, README, `docs/architecture/workspace.md`
  (with the new-app checklist) and the contracts README.

## Compatibility gate (Phase A)

Ran against a throwaway PostgreSQL 18 cluster created with `initdb` in the
session scratchpad (port 55811). All 47 journaled migrations were applied in
memory with `vector(768)` → `real[]` and hnsw indexes skipped, because this
host has no pgvector build; the committed SQL was not modified. The result was
78 tables. Env values were injected into the process; Redis was not available.

| Check | Result |
| --- | --- |
| Bun + source exports: `bun src/scripts/admin/seed-admin.ts` | **passed** — server booted through DI; roles, permissions and an admin were created |
| Next dev (Turbopack): `GET /api/health/status` | **passed** — 200, `database: ok`, `cache: ok` (memory driver outside production) |
| Guard: unauthenticated `GET /api/students` | **passed** — 401 |
| Validation: `POST /api/auth/login` with an invalid body | **passed** — 400 `VALIDATION_BODY` |
| Login, then authenticated `GET /api/students` and `/api/roles` | **passed** — 200 with data |
| Server source edit (health `version`) | **passed** — visible on the next request, no rebuild step |
| Contracts catalog edit (`en.json`) | **passed** — API message changed on the next request |
| Syntax error in a controller | **passed** — 500, and the dev log names the file:line; the fix restored 200. Sources restored byte-identical |
| Worker: `bun src/workers/notificationsDispatch.ts` | **passed** — full boot from source, `completed (0 item(s))`. The process then stays alive on open handles; the script and its module graph are otherwise unchanged from before v2 |
| Worker: `bun src/workers/notificationsWorker.ts` for 25 s | **passed** — boot and loop with no error |
| Production webpack build (`next build --webpack`, separate `NAJM_NEXT_DIST_DIR`) | **passed** — no warnings |
| Production `next start` API | **blocked** — production requires a password-protected Redis (fail-closed by design). With an unreachable Redis URL, the bundle initialized plugins and registered every decorated controller through DI (`RouterService.activate`), then stopped at the cache readiness check. The login page rendered. |

## Gates after the change

Working tree:

| Command | Exit | Result |
| --- | --- | --- |
| `bun run lint` | 0 | 0 errors, 47 pre-existing warnings |
| `bun run typecheck` | 0 | Contracts, server, seed, dashboard app and tests, with no emitted server |
| `bun run i18n:check` | 0 | No missing keys |
| `bun run test` | 0 | 193 config (181 + 12 new), 60 access-reset, 24 boundary fixtures; real graph: 888 files, 263 client entries |

Clean snapshot (tracked plus untracked non-ignored files; no `node_modules`,
`dist`, `.next`, `next-env.d.ts` or `.env.local`; CI's throwaway env values
injected):

| Command | Exit | Result |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | 828 packages |
| `bun run check` | 0 | Lint, typecheck (with `next typegen`), i18n, all safe tests, production build, `drizzle-kit check` |

Two earlier snapshot runs failed and were fixed before this one: the missing
`next-env.d.ts` (fixed with `next typegen`), and a new test that assumed
`NEXT_PUBLIC_FORM_FILL_ENABLED` was unset (the case was removed). The two
checker fixes above landed after this snapshot run. The final working-tree run
re-verified them (lint, typecheck, i18n and test all exit 0, with 24 boundary
fixtures).

## Browser acceptance (focused)

Playwright MCP against Next dev on the throwaway database: **passed**.
Login, the dashboard shell and KPI tiles, switching to Arabic (live
`lang=ar dir=rtl` and a server-rendered `<html dir="rtl" lang="ar">`), the
dark theme toggle, F8 form fill on the subject form (values from
`@sms/contracts/fixtures`), and a create round-trip (row visible in the list
and in the database). The only console errors were missing `favicon.ico` and
`icon-192x192.png` assets, which are unrelated.

## Pending and not run

| Gate | State | Reason |
| --- | --- | --- |
| Image build, in-image resolution, synthetic env-marker exclusion | **blocked** | Docker is not installed |
| Production connected acceptance (readiness, authenticated read, worker with Redis) | **blocked** | No Redis on this host; production requires one |
| Worker SIGTERM shutdown | **blocked** | Cannot deliver POSIX signals to a Windows process; verify in the image |
| `bun run dev:https` | **not run** | `--experimental-https` provisions a local CA through mkcert; not done without consent. The script is unchanged except that it is now called directly rather than through the retired orchestrator |
| Commit, push, deployment | **not run** | Not requested |
