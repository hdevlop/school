# Installments

Status: **PARTIAL** (2 PASS, 1 partly NOT RUN) on `ff7d571`, 2026-10-17. Evidence: [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md).

Entry point: Student fee detail and fee schedule preview. Original coverage: G05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned fee with known total and agreed schedule. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **installments-R01**: Inspect preview and saved schedule; due dates, paid/due states and sum match the fee net amount. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **installments-M01**: Create/update the schedule through exposed controls; reload and verify no duplicated installment. Result: **PASS** — schedule change reloaded without duplicates.
- [ ] **installments-M02**: For the configured school calendar, check September-June billing and July 1-14 closeout fixtures; July 15, August and September boundaries need controlled-clock local evidence, never production clock changes. Result: **PARTIAL** — September–June billing bounds pass; July 1–14 closeout and later boundaries need a controlled clock (NOT RUN on production by design).

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
