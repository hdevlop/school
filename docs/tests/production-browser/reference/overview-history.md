> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

# School connected acceptance plan

Status: **SOURCE REMEDIATION PASSED — CONNECTED AUTH MUST PASS BEFORE FEATURE PROMOTION**

Local application: production-style Next.js on a runner-owned loopback port.

Guarded remote target: exactly `https://myscolai.com`.

This is the sole authoritative execution plan for complete School browser
acceptance. The deleted legacy auth and Najm-upgrade plans are not evidence
sources; all new auth and feature status belongs here.

## 1. Goal and evidence boundary

Prove every School product feature through the smallest honest evidence layer,
starting with authentication and promoting only after the current layer passes.

The plan separates four kinds of evidence:

1. Source/unit contracts for helpers, DTOs, guards, services and view models.
2. UI-contract Playwright tests for rendering and interaction, including the
   existing `.acceptance.spec.ts` tests that intentionally mock API reads.
3. Local connected Playwright tests against the real production build, real
   PostgreSQL, real School API and isolated browser contexts.
4. Guarded remote black-box tests against the exact healthy deployed revision.

An existing mocked acceptance pass is not connected evidence. A browser pass
does not replace server, database, build, schema or authorization gates.

Not verified by a remote black-box run without database access:

- transaction locking and rollback;
- database constraints and physical uniqueness;
- migration state or schema drift;
- password hashes, token hashes or encrypted values;
- financial audit rows not exposed through supported APIs;
- seed idempotency.

Those contracts require server or real-database tests.

## 2. Current baseline

- School pins the published `najm-auth@4.0.2` and `najm-cache@2.2.0`
  remediation releases and uses `auth.proxy`, authoritative proxy sessions and
  `auth.routeHandlers`. The root override keeps one installed Auth/Cache copy
  across the workspace.
- The app forwards one fresh nonce through `auth.proxy` on each rendered
  request, enforces the same CSP on the response, initializes Zod in jitless
  mode before hydration, and accepts only bounded, sanitized CSP reports.
- The dedicated production-style Najm upgrade suite currently passes all four
  tests locally, including login/logout, Remember Me, credential setup and the
  role/locale/viewport matrix.
- Existing browser acceptance specs cover academic lists, students, profiles,
  people, attendance, grading, finance, conduct, announcements, navigation,
  settings, access control, appearance and transport.
- Existing acceptance helpers use `page.route()` for many reads and writes.
  Those tests remain valuable UI contracts but cannot accept real persistence,
  authorization or integration behavior.
- Production revision verification exists. The runtime-change discriminator in
  the deployment workflow must be merged and exercised once before a later
  test-only commit may rely on skipped image publication and Dokploy deployment.

No item in this baseline marks auth or any feature group complete under this
plan. Each item must pass its stated gate on the same candidate revision.
