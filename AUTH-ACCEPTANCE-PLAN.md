# School Auth Acceptance Plan

Status: **IN PROGRESS** — exact `najm-auth@3.1.1` alignment and source/build
regression gates pass; disposable PostgreSQL and browser acceptance remain open.

Last updated: 2026-08-11

Primary executor: **MinMax Coder**

This is a focused companion to root `NAJM-UPGRADE-PLAN.md`. It covers only the
database and browser acceptance work for School's auth implementation, which
was originally written against 3.1.0 and now resolves the verified published
`najm-auth@3.1.1`. This plan does not replace the upgrade plan, reopen the
implemented auth architecture, or authorize a commit, push, deployment, or
production database change.

## Latest published auth target

The npm registry was rechecked on 2026-08-11:

| package | target |
|---|---:|
| `najm-auth` | `3.1.1` |
| `najm-core` | `2.0.5` |
| `najm-database` | `2.0.3` |
| `najm-i18n` | `2.0.3` |
| `najm-cache` | `2.0.2` |
| `najm-cookies` | `2.0.2` |
| `najm-email` | `2.0.2` |
| `najm-guard` | `2.0.2` |
| `najm-rate` | `2.0.2` |
| `najm-validation` | `2.0.2` |

`najm-auth@3.1.1` preserves the 3.1.0 runtime used by the current School code
and adds the canonical Next.js App Router boundary documentation and CLI
scaffolding. Recheck the registry and packed exports before execution; if a
newer release exists, update this table first rather than floating through a
range.

## 1. Verified starting point

The current School worktree already contains the intended source logic:

- one resolved `najm-auth@3.1.1` installation across root, dashboard, server,
  and seed;
- login sends `identifier`, `password`, and `rememberMe` to Najm Auth and
  distinguishes `authenticated` from `credential_setup`;
- `/change-password` is public and checks the setup session through
  `GET /api/auth/credential-setup/setup`;
- password replacement and cancellation use Najm's standard endpoints;
- the catch-all POST handler uses `withAuthCookiePersistence` with
  `rememberCookieName: "sms.remember"`;
- migration `packages/server/src/database/migrations/0041_oval_venus.sql`
  additively creates `credential_setup_requirements` and
  `credential_setup_sessions`;
- the shared React Server Component session adapter is present at
  `apps/dashboard/src/lib/session.ts`;
- `bun run test:dashboard` passes 29 tests; lint has zero errors and three
  pre-existing image warnings; server/seed builds and the production dashboard
  build pass with throwaway build-only secrets supplied in-process.

This evidence is source-level only. It does not prove that migration `0041` has
been applied to the intended database or that browser cookie/session behavior
works end to end.

## 2. Non-negotiable boundaries

- Read root `AGENTS.md` and `NAJM-UPGRADE-PLAN.md` before starting.
- Preserve every unrelated dirty-worktree change. Do not reset, delete, stage,
  or rewrite Behavior Rewards, Discipline, or other user work.
- Use Bun and the repository scripts. Do not use npm, yarn, or pnpm.
- Inspect installed `najm-auth@3.1.1` declarations after alignment before
  changing or accepting a contract.
- Do not copy Kafil domain rules, roles, routes, CIN behavior, or family
  provisioning into School.
- Do not alter Student, Parent, Teacher, or Staff provisioning to require a
  temporary credential. The setup-required identity used here must be an
  isolated test fixture.
- Never inspect a project-specific setup cookie in `/change-password`. Najm
  owns the setup-cookie name and lifecycle. School must validate it only
  through the standard setup-status endpoint.
- Never print or commit passwords, cookies, tokens, connection strings, or
  complete test identities. Evidence must use masked identifiers.
- Do not run `db:migrate`, seed/reset commands, or other mutating database
  operations until the target has been positively identified as disposable
  and the user has authorized that target.
- Keep database migration, local acceptance, commit/push, deployment, and
  production acceptance as separate gates.

## 3. Phase 0 - audit and freeze the candidate scope

- [ ] Record the branch, `HEAD`, `git status --short`, and the intended auth
  files without modifying them.
- [ ] Verify `najm-auth@3.1.1` registry metadata, changelog, integrity, packed
  exports, and required peer/dependency versions.
- [x] Update root, dashboard, server, and seed manifests plus root overrides to
  the exact auth target matrix above; do not change unrelated packages.
- [x] Run one root `bun install`, audit `bun.lock`, and confirm
  `bun pm ls --all` resolves exactly one `najm-auth@3.1.1` with no stale nested
  auth copy.
