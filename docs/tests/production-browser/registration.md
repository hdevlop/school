# Registration

Status: **PASS** (4/4) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md).

Entry point: `/register`. Original coverage: A extension.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

A unique controlled email and an agreed user cleanup path. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **registration-R01**: Open registration signed out; labels and login link work. Result: **PASS** — signed out, the French labels show and the login link opens `/login`.
- [x] **registration-R02**: Submit empty, malformed-email and weak/mismatched-password forms; show actionable validation. Result: **PASS** — empty, malformed-email, short, no-uppercase and mismatched passwords are refused in French with no request.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **registration-M01**: Register one owned identity; success returns to login without an authenticated session or privileged role. Result: **PASS** — one registration returns to `/login` with the approval message; no session cookie, no role, status pending, email unverified.
- [x] **registration-M02**: Try the owned duplicate identity once; no second account is created. A new unverified/roleless account cannot reach protected data. Result: **PASS** — a second registration gets 409 with feedback and one account remains; the new account cannot sign in (403, message in English, see the evidence findings).

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
