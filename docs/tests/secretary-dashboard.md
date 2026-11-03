# Secretary dashboard

The `secretary` role uses a dedicated `/dashboard` layout with teacher and
parent totals, this month's student attendance count and staff attendance
percentage, plus active student totals when permitted. Attendance tiles share
their charts' selected-year queries and use the school business date to pick
the month. Student attendance counts present plus late marks, rather than
unique students; a month with no marks shows zero. Staff attendance uses the
same attended marks as a share of all marks and shows a placeholder without
marks. A viewed year without that month shows a placeholder. Visit-request and
unread-notification KPI tiles are omitted. Its daily
work card lists up to five unfinished visit requests: new enquiries before
contacted enquiries, oldest first within each status. Quick actions use the
destination pages' permission rules. Existing school charts and the calendar
remain available. Below the KPI cards, About, students by gender, student
attendance (when permitted), and staff attendance form the first row. Incidents
by Month, Daily Work, compact Quick Actions and Calendar form the following row. The layout
shares its responsive row component with the monitor and supervisor dashboards:
rows share available desktop height, long card contents scroll internally,
and cards stack on small screens. The header welcomes the secretary by name
and shows the school business date; the loading skeleton matches the layout.

These layout changes have not been run through build, lint, or checks, at the
user's request. The verification below predates them.

Attendance counts use `GET /api/dashboard/secretary/attendance/staff-monthly`
and `GET /api/dashboard/secretary/attendance/students-monthly`, restricted to the
secretary role with `read:dashboard`. These routes reuse the selected-year
dashboard aggregation and expose no identities or individual attendance
records; their existing resource read permissions are unchanged.

Student totals reuse the selected-year enrollment count. The overview
controller is registered as `secretary-dashboard` in `yearScope.ts`; its client
query includes the viewing year and pins that same year on the request.
Teachers, parents, visit enquiries and personal notifications remain shared
across years. Teacher and parent totals are aggregate-only reads authorized
by the secretary dashboard's role and `read:dashboard` guard; access to their
individual records keeps its existing read permissions. Student totals and
visit details still require their resource read permission.

Monthly incidents reuse the supervisor chart with Low, Medium, High and Critical
severity stacks. The secretary overview returns only counts, using the existing
discipline ownership predicate and the selected year's school-local reporting
dates, excluding incidents after the school business date. Missing months are
filled with zero counts; the chart leaves future months blank. Individual
discipline records retain their `read:discipline` permission.

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