- [x] Inspect the installed login result, credential-setup endpoints, setup
  cookie behavior, React server adapter, and cookie-persistence declarations.
- [ ] Confirm the auth slice includes only the intended manifest/lockfile,
  schema/migration, login/setup UI, route handler, session adapter, and focused
  tests. List unrelated dirty files separately.
- [ ] Run `git diff --check` and scan the candidate diff for secrets, tokens,
  cookies, database dumps, certificates, and generated build artifacts.

Phase 0 gate:

- [ ] The exact auth candidate and unrelated worktree changes are separately
  documented.
- [ ] Every auth-related consumer resolves the exact published 3.1.1 contract.
- [ ] No dependency duplication or secret exposure remains unexplained.

## 4. Phase 1 - add focused regression contracts

Add focused dashboard tests before browser automation. Keep them behavioral
where possible; use source-contract assertions only for architectural
boundaries that cannot be imported safely in Bun.

- [ ] Prove login forwards `identifier`, `password`, and `rememberMe` unchanged.
- [ ] Prove `authenticated` navigates only to a safe same-origin product route.
- [ ] Prove `credential_setup` navigates only to `/change-password` and does
  not hydrate an authenticated session.
- [ ] Prove `/change-password` calls the standard setup status, change, and
  cancel endpoints.
- [ ] Add the Kafil-loop regression: the page must contain no `cookies()` read,
  no `cookieStore.has(...)`, and no School/Kafil-specific setup-cookie name.
- [ ] Prove `/change-password` stays in `publicRoutes` while the dashboard tree
  still requires a normal session.
- [ ] Prove only the catch-all POST handler is wrapped with
  `withAuthCookiePersistence` and it retains `sms.remember`.
- [ ] Preserve the existing session-adapter tests proving one module-scope
  `createReactServerAuth(auth)` instance and no swallowed operational errors.

Phase 1 gate:

```bash
bun run test:dashboard
bun run lint
```

- [ ] All focused auth/dashboard tests pass with zero failures.
- [ ] The regression test would fail if an app-specific setup-cookie guard were
  reintroduced.

## 5. Phase 2 - prepare and migrate a disposable PostgreSQL target

- [ ] Obtain or create an isolated PostgreSQL database used only for this
  acceptance run. Record a non-secret database label and masked host.
- [ ] Supply required environment values through the existing untracked local
  environment mechanism. Do not create a committed secret file.
- [ ] Positively prove the target is not production or a shared developer
  database before any migration or fixture write.
- [ ] Run `bun run db:check` before migration and inspect the Drizzle journal.
- [ ] Review `0041_oval_venus.sql`: it may create only the two credential-setup
  tables, their foreign keys, uniqueness constraint, and indexes. It must not
  alter or drop existing auth/application tables.
- [ ] After explicit authorization for the verified disposable target, run
  `bun run db:migrate`.
- [ ] Verify both tables, primary/foreign keys, the unique token hash, and the
  user/purpose and expiry indexes directly against PostgreSQL.
- [ ] Run the migration command again to prove it is idempotent.
- [ ] Run `bun run db:check` and `bun run db:generate`; generation must report
  no schema drift and create no new migration.

Phase 2 gate:

- [ ] Migration `0041` is applied only to the recorded disposable database.
- [ ] Existing auth/application tables and data remain intact.
- [ ] Drizzle reports no unexplained drift after migration.

## 6. Phase 3 - create isolated authentication fixtures

Create fixtures through a test-only setup helper using the installed Najm
contract. Do not add a public product route or change School's normal
provisioning policy.

- [ ] Create one unique setup-required test user with
  `temporaryCredential + requireCredentialSetup: "password"` through Najm's
  provisioning service.
- [ ] Create or reuse isolated normal-login fixtures for admin and one
  non-admin School role needed by the auth smoke tests.
- [ ] Keep fixture emails, credentials, run label, and IDs outside committed
  source and evidence.
- [ ] Record fixture IDs in an ephemeral cleanup ledger.
- [ ] Provide deterministic teardown that removes only records created by the
  unique run label. Teardown must not truncate shared tables.

Phase 3 gate:

- [ ] The setup-required fixture has one active password requirement and no
  normal authenticated session.
- [ ] Normal fixtures remain normal and School production provisioning code is
  unchanged.
- [ ] Cleanup scope is exact, reviewable, and safe to rerun.

## 7. Phase 4 - add a production-style Playwright auth suite

School currently has Playwright installed but no committed auth runner. Add a
bounded runner and script such as `test:e2e:auth` that:

