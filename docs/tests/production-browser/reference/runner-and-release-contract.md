> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

## 8. Spec and runner organization

Keep the fast UI-contract suite and connected suites visibly separate:

```text
apps/dashboard/tests/e2e/
  *.acceptance.spec.ts                 # UI contracts; mocks allowed and declared
  connected/
    auth-lifecycle.connected.spec.ts   # Gate A only
    platform.connected.spec.ts         # B
    academic.connected.spec.ts         # C
    people.connected.spec.ts           # D
    teaching.connected.spec.ts         # E
    conduct.connected.spec.ts          # F
    financial.connected.spec.ts        # G
    transport.connected.spec.ts        # H
    operational.connected.spec.ts      # I
    responsive.connected.spec.ts       # J
    diagnostics.ts
    fixtures.ts
    preflight.ts
    globalSetup.ts
    globalTeardown.ts
  remote/
    auth-lifecycle.remote.spec.ts
    feature-smoke.remote.spec.ts
    diagnostics.ts
    preflight.ts
```

Runner wrappers live at:

```text
apps/dashboard/scripts/run-connected-e2e.mjs
apps/dashboard/scripts/run-remote-e2e.mjs
```

Planned configs and commands:

```text
playwright.acceptance.config.ts        # existing UI-contract suite
playwright.connected.config.ts         # real local production/database suite
playwright.remote.config.ts            # guarded black-box suite
test:e2e:acceptance
test:e2e:connected
test:e2e:auth:connected
test:e2e:remote
test:e2e:auth:remote
```

The connected and remote runners must fail if their test match also selects an
`.acceptance.spec.ts` mock-based spec. Discovery-only listing must record the
exact selected count before the first real attempt.

These commands are contracts, not current pass evidence. No command may be
reported as runnable until its config, package script, preflight and source
contract exist and discovery proves the intended selection.

### 8.1 Connected runner provenance

The connected wrapper, not Playwright's permissive `webServer` reuse, owns the
production lifecycle:

1. Compute a candidate fingerprint from the full Git SHA, the current tracked
   diff and `bun.lock`; record only the SHA and a non-reversible diff hash.
2. Fail if the focused prerequisite has no pass for that fingerprint.
3. Confirm the disposable database and capture-email contract before building.
4. Confirm port `3210` is free; never attach to an existing listener.
5. Run `bun run build:all` after the fingerprint is computed.
6. Recheck the fingerprint after the build and abort if source changed.
7. Start exactly one fresh `next start` process on `127.0.0.1:3210`, verify its
   command line and health, and keep it for the selected serial range.
8. In `finally`, close browser contexts, run exact namespaced teardown, stop
   only the owned process tree and confirm the port is free.

`playwright.connected.config.ts` must use one worker, `retries: 0` in every
environment, `forbidOnly: true`, a connected-only `testMatch`, and no
`reuseExistingServer`. The wrapper preserves Playwright's native exit code and
sets an outer timeout longer than the selected test timeout.

### 8.2 Remote runner provenance

The remote wrapper accepts only the exact origin `https://myscolai.com`, verifies
TLS and the full serving revision before discovery, uses a remote-only
`testMatch`, one worker and zero retries, and never starts a local server. It
disables screenshot, trace and video capture, preserves the native exit code and
runs supported namespaced cleanup in `finally`. Remote preflight is readiness
evidence only, never a passed browser unit.

## 11. Deployment and publication boundary

### Test-only change — no deployment

A change is test-only only when every changed file is limited to:

```text
apps/dashboard/tests/**
apps/dashboard/playwright*.config.ts
apps/dashboard/scripts/run-connected-e2e.mjs
apps/dashboard/scripts/run-remote-e2e.mjs
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
docs/evidence/**
docs/*.md
docs/**/*.md
SCHOOL-CONNECTED-ACCEPTANCE-PLAN.md
```

It must not change application source, server/seed source, migrations,
Dockerfile, Compose, package manifests, lockfile, runtime environment or GitHub
deployment behavior.

For a test-only change:

- run source-contract tests, test discovery, affected lint/typecheck and the
  required local browser range;
- audit the diff and secrets;
- commit and push the test/evidence slice when authorized;
- run the tester attempt against the already healthy exact deployed revision;
- **do not build/publish an application image and do not trigger Dokploy**.

Before the first test-only push to `main`, merge and exercise the GitHub
runtime-path classifier so verification still runs but image publication and
Dokploy deployment are conditional on a runtime-relevant path change. The
classifier must fail closed: any path outside the allowlist above is runtime
relevant. A documentation/test-only commit must leave the serving revision
unchanged. Workflow/package changes themselves are not test-only and use the
runtime deployment path once.

### Runtime change — deployment required before remote proof

Application, server, seed/grant, dependency, lockfile, runtime configuration,
migration, Docker or Compose changes require:

1. local focused and root gates;
2. audited commit and push;
3. successful GitHub verification and image publication;
4. Dokploy deployment;
5. exact full serving revision and Docker health confirmation;
6. one fresh tester authorization for the smallest remote range.

A successful GitHub build, image publication or webhook response does not prove
the VPS is serving that revision.

## 12. Verification commands

Fast source and UI-contract layer:

```powershell
bun run test:dashboard
bun run test:server
bun run test:seed
bun run test:e2e:acceptance
```

Connected promotion commands after their runners exist and pass discovery:

```powershell
bun run test:e2e:auth:connected
bun run test:e2e:connected
```

Final local gate:

```powershell
bun run lint
bun run test:dashboard
bun run test:server
bun run test:seed
bun run build:all
bun run db:check
bun run db:generate
git diff --check
```

`db:generate` must create no migration for browser/test/plan-only work. If it
does, stop and investigate schema drift.

Remote commands are forbidden until the guarded runner exists, its source
contracts pass and discovery reports the exact intended count. Remote retries
remain zero.

Current implementation state:

- the Auth 4 consumer migration, nonce CSP, bounded report sink and dependency
  audit are implemented in the current local worktree;
- local source gates passed on 2026-09-06: lint (zero errors), dashboard tests
  (78), server tests (1,164), seed tests (9), `build:all`, `db:check`,
  `db:generate` with no migration, `git diff --check`, and
  `bun audit --production` with no vulnerabilities;
- a production-server loopback probe returned an enforced nonce policy, unique
  nonces across requests and a 204 report-sink response;
- connected auth remains `NOT RUN`: the configured local database is not
  test-named and the legacy suite writes and deletes fixtures. This source
  checkpoint therefore does not promote Gate A;
- legacy `test:e2e:najm-upgrade` and `test:e2e:acceptance` commands are not Gate
  A or connected acceptance under this plan;
- the new connected and remote configs, wrappers and commands are `NOT
  IMPLEMENTED` until their files and package scripts exist;
- the workflow classifier is not operational in production until its own
  runtime-change commit passes verification, publication, Dokploy deployment and
  exact revision confirmation once.
