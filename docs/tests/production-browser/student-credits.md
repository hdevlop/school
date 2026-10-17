# Student credits

Status: **BLOCKED** in the browser: the credit UI was removed in `4f2f9a4`; credit API refusals pass. Evidence: [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md).

Entry point: `/financial-operations` student credit panel. Original coverage: G07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student with a known credit lot and payable fee. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-credits-R01**: Select student; available credit and history match that identity, including empty state. Result: **BLOCKED** — no credit panel since `4f2f9a4`; the credit read passes through the API.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **student-credits-M01**: Apply an authorized positive credit amount to owned fees; reload and reconcile remaining credit and fee balance. Result: **BLOCKED** — no browser control to apply a credit.
- [ ] **student-credits-M02**: Zero, negative or excessive amounts fail without consuming credit; remaining balance never goes below zero. Result: **BLOCKED** — no browser control; zero/negative/excessive amounts are refused in French through the API.
- [ ] **student-credits-M03**: Credit creation/reversal without a browser control remains a supported-API/database obligation. Result: **NOT RUN** — creating a credit posts an overpayment; supported-API/database obligation.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
