# Financial operations

Status: **PARTIAL** (2/5 cases complete) on `752e1bd`, 2026-10-17. Evidence: [PB1020-FIN](../../evidence/production-browser/2026-10-17-pb1020-fin/README.md). Check transitions and audit reads do not complete credit, rollover or notification requirements.

Entry point: `/financial-operations`. Original coverage: G11, G13.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Accounting-capable identity, denied role, owned financial fixtures. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **financial-operations-R01**: Load checks, credits, rollover, financial notifications and audit panels; each total agrees with supported reads. Result: **PARTIAL** — check rows/count and the rollover preview dialog passed; the credit UI is absent and the complete panel/totals matrix is not recorded.
- [x] **financial-operations-R02**: Audit projection identifies authorized actions and has no edit/delete affordance; private metadata remains protected. Result: **PASS**.
- [x] **financial-operations-R03**: Unauthorized reads/writes are denied while the account stays signed in. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **financial-operations-M01**: Execute check transitions, credits and rollover only through their dedicated checklists; refresh affected panels after each approved action. Result: **PARTIAL** — owned check deposit/bounce and panel refresh passed. Credit browser cases are BLOCKED and rollover commit was NOT RUN.
- [ ] **financial-operations-M02**: Notification generation, audit append-only enforcement, concurrency and rollback stay separately tracked API/database obligations. Result: **NOT RUN** — API/database obligation; concurrency covered locally in the Finance concurrency run.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
