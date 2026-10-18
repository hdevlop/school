# Teacher profile

Status: **PASS** (3/3) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md). Earlier evidence: [PB1016r browser results](../../evidence/production-browser/2026-10-16-pb1016r/browser-results.json).

Entry point: `/teachers/[id]`. Original coverage: D06, D10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher with class, subject and routine fixtures. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **teacher-profile-R01**: Inspect identity, academic details, classes, subjects, schedule, payments and documents as exposed. Result: **PASS** — all four tabs render; name, CIN, email, salary and the nine classes agree with the API.
- [x] **teacher-profile-R02**: Compare timetable with Class routines; whole lessons and assignments match. Result: **PASS** — 2025-2026 has no routines on the demo, so 2024-2025 was compared: nine sections and 18 weekly lessons match the teacher's published routines.
- [x] **teacher-profile-R03**: Open a forbidden profile in another context; projection excludes unauthorized/private fields. Result: **PASS** — the unauthorized teacher profile shows not found; the two expected 404 responses are retained in the browser diagnostics.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
