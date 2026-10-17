# Aging report

Status: **PASS** (3/3) on `ff7d571`, 2026-10-17. Evidence: [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md).

Entry point: `/aging`. Original coverage: G14.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned fees with known due dates and payments. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **aging-R01**: Open aging report and available filters/drilldowns; buckets use the correct as-of date/year. Result: **PASS**.
- [x] **aging-R02**: Reconcile bucket totals and grand total to owned remaining balances; paid fees are not overdue. Result: **PASS**.
- [x] **aging-R03**: Check empty state, phone layout and unauthorized role refusal. Result: **PASS**.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
