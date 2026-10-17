# Payroll

Status: **PASS** (3/3) on `ff7d571`, 2026-10-17. Evidence: [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md).

Entry point: `/payroll`. Original coverage: G09.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff and isolated payroll period; no real payout. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **payroll-R01**: Load/filter payroll; staff identity, period and calculation components agree. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **payroll-M01**: Create/edit only an owned payroll record if supported; check calculated total and protected transitions. Result: **PASS** — pay, repeat refused, undo asks first, payslip back to pending.
- [x] **payroll-M02**: A denied role cannot change payroll. No real payout or irreversible posting is authorized by this checklist. Result: **PASS** — teacher-A refused (403) and stays signed in.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
