# Fees

Status: **PASS** (5/5) on `bfaa158`, 2026-10-18. Evidence: [PB1022-FIN](../../evidence/production-browser/2026-10-18-pb1022-fin/README.md). Earlier partial evidence: [PB1018 fee reads](../../evidence/production-browser/2026-10-17-pb1018/receipts-fees-results.json), [PB1020 fee/schedule lifecycle](../../evidence/production-browser/2026-10-17-pb1020-fin/installments-results.json).

Entry point: `/fees`. Original coverage: G02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned students, fee type and known historical/active academic years. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **fees-R01**: Filter by academic year, class, section, status and student; totals and results follow the selected scope. Result: **PASS** — header count and all six stat cards equal the read (107 students), then for class CM2, section PB1021, code and name search, each status and the monthly schedule; the class filter has an accessible name. Year scope: see fees-R02.
- [x] **fees-R02**: Select a historical year, navigate away/back and reload; selection must not change the active school setting. Result: **PASS** — 2024-2025 shows its own 100 students, kept through `/fee-types` and back and through a reload; switching back shows 2025-2026 with the full list, and the active year stays 2025-2026.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **fees-M01**: Create owned charges with effective date and discount; reopen and reconcile gross, discount, net and status. Result: **PASS** — Cantine from 1 November 2025 with a 50/month discount (8 × 350,00 = 2.800,00) and Manuels 250,00; the preview equals the saved schedule; gross, discount, net and status reconcile; the calendar closes once a day is picked.
- [x] **fees-M02**: Use bulk/class fee forms only when every selected student is owned; verify preview and one charge per intended target. Result: **PASS** — the multi-type form creates one charge per selected type for the owned student and none for the other; a type the student already has is refused with "Ces frais sont déjà facturés à cet élève pour cette année" and the form stays open; a mix names both counts. The class bulk form is NOT EXPOSED (its button was removed in `e29ee12`).
- [x] **fees-M03**: Edit allowed fields and reload; reject invalid dates/discounts and preserve prior values. Result: **PASS** — the discount and notes edit reloads with net 2.400,00 and the installments follow; negative and above-amount discounts are refused in the form and by the API in French; out-of-period and malformed billing dates are refused in French; prior values stay.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
