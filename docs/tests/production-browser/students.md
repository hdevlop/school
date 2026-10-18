# Students

Status: **PASS** (5/5) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md).

Entry point: `/students`. Original coverage: D01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Existing class/section, owned parent and optional fee type; controlled email. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **students-R01**: Search/filter by name/class/section; rows and phone cards identify the same student. Result: **PASS** — name, code, class and section filters; table and French/Arabic phone cards identify the same student; the class filter is reachable by its accessible name.
- [x] **students-R02**: Open the full multi-step form; moving between steps preserves input and shows validation. Result: **PASS** — an empty first step and a whitespace code are refused in French; student and nested parent values survive Previous.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **students-M01**: Create an owned student through all three steps with nested parent/fee data where authorized; reload and verify each relationship once. Result: **PASS** — three steps with a nested parent and a registration fee create exactly one student, one parent and one 50 MAD fee after reload.
- [x] **students-M02**: Edit permitted identity fields; use the supported enrollment correction/transfer workflow for class/section placement and verify dated history. Upload a nonsensitive test avatar if included in scope. A profile edit must not silently reset yearly placement. Result: **PASS** — the identity edit locks yearly placement and keeps the dated history; the transfer closes the old placement on its date with the actor and keeps the admission date. Avatar upload not included.
- [x] **students-M03**: Cancel deletion, then remove only an owned student after its dependent records are cleaned; invalid/duplicate input must not create partial records. Result: **PASS** — cancel keeps the student; empty/whitespace codes 400 and duplicates 409 leave no partial student or parent; a teacher is refused; fee, student and parent removed in order.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
