# Parents

Status: **PASS** (4/4) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md). Earlier evidence: [PB1016](../../evidence/production-browser/2026-10-16-pb1016/README.md).

Entry point: `/parents`. Original coverage: D03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned parent with unique CIN/phone/email; optional owned child. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **parents-R01**: Search parents and inspect details; linked-child and no-child states are explicit. Result: **PASS** — search and details; an unlinked parent is marked orphaned, and an owned parent with a child shows no such mark and lists the child.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **parents-M01**: Create and edit an owned parent, attach only an owned child and reload. Result: **PASS** — an owned parent is created, edited and reloaded; an owned child attached through the student form keeps the link after reload.
- [x] **parents-M02**: Duplicate CIN/phone/email produce safe feedback; nested student creation reuses the intended parent without duplication. Result: **PASS** — duplicate CIN, phone and email each get 409 with their own French message and one parent; a student created with that CIN links the existing parent, no second one.
- [x] **parents-M03**: Cancel deletion, then remove only the owned unlinked parent. Result: **PASS** — PB1016 PEOPLE-05: cancellation sends nothing; the disposable parent is deleted and its supported read returns 404.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
