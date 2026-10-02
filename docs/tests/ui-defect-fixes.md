# UI defect fixes

Source fixes for the defects reported on 2026-10-01. The original observations
remain in `academic-year-visual-review.md`. This record does not replace the
owner's academic-year acceptance.

| Reported defect | Source change |
| --- | --- |
| All fee types appear inactive | The status column uses the API's `status` field. Categories and payment types use catalog labels. |
| Settings actions obscure the year selector or leave the phone viewport | The year selector stays in normal header flow. Migration and save actions wrap in a separate row; save text is translated. |
| Planning subtitle overlaps the selector | The selector occupies header space, and the title/subtitle flex item can shrink. |
| Finance Operations exposes `payroll.paid` and overflows | Audit event codes have localized descriptions. Panels, inputs and actions fit narrow widths; credit controls wrap. |
| Hydration errors on 14 phone pages | The affected tables use `responsiveSkeleton`, which renders both loading variants with CSS visibility instead of choosing different markup on the server and phone. |
| Phone dashboard charts collapse and pages have no side margin | The shell has side padding and a shrinking content column. Mobile chart rows have a 320 px height in a scrolling dashboard. |
| Phone Payroll columns become unreadable | The table retains a 900 px minimum width inside its horizontal scroll container. |
| Student fee header overlaps | Student identity, overdue warning and payment controls wrap; metadata wraps within the identity block. |
| Student profile is clipped at 1366 px | The shell content can shrink, the profile sidebar uses responsive widths, and tabs scroll horizontally. |
| English text and raw enum codes in the French interface | Calendar, Finance Operations, student fee tabs/actions, teacher details and Grades controls use shared catalogs. Calendar month/weekdays use the interface locale; staff roles and fee frequencies have localized labels. |

The captured hydration errors affected `/alerts`, `/announcements`,
`/assessments`, `/attendance/students`, `/attendance/teachers`,
`/attendance/staff`, `/classes`, `/cycles`, `/discipline`, `/exams`, `/expenses`,
`/fee-types`, `/sections` and `/subjects`, all at 390 px. Teachers attendance
shares the staff attendance component. The regression test reproduces differing
default table markup and verifies identical server/mobile loading markup with
the published responsive skeleton option.

Verification:

- `bun run test:config`: PASS, 311 tests, including the rendering regression
  and actual catalog coverage for financial/staff enum labels.
- `bun run test:boundaries`: PASS, 28 tests and workspace import checks.
- `bun run typecheck`: PASS.
- `bun run lint`: PASS.
- `bun run i18n:check`: PASS, no missing static keys in the four catalogs.
- `NAJM_NEXT_DIST_DIR=.next-ui-defects-final bun run build`: PASS, optimized
  compilation, TypeScript, page generation and build traces. The default build
  attempt encountered `ENOTEMPTY` while clearing the active `.next` directory;
  verification used a separate build directory.
- Initial connected/browser verification: **NOT RUN** (superseded by the focused
  [2026-10-02 release replay](academic-year-release-2026-10-02.md)). Browser discovery returned
  no connected browser. The original captures establish the defects, not the
  appearance after these changes.

Browser replay when connected: use the French interface at 390 px and 1366 px;
open Settings, Planning, Dashboard, Payroll, Finance Operations, Fee Types,
Grades, a student profile and its fee page, and a teacher detail page. Reload
each of the 14 routes above at phone width and check hydration errors. Confirm
the year selector, save action, tabs, horizontal table scrolling and chart
contents stay reachable. Read fee-type status against the API's `status` value.
This replay requires no data changes.