- builds the dashboard production bundle;
- starts it under Bun on an explicit `127.0.0.1` test port;
- uses the disposable database and isolated browser contexts;
- waits for readiness and always stops its child process;
- emits no credentials, cookies, or tokens;
- does not reuse a developer's browser profile.

Automate these journeys:

### Normal login and session behavior

- [ ] Existing admin login reaches the intended School dashboard.
- [ ] One non-admin School user can log in and reach permitted navigation.
- [ ] Wrong password, inactive user, locked user, and revoked session fail
  without leaking account state.
- [ ] A stale or unsafe `from` value cannot redirect into `/api`, `/_next`, a
  static asset, `/login`, or `/change-password`.

### Credential setup

- [ ] Setup-required login returns the setup outcome and no normal access,
  refresh, or signed-session cookie.
- [ ] Navigation remains on `/change-password`; it must not flash and return to
  `/login` while the valid Najm setup session exists.
- [ ] Direct anonymous `/change-password` access checks status and returns to
  login safely.
- [ ] Invalid, weak, current/temporary-equivalent, and mismatched replacement
  passwords are rejected.
- [ ] A valid replacement completes the requirement, consumes the setup
  session once, clears the setup cookie, and requires a fresh login.
- [ ] The replacement password permits normal login; the temporary credential
  no longer does.
- [ ] Cancellation clears/revokes setup and returns to login.
- [ ] Expired, cancelled, consumed, and replayed setup sessions are denied.
- [ ] A setup-only browser cannot open the protected dashboard or protected API
  resources.

### Remember Me and recovery

- [ ] With Remember Me off, login/refresh cookies use the session-lifetime
  behavior defined by Najm and `sms.remember=0` is honored.
- [ ] With Remember Me on, the configured persistent lifetime survives a
  production-style browser restart.
- [ ] Refresh and signed-session recovery preserve the selected lifetime.
- [ ] Logout clears access, refresh, signed-session, and remember-preference
  state for both choices.
- [ ] Separate browser contexts never share authentication state.

Phase 4 gate:

- [ ] The new Playwright auth suite passes twice consecutively from a clean
  fixture state.
- [ ] The run captures masked request/status/redirect evidence without storing
  cookie or token values.
- [ ] No first-login flash/redirect loop exists.

## 8. Phase 5 - full local verification

At one recorded candidate commit or worktree SHA, run and record:

```bash
bun run lint
bun run test:dashboard
bun run test:server
bun run test:seed
bun run build:all
bun run db:check
bun run db:generate
bun run test:e2e:auth
git diff --check
```

Acceptance rules:

- [ ] Dashboard, focused auth, seed, build, database, and browser gates pass.
- [ ] `db:generate` creates nothing.
- [ ] No new server test failure is introduced. Record the known unrelated
  Student/Parent constructor-drift baseline separately rather than attributing
  it to auth.
- [ ] Audit every modified, deleted, and untracked file. Keep unrelated work
  outside the auth candidate.
- [ ] Record exact commands, pass/fail/skip counts, duration, candidate SHA,
  database label, and test port.

## 9. Phase 6 - optional release and deployment gates

Do not execute this phase without explicit authorization after Phases 0-5 are
accepted.

- [ ] Commit only the audited School auth slice and its tests/evidence.
- [ ] Fetch and reconcile upstream changes non-destructively.
- [ ] Push only after the user approves the exact commit and destination.
- [ ] Treat GitHub status as separate from deployment status.
- [ ] Back up and positively identify the production database before applying
  migration `0041` there.
- [ ] Apply the database migration as its own recorded gate.
- [ ] Deploy the matching application commit as a separate gate.
- [ ] Run masked production smoke checks for normal login, setup-required
  login, password replacement, Remember Me, refresh/recovery, and logout.
- [ ] Define the application rollback and additive-database rollback posture
  separately. Do not drop the two additive v3 tables during an emergency app
  rollback.

## 10. Completion definition

This plan is complete only when:

- root, dashboard, server, and seed resolve one exact `najm-auth@3.1.1` with
  the dependency versions in the published auth target table;
- migration `0041` is proven on the intended disposable database with no drift;
- normal and setup-required login paths pass in production-style Playwright;
- Remember Me, refresh/recovery, expiry, cancellation, consumption, replay
  denial, and logout are proven in isolated browser contexts;
- `/change-password` relies only on Najm's standard setup-status contract and
  cannot regress to an app-specific cookie guard;
- all focused and required local gates are recorded at one candidate SHA;
- secrets and unrelated dirty-worktree changes are absent from the auth
  candidate;
- database, local acceptance, GitHub, deployment, and production acceptance
  are each reported as independent pass/fail outcomes.
