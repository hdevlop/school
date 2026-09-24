# Routine timetable implementation evidence

Date: 2026-09-24

## Implemented

- Days render as table rows and outer periods as columns, with subject colors, dotted separators between fixed labels, and a diagonal within each `OR` pair.
- A lesson keeps one assignment, teacher, room, and outer time. Its `contentGroups` contain zero to six untimed fixed labels or alternative pairs. The editor supports adding, converting, moving, removing, and previewing them without a nested time or rotation-calendar field.
- The same grid serves the class and teacher views. Break duty cells and existing entry permissions remain on the original paths.
- `routine_entries` gains JSONB `content_groups` default `[]` and positive integer `version` default `1`. Content replacement and deletion use an expected version. Omitted content on update is preserved.

## Source checks

| Check | Result |
| --- | --- |
| `bun run test:routines` | Passed |
| `bun run test` | Passed, including Routine DTO/service, contracts, and workspace boundary tests |
| `bun run typecheck` | Passed, including server Routine tests |
| `bun run lint` | Passed |
| `bun run i18n:check` | Passed |
| `bun run build` | Passed |
| `bun run db:check` | Passed |
| `git diff --check` | Passed |

Migration `0047_pink_rafael_vega.sql` and its snapshot change only `public.routine_entries` relative to migration 0046. An unrelated generated roles index was removed from 0047 before application.

## Local database check

The configured database host was confirmed to be loopback. Before migration, its Drizzle journal held 47 records with 0046 latest. `bun run db:migrate` succeeded; afterward the journal held 48 records with 0047 latest. `routine_entries.content_groups` and `routine_entries.version` are non-null with defaults `[]` and `1` respectively. A catalog query confirmed both new check constraints. The table had zero rows, so this run could not prove preservation of existing lesson data or a persisted mixed-content round trip.

## Remaining connected acceptance

- Internal API save/reload of plain, three-label, alternative-only, and mixed cells; content version conflict; parent-only edits; layout remapping; teacher-view lesson count and whole-period conflicts.
- Browser review of the reference layouts, Arabic and French, long labels, narrow screens, keyboard and touch, 200% zoom, both themes, and break duty editing.
- Disposable PostgreSQL migration and concurrency checks against representative data.

The local app was not listening on `127.0.0.1:3000` during this check. No connected API or browser result is claimed. No other database was migrated and no commit, push, CI, or deployment was performed.
