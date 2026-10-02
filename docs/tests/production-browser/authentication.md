# Authentication and sessions

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/login`, `/forgot-password`, `/reset-password`, `/change-password`. Original coverage: A.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated accounts for each role and a controlled recovery mailbox. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **authentication-R01**: Open a protected URL signed out; expect login and a safe return path. Try an unsafe return target; it must not redirect outside the supported app routes.
- [ ] **authentication-R02**: Sign in as an admin, load a protected page, reload, log out through the UI, then revisit the protected URL; access must be refused.
- [ ] **authentication-R03**: Compare Remember Me enabled and disabled using fresh browser contexts; inspect cookie attributes without copying values.
- [ ] **authentication-R04**: Repeat allowed/denied navigation for all twelve roles from the committed grants; isolated contexts must not share sessions.
- [ ] **authentication-R05**: With two tabs in the same session, log out in one; the other must lose protected access. Observe an overlapping protected request; no late response may restore the session.
- [ ] **authentication-R06**: As principal, accounting, teacher, parent and student, type a denied page URL (for example `/users`, `/payroll` or `/fees`) and repeat through client navigation. Expect the server to redirect before the restricted screen appears; hiding its sidebar link alone does not pass. Verify an allowed shared page still opens, and its records remain limited by API ownership.
- [ ] **authentication-R07**: Open `/` as a parent or student; expect `/students` and the existing family view. Open `/` as a driver or an account outside the staff dashboard group; expect `/notifications` without school charts or a redirect loop.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **authentication-M01**: Use only owned accounts for wrong-password, inactive and revoked-session cases; record actual status codes without provoking a live user's lockout.
- [ ] **authentication-M02**: Complete an owned temporary-credential setup; protected pages remain inaccessible until replacement and fresh login. Old credentials, cancellation and replay must fail.
- [ ] **authentication-M03**: Send recovery/invite mail only to the controlled recipient; test weak/mismatched replacements, single use and old-password refusal. Record delivery separately from simulated transport.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).

The [retained full auth contract](reference/auth-contract.md) owns all ten exact Gate A test titles, negative cases, diagnostics and teardown requirements. This production checklist is a remote subset; it cannot mark that gate complete by itself.
