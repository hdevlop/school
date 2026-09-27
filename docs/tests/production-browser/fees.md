# Fees

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/fees`. Original coverage: G02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned students, fee type and known historical/active academic years. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **fees-R01**: Filter by academic year, class, section, status and student; totals and results follow the selected scope.
- [ ] **fees-R02**: Select a historical year, navigate away/back and reload; selection must not change the active school setting.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **fees-M01**: Create owned charges with effective date and discount; reopen and reconcile gross, discount, net and status.
- [ ] **fees-M02**: Use bulk/class fee forms only when every selected student is owned; verify preview and one charge per intended target.
- [ ] **fees-M03**: Edit allowed fields and reload; reject invalid dates/discounts and preserve prior values.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
