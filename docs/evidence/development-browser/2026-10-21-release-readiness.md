# Release readiness — 2026-10-21

The complete pending School batch includes the linked development evidence for
enrollment/teacher forms, transport/staff, assessment/grade workflows, demo
settings/routines/attendance, and rewards/staff arrival details/not-found recovery.
The offline synchronization proposal moves unchanged into `docs/design/`.

Release preflight passed root lint, root typecheck, the complete root test script,
the four-language translation-key scan, and `db:check`. Production build passed
in `.next-grade-toolbar`; exact pushed-revision validation is additionally
required by the deployment workflow. Docker is unavailable locally, so the
production Compose configuration check must pass in CI before publication.

Two stale test fixtures were corrected before publication:

- `TeachingDays.test.ts` now supplies `getSchoolDay()` in its routine repository
  mock, matching the service's configured-day generation contract.
- The ownership SQL baseline was reviewed across every case before updating.
  Exactly 182 cases, representing 62 distinct outcomes, changed only because
  nullable `attendance.arrival_time` is selected/returned or inserted with its
  database default. Removing only those additions reproduced every prior
  statement byte-for-byte with the same ordered parameters. All ownership
  predicates, joins, year restrictions and mutation parameters are unchanged.
  The refreshed baseline is committed separately under its capture guide.

Migration 0071 adds only nullable `attendance.arrival_time`. School's production
Compose migrate service runs before the application and notification worker.
No destructive reset or seed of people is part of this release.

This is preflight evidence, not deployment acceptance. The authorized target is
the School demo at `myscolai.com`; customer digest promotion remains separate.
