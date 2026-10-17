# Authentication and sessions

Status: **PARTIAL** (1/11 PASS; the rest NOT RUN) on `440c060`, 2026-10-17. Evidence: [PB1018](../../evidence/production-browser/2026-10-17-pb1018/README.md).

Entry point: `/login`, `/forgot-password`, `/reset-password`, `/change-password`. Original coverage: A.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated accounts for each role and a controlled recovery mailbox. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

### Current role inventory

Resolve roles and effective grants from the serving release's
[role catalog](../../../packages/seed/src/scripts/admin/data/roles.json) and
[role permissions](../../../packages/seed/src/scripts/admin/data/rolePermissions.json).
The 2026-10-15 source catalog contains ten roles: admin, principal, accounting,
teacher, student, parent, secretary, driver, assistant and supervisor. Include
supervisor in allowed/denied page and record-ownership checks. Counselor, nurse
and librarian belong to the historical catalog in the preserved reference;
they are not current seeded-role prerequisites. Record any actual serving-role
differences before choosing fixtures. The full Gate A lifecycle obligations
remain applicable with this release-specific inventory.

## Browser checks

- [ ] **authentication-R01**: Open a protected URL signed out; expect login and a safe return path. Try an unsafe return target; it must not redirect outside the supported app routes.
- [ ] **authentication-R02**: Sign in as an admin, load a protected page, reload, log out through the UI, then revisit the protected URL; access must be refused.
- [ ] **authentication-R03**: Compare Remember Me enabled and disabled using fresh browser contexts; inspect cookie attributes without copying values.
- [ ] **authentication-R04**: Repeat allowed/denied navigation and protected reads for every role in the serving release's catalog and grants, including supervisor in the current inventory; isolated contexts must not share sessions. Record each role separately and leave missing accounts BLOCKED.
- [ ] **authentication-R05**: With two tabs in the same session, log out in one; the other must lose protected access. Observe an overlapping protected request; no late response may restore the session.
- [ ] **authentication-R06**: As principal, accounting, teacher, parent and student, type a denied page URL (for example `/users`, `/payroll` or `/fees`) and repeat through client navigation. Expect the server to redirect before the restricted screen appears; hiding its sidebar link alone does not pass. Verify an allowed shared page still opens, and its records remain limited by API ownership.
- [ ] **authentication-R07**: At 1440x900, open `/home` as a parent/student with `read:students`; expect `/students` and the family view. Without that grant, expect `/notifications`. As a driver or another role outside the dashboard group, expect `/notifications`; a dashboard-eligible role such as supervisor stays on `/home` with permitted panels only. Repeat at 390x844: these accounts stay on `/home` and render MobileHome with grant-controlled links and unavailable actions disabled. Check reload, resize across the 1024px breakpoint and direct navigation for protected-data leaks or redirect loops. Use the serving release's page-access rules for expected grants.
- [ ] **authentication-R08**: Open `/` signed out and signed in: the published landing remains public, with no dashboard shell. Its Portal button leads to `/login` signed out and `/home` signed in. `/welcome` redirects to `/`; the login Website link also opens `/`. Signed-in `/login` redirects to `/home`. A successful login without a safe protected `from` enters `/home`; a safe app deep link retains its path/query. External, auth/setup, asset and public-landing return paths cannot redirect away from the authenticated app. Signed-out `/home` and `/dashboard` still require login. An unpublished landing retains its deliberate 404 and sitemap exclusion.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **authentication-M01**: Use only owned accounts for wrong-password, inactive and revoked-session cases; record actual status codes without provoking a live user's lockout.
- [ ] **authentication-M02**: Complete an owned temporary-credential setup; protected pages remain inaccessible until replacement and fresh login. Old credentials, cancellation and replay must fail.
- [x] **authentication-M03**: Send recovery/invite mail only to the controlled recipient; test weak/mismatched replacements, single use and old-password refusal. Record delivery separately from simulated transport. Result: **PASS** — recovery mail (AUTH-07) to the controlled mailbox in French, weak/mismatched refused, single use, old password refused; invitation mail not run.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).

The [retained full auth contract](reference/auth-contract.md) owns all ten exact Gate A test titles, negative cases, diagnostics and teardown requirements. This production checklist is a remote subset; it cannot mark that gate complete by itself.
