# Parent profile

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/parents/[id]`. Original coverage: D04, D10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned parent with child and another without children. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **parent-profile-R01**: Open profile directly and through the parent list; identity and children agree.
- [ ] **parent-profile-R02**: Inspect personal, children, financial and document tabs actually exposed; empty states are accurate.
- [ ] **parent-profile-R03**: Follow a child link; wrong-parent access and private/internal fields remain denied.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
