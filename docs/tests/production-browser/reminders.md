# Financial reminders

Status: **PARTIAL** (2/3 PASS; the rest BLOCKED by missing controls or fixtures), last rechecked on `37147d7`, 2026-10-17. Evidence: [PB1019 Communication](../../evidence/production-browser/2026-10-17-pb1019-comm-continuation/README.md).

Entry point: `/reminders`. Original coverage: G15.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned due/overdue records and controlled recipients. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **reminders-R01**: Filter/list due reminders; due dates and status agree with owning financial records. Result: **PASS** — Controlled overdue amount, oldest due date and age independently reconcile with the owning fee installments; desktop and French/Arabic phone views identify the same record.
- [x] **reminders-R02**: Follow a reminder to its student/fee; identity and permissions are preserved. Result: **PASS** — Keyboard navigation follows the exact controlled student fee link on desktop and phone; destination identity persists and denied actors retain transport refusals.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **reminders-M01**: If a send action exists, use only a controlled recipient and authorized delivery scope; record delivery and duplicate handling. No bulk reminders to live families. Result: **BLOCKED** — Controlled row button displays SMS-coming-soon toast and makes zero delivery requests.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
