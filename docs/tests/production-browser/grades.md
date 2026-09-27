# Grades

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/grades`. Original coverage: E06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned assessment and student roster. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **grades-R01**: Choose assessment and roster; existing marks and maximum score match.
- [ ] **grades-R02**: Switch selection; previous roster/drafts must not remain attached to the new assessment.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **grades-M01**: Enter a grade, blur/confirm once and reload; one saved result appears.
- [ ] **grades-M02**: Edit an existing mark; percentage is correct and out-of-range input is refused without corrupting the saved grade.
- [ ] **grades-M03**: Use keyboard and phone controls; save is not duplicated by blur plus submit.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
