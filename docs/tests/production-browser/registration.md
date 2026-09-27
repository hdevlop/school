# Registration

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/register`. Original coverage: A extension.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

A unique controlled email and an agreed user cleanup path. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **registration-R01**: Open registration signed out; labels and login link work.
- [ ] **registration-R02**: Submit empty, malformed-email and weak/mismatched-password forms; show actionable validation.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **registration-M01**: Register one owned identity; success returns to login without an authenticated session or privileged role.
- [ ] **registration-M02**: Try the owned duplicate identity once; no second account is created. A new unverified/roleless account cannot reach protected data.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
