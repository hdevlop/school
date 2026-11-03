# Secretary dashboard

The `secretary` role uses a dedicated `/dashboard` layout with active student,
parent, new visit-request and personal unread-notification totals. Its daily
work card lists up to five unfinished visit requests: new enquiries before
contacted enquiries, oldest first within each status. Quick actions use the
destination pages' permission rules. Existing school charts and the calendar
remain available.

Student totals reuse the selected-year enrollment count. The overview
controller is registered as `secretary-dashboard` in `yearScope.ts`; its client
query includes the viewing year and pins that same year on the request.
Parents, visit enquiries and personal notifications remain shared across years.
Resources without their read permission are neither queried nor returned.

Verification on 2026-11-03:

- Service and navigation tests cover revoked and wildcard permissions, active
  enrollment counts, personal notifications, failed reads and controller guards.
- Dashboard audience, year-scope registration and workspace-boundary tests pass.
- Type checks and translation checks pass. Lint reports no errors and the
  existing `ParentsTable.tsx` hook-dependency warning.
- The production build passes.
- A browser preview with fixture session/data checks desktop, 390 px and Arabic
  RTL layouts for horizontal overflow. Replacing the server session in this
  preview triggers React hydration recovery; it is not an authenticated
  secretary end-to-end test.

An authenticated secretary database/transport run remains unverified: no usable
secretary sign-in or isolated history-fixture credentials were available in this
environment. No school records or account permissions were changed for testing.

## Local schema repair, 2026-11-03

A subsequent staff-profile HTTP 500 was traced to unapplied migrations
`0093`–`0096` on the local `school` database. In particular,
`supervisor_assignments` did not exist before migration `0095`.

A custom-format PostgreSQL backup was saved and verified under
`.cache/backups/school-before-supervisor-migration-1793716750482.dump`
(7,590,915 bytes; 89 tables with data). `bun run db:migrate` applied the four
existing migrations, including their permission-grant and session-invalidation
steps. The migration journal now contains 97 entries with no pending migrations;
`bun run db:check` passes.

Authenticated checks against the running app pass for `GET /api/staff/rYsXQ`,
`GET /api/navigation/sidebar` (both HTTP 200), and the `staff_get_staff_member`
MCP tool. The local development server was started on port 3102 for these checks.
