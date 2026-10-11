# Landing work publication check

Checked on 2026-10-11 before committing the pending School work.

The pending work includes the public `/welcome` page, school branding assets,
landing content and visit-enquiry backend modules, migrations 0063 and 0064,
and profile, scrolling and mobile-tab improvements.

By user request, **Public school page** and **Visit requests** are removed from
the dashboard sidebar. `/public-page` and `/visit-requests` now call Next's
`notFound()` instead of rendering their feature components. This disables the
two dashboard pages; the public landing page and backend APIs remain present.

## Current checks

- `bun run lint`: passed after the dashboard changes.
- `bun run typecheck`: passed across all workspaces, including test types.
- `bun run test`: passed the root suite, including configuration, academic-year,
  ownership, security, boundaries, landing and visit-request checks.
- `bun run i18n:check`: passed; no missing static translation keys.
- `bun run db:check`: passed migration metadata validation.
- `bun run build`: passed after both dashboard pages were disabled.
- All 20 Najm packages pinned by School match the npm registry's current
  `latest` versions and the corresponding `bun.lock` resolutions.

No database migration, demo seed, browser acceptance or deployment was run
during this publication check. Database validation above checks migration
metadata; it does not prove production schema application or live acceptance.

The other logs, screenshots and JSON results in this directory are retained
from earlier landing implementation work. They include the previously enabled
staff pages and do not establish acceptance of the current disabled-page state.
