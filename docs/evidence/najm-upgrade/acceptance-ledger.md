# Najm upgrade acceptance ledger

Accepted candidate: `agent/finish-najm-upgrade` (final commit recorded after CI)

Date: 2026-08-11

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
| `bun run test:server` | pass; 1134 tests, 2047 assertions, 0 failures |
| `bun run test:dashboard` | pass; 39 tests, 100 assertions, 0 failures |
| `bun run test:seed` | pass; 9 tests, 29 assertions, 0 failures |
| `bun run i18n:check` | pass; all four catalogs contain every static key |
| `bun run db:check` | pass |
| `bun run db:generate` | pass; 74-table schema, no migration generated |
| `bun run build:all` | pass; server declarations, seed typecheck, Next production build and route generation |
| Najm Theme React-server tests | pass; 21 tests, 53 assertions, 0 failures |

The old 28 Parent/Student service failures were stale fixtures, not accepted
debt. Their constructor mocks now include `AuthService`, storage and transport
dependencies in the real order, and create assertions target
`AuthService.provisionUser`. The complete server suite is green.

## Disposable PostgreSQL acceptance

The local run used a fresh PostgreSQL 18 cluster on port `55432`. All
non-vector migration statements were applied in journal order; the host has no
Windows pgvector build, so only migrations `0014` and `0020` used local
test-only `real[]`/index substitutions. The committed SQL was not changed for
that accommodation. GitHub runs the unmodified chain against the
`pgvector/pgvector:pg18` service.

The fresh-chain audit found and fixed three historical migration defects:

- `0003` and `0004` no longer recreate enums already owned by `0000`;
- `0004` and `0005` no longer create the same token-history columns twice;
- additive `0044_auth_v3_schema_repair.sql` supplies Auth v3 columns and keys
  that the existing Drizzle snapshot had assumed but historical SQL omitted.

Local runtime checks against that database passed:

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

The four serial browser scenarios cover:

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

GitHub result: **pending first candidate push**.

## Separation of gates

- npm: no new publication was needed; `najm-kit@2.11.2` was already current.
- Najm GitHub: the existing 2.11.2 release commits were pushed to their release
  branch; unrelated local `najm-storage` work remains untouched.
- School database: disposable only; no production database was mutated.
- School deployment: not performed.
- School GitHub: recorded after the final branch push and green CI.
