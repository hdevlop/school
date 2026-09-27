# Users: reset access

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/users` row/card action. Original coverage: A-R.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned parent, student, teacher and staff accounts; two test administrators; controlled mail. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **access-reset-R01**: Reach the same Reset access action from row, card and keyboard; confirmation explains the server-selected mode.
- [ ] **access-reset-R02**: Cancel confirmation; no request, mail or credential change occurs.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **access-reset-M01**: Confirm once; observe exactly one POST to `/api/admin/access/users/:userId/reset-access`.
- [ ] **access-reset-M02**: For an owned active parent with valid CIN, verify forced replacement, immediate prior-session revocation and CIN replay denial; keep CIN out of evidence.
- [ ] **access-reset-M03**: For owned student/teacher/staff accounts, verify one reset message; previous sessions remain valid until password replacement.
- [ ] **access-reset-M04**: Resend an owned pending invitation; no duplicate user/profile. Try stale confirmation and two-admin cooldown; expect conflict/refusal without duplicate effects.
- [ ] **access-reset-M05**: Check refused self/admin/inactive/profileless/unsupported targets using prepared fixtures; no effect or mail. Report transport simulation separately from real delivery.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).

The [retained full auth contract](reference/auth-contract.md) owns all ten exact Gate A-R test titles, negative cases, diagnostics and teardown requirements. This production checklist is a remote subset; it cannot mark that gate complete by itself.
