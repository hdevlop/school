# Student attendance

Status: **PASS** (4/4 PASS) on `65b15ec`, 2026-10-17. Evidence: [PB1017](../../evidence/production-browser/2026-10-16-pb1017/README.md).

Entry point: `/attendance/students`. Original coverage: E01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned section roster/date; no real attendance edits. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **student-attendance-R01**: Select section/date; roster and saved marks belong to that selection. Result: **PASS**.
- [x] **student-attendance-R02**: Change a draft then reset it; saved attendance stays unchanged. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope and the
[full-roster attendance rule](00-preflight.md#attendance-saves-require-a-controlled-full-roster).
Every student in the loaded section/roster must be owned: Save can create default
present marks for unrecorded rows hidden by filters. A mixed roster makes these
browser save cases BLOCKED; use an owned section or an isolated environment.

- [x] **student-attendance-M01**: Mark owned students, save once and reload; one persisted mark per student/date remains. Result: **PASS**.
- [x] **student-attendance-M02**: Update the mark and switch sections/dates; drafts and results must not leak. Check phone-card parity and role denial. Result: **PASS**.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
