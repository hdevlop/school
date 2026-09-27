# Sections

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/sections`. Original coverage: C03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Disposable class/section; known capacity. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **sections-R01**: Filter by class and inspect section capacity and room; inline editing and row/card identity agree.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **sections-M01**: Create a section, edit supported fields inline/form, blur/submit once and reload; one change persists.
- [ ] **sections-M02**: Try invalid capacity and duplicate section for the class; retain correct values after refusal.
- [ ] **sections-M03**: Delete only an unreferenced owned section; referenced deletion must return a safe conflict.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
