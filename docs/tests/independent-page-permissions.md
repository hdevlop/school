# Independent page permissions

Insurance uses `read:insurance`; Timetables uses `read:class-routines`.
Neither permission control changes Students (`read:students`) or Classes
(`read:classes`). Sidebar visibility remains a separate preference.

Insurance keeps its school-wide role restriction. Its year-scoped
`GET /api/insurance` endpoint returns only register fields and does not require
`read:students`. Timetable read routes require `read:class-routines`; the class
and section selector applies Monitor assignments on the server without a second
request requiring `read:classes`.

## Upgrade

Run `bun run db:migrate` as part of deploying this change. Migration
`0094_independent_page_permissions` declares the new catalog entries and copies
existing access once: timetable readers retain timetable access; school-wide
student readers retain insurance access. Source grants and sidebar preferences
remain intact. Affected sessions are invalidated, so users sign in again.
Later permission edits are independent. Do not reseed roles to apply this fix:
seeding can restore defaults an administrator has deliberately removed.

## Verification

- `bun run test:config`: independent matrix controls, page guards, sidebar and
  Home cards, and insurance document rendering.
- `bun run test:security`: independent API guards and register field filtering.
- `bun run test:routines`: Monitor assignment filtering without Classes access.
- `bun run test:ownership` and `bun run test:academic-years`: existing ownership
  SQL and year behavior remain covered.
- `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/IndependentPagePermissionsDatabase.test.ts`:
  migration grants, independent removals, and one-time session invalidation.
  This test requires `SCHOOL_HISTORY_TEST_DB_URL` pointing to the local
  `school_history_test` database. It uses connection-local temporary tables;
  application records are untouched.

The migration was exercised against the local test database. Application and
production migrations are separate deployment actions.
