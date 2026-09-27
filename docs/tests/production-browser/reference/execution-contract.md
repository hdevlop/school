> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

## 3. One coder, one tester

Every acceptance slice has exactly two named roles and one active owner at a
time.

### Coder

The coder may inspect and edit source, tests, runners and plans. The coder:

- reproduces a defect at the smallest source or focused-browser level;
- adds a red regression before the fix when practical;
- fixes the narrowest owning layer;
- runs focused tests, affected static checks and the required local gate;
- audits the diff and hands a fixed candidate SHA/worktree state to the tester;
- never declares their own implementation accepted from coder evidence alone.

### Tester

The tester receives an immutable candidate and a precise command. The tester:

- performs read-only preflight;
- verifies exact selected-test count, one worker and zero retries;
- runs exactly one authorized focused, group or remote attempt;
- records the native exit code and sanitized evidence;
- classifies failures as `TEST`, `PRODUCT`, `RUNNER` or `ENVIRONMENT`;
- stops after failure without editing, retrying, deploying or making manual or
  out-of-band state changes; namespaced mutations performed by the authorized
  test command remain part of the attempt;
- returns control to the coder.

The tester never fixes code during the same handoff. The coder never silently
reruns a failed tester attempt. A new tester attempt requires a changed owning
implementation or diagnostic hypothesis and a fresh handoff.

One person or agent may not act as both roles for the same acceptance attempt.
Do not run two coders or two testers concurrently against the same fixtures.

## 4. Safety and fixture contract

### Local connected tests

- Use a positively identified disposable PostgreSQL database.
- Fail closed if the target could be production or a shared developer database.
- Namespace every user and domain record with one run label.
- Create fixtures through supported APIs or test-owned seed helpers.
- Direct SQL is allowed only for local fixture setup, database assertions and
  exact teardown; it is never browser evidence.
- Keep one worker and zero Playwright retries.
- The runner owns the Next.js process, port, browser contexts and cleanup.

The local runner must fail during read-only preflight unless all of these are
true:

- `SCHOOL_E2E_ALLOW_DISPOSABLE_DB=1` is explicitly set;
- the parsed PostgreSQL host is loopback and the database name starts with
  `school_acceptance_`;
- PostgreSQL accepts a connection and the required migration state is present;
- live email delivery is disabled and password recovery uses a runner-owned
  loopback capture service or test adapter whose messages are never committed;
- `127.0.0.1:3210` is free before startup;
- no production, shared-development or externally hosted database is selected;
- required secrets are present without printing their values.

If School's console email provider cannot expose a reset link safely, auth unit
06 remains blocked until the coder adds a narrow test-only capture transport.
The test may inspect only the captured message for its own namespaced recipient
and must redact the token and address from every artifact.

### Guarded remote tests

- Target exactly `https://myscolai.com` with verified TLS.
- Confirm the intended full Git SHA is the sole healthy School app revision.
- Use no PostgreSQL, SQL, migrations, seeds, resets, Docker mutation or Dokploy
  mutation during the tester attempt.
- Create and remove disposable data only through deployed UI or supported APIs.
- Keep credentials, cookies, tokens, identities and sensitive bodies in memory.
- Disable screenshots, traces and video unless a separately approved redaction
  policy exists.
- Use isolated browser contexts for different roles.
- Never use `page.route()`, mocks, `clearCookies()`, forced clicks or arbitrary
  state mutation.

Remote fixture cleanup must be idempotent, scoped to the exact run namespace and
completed through supported product surfaces. Database-only cleanup is
forbidden in remote acceptance.

## 5. Promotion ladder

Every feature follows this order:

1. Focused source/unit test.
2. Existing or new UI-contract browser test.
3. Focused local connected work unit with passive diagnostics.
4. Smallest dependent feature range.
5. Complete feature-group connected spec.
6. Full local connected suite.
7. Guarded remote feature smoke when runtime behavior changed.
8. Final repository and schema gate.

Do not skip auth. No feature test may promote beyond UI-contract evidence until
the complete auth gate in section 6 passes on the same candidate.

After a connected or remote failure, the same range may not run again until the
focused failing unit passes after a real code, test or diagnostic change.
Retries, longer sleeps and larger timeouts are not fixes.

## 9. Deterministic browser and diagnostic rules

- Attach diagnostics immediately to every new page.
- Capture page errors, console errors, failed requests and every `4xx`/`5xx`.
- Default to deny-all for errors.
- Register an intentional negative response by exact method, pathname and
  status before one action; consume it once and restore deny-all immediately.
- Register response, dialog, download and navigation promises before actions.
- Wait for exact responses and user-visible readiness; never use arbitrary
  sleeps or `networkidle`.
- Prefer roles, labels, form names and semantic row/card boundaries.
- Never repair ambiguity with arbitrary `.first()` or actionability with
  `force: true`.
- Use real browser/API/PostgreSQL behavior in connected suites. No
  `page.route()` or response fulfillment is allowed there.
- Keep different identities in isolated contexts. Reuse an authenticated
  context within one serial dependent range to avoid refresh-token races and
  rate-limit waste.
- Assert persisted effects after every mutation.
- Record a value-free fingerprint containing only unit, pathname, selector,
  method/path, status, failure class and elapsed time.

## 10. Coder/tester execution loop

For each unit:

1. Coder records scope, dependencies and expected selected-test count.
2. Coder adds/runs the smallest red/green regression.
3. Coder passes focused UI-contract and local connected tests.
4. Coder passes affected lint/type/build/database gates.
5. Coder audits the diff and hands off one immutable candidate.
6. Tester verifies preflight and runs exactly one authorized command.
7. Tester reports command, work-unit and plan verdicts separately.
8. On failure, tester stops; coder receives the sanitized fingerprint.
9. On pass, the ledger marks only assertions actually proved.
10. Promotion moves to the smallest dependent range, then the group, then full
    connected acceptance.

No group may be marked complete because an earlier step passed or because a
test was excluded by grep.
