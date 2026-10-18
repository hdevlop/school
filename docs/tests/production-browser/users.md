# Users

Status: **PASS** (4/4) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md).

Entry point: `/users`. Original coverage: B06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned user with no live dependencies and a denied role. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **users-R01**: Search/filter users and open row/card details; role and status agree. Result: **PASS** — search by name and email, the read-only role and status view, French and Arabic phone cards, the translated no-match state (fixed by najm-kit 3.6.3), and 278 accounts paged 100, 100, 78.
- [x] **users-R02**: Open create/edit forms; required fields and duplicate identity feedback are clear. Result: **PASS** — French required-field messages send no invitation; a duplicate email gets 409 with the dialog kept open and one account.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **users-M01**: Create one owned user, edit an allowed field, change status and reload after each action. Result: **PASS** — invite, rename, then inactive, pending and active, each surviving reload with role and email unchanged.
- [x] **users-M02**: Cancel deletion; record remains. Delete only the owned disposable user through the supported action; it disappears after reload. Run access-reset separately. Result: **PASS** — cancel sends nothing; confirmed delete removes the account after reload. A teacher account is refused every users route.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
