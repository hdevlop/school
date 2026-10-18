# Teachers

Status: **PASS** (4/4) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md).

Entry point: `/teachers`. Original coverage: D05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher/staff chain, test classes and subjects. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **teachers-R01**: Search/filter teachers; subject/class assignments match detail views. Result: **PASS** — filters, the no-match state (najm-kit 3.6.3), keyboard card navigation and French/Arabic phone details; assignments match the detail view.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **teachers-M01**: Create/edit one teacher; save/reload and verify linked staff identity. Result: **PASS** — empty step and negative salary refused; the unsaved step-2 draft survives Previous (najm-kit 3.6.3); one teacher with its linked staff identity and salary; the identity edit keeps section/subject pairs.
- [x] **teachers-M02**: Use assignment controls, including bulk assignment if exposed, on owned classes/subjects; verify each relationship once. Result: **PASS** — bulk section assignment stores each pair once and matches the detail view after reload.
- [x] **teachers-M03**: Remove owned assignments before deletion; validation and reference conflicts remain actionable. Result: **PASS** — deleting with live assignments gets a translated 409; assignments removed with the form controls, then the teacher; duplicate CIN and a teacher account refused.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
