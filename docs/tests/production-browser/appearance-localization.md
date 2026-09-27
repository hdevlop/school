# Appearance and localization

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: Dashboard shell, appearance/language controls. Original coverage: B03, B04.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

A dedicated user whose personal preferences may change. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **appearance-localization-R01**: Inspect first paint and reload in both themes; no mismatched server snapshot or broken branding images.
- [ ] **appearance-localization-R02**: Switch `en`, `fr`, `ar`, `es`; headings, form feedback and date/money labels translate, and Arabic changes direction.
- [ ] **appearance-localization-R03**: Check currency/time-zone formatting against the selected preference and known timestamps.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **appearance-localization-M01**: Change only the test user's personal preferences, reload and reopen a new session; values persist. Restore original preferences.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
