# Financial reminders

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/reminders`. Original coverage: G15.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned due/overdue records and controlled recipients. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **reminders-R01**: Filter/list due reminders; due dates and status agree with owning financial records.
- [ ] **reminders-R02**: Follow a reminder to its student/fee; identity and permissions are preserved.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **reminders-M01**: If a send action exists, use only a controlled recipient and authorized delivery scope; record delivery and duplicate handling. No bulk reminders to live families.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
