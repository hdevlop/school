# Students

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/students`. Original coverage: D01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Existing class/section, owned parent and optional fee type; controlled email. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **students-R01**: Search/filter by name/class/section; rows and phone cards identify the same student.
- [ ] **students-R02**: Open the full multi-step form; moving between steps preserves input and shows validation.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **students-M01**: Create an owned student through all three steps with nested parent/fee data where authorized; reload and verify each relationship once.
- [ ] **students-M02**: Edit class/section and permitted identity fields; upload a nonsensitive test avatar if included in scope.
- [ ] **students-M03**: Cancel deletion, then remove only an owned student after its dependent records are cleaned; invalid/duplicate input must not create partial records.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
