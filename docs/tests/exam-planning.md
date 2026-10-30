# Exam planning

Entry: **Evaluations → Planning**, `/exam-planning`. The former
`/assessment-planning` address redirects here. Assessments and Exams remain
separate pages in that dropdown.

## Data and access

- The class catalog, scoped to the viewed school year and Class ownership,
  supplies every class, including classes without exams or teaching assignments.
- `exam_planning` stores one row per class and academic year, with class
  visibility and a map of monthly entries. Each entry has a stable ID, date,
  subject and revision lessons. These plans do not create graded exams. Entries
  no longer store a lesson language; one saved or exported with `language` is
  still accepted, and the field is dropped.
- GET `/api/exam-planning` requires `read:exams`. PUT `/:classId` saves a single
  month, preserving other months and visibility. PUT `/visibility` atomically
  saves the selected classes, preserving all revision content. Both writes
  require a school-wide role with `update:exams`.
- The controller participates in the standard year request scope. Foreign-year
  classes and months are refused. Dates must be valid and inside the requested
  month; IDs are unique within a class/month. Entry and lesson sizes are bounded.
- Planning follows the Exams sidebar preference. Family roles can read/print
  their owned classes and have no editing controls. Offline record transport
  has not been added for this page.
- Migration `0083_damp_maelstrom` adds only the planning table. Migration 0082's
  earlier nullable assessment field remains compatible but is not used here.

## Workflow

1. Choose **From** and **To** dates inside the viewed school year. Both endpoints
   are included, and ranges can cross months. The first load covers this month,
   or the nearest month with saved content inside the viewed year. The list,
   A4 preview and print use the same dates; a reversed range shows validation.
2. Every enabled class appears as a tab. **All classes** includes the empty ones.
   The header gear opens the standard settings sheet with all year-owned classes.
3. Select a subject to edit dates, subject names and revision lessons.
   **Add exam** adds a planning entry without requiring a teacher assignment.
   The default view follows the reference's compact day cards and persistent
   side editor. Subject/date details stay visible for editors.
   The standard app page header is unchanged. UI colors, font, borders and
   radii follow the app theme; the A4 document retains its reference colors.
4. Save or cancel changes before switching dates/classes or printing. Drafts
   also appear in A4 preview. Saves preserve entries outside the filter and
   changes in other months; class visibility changes never delete their plans.
5. A4 preview and Print / Save PDF share one bilingual document template, local
   French/Arabic fonts, the reference's six class colors and blue column headers.
   Printing All classes includes classes with entries in the selected dates.
   Each sheet derives its semester(s) from its entries. The redundant heading
   date/semester summary, preview button and Saved badge have been removed;
   Planning and A4 preview remain available as tabs.
6. The Najm Kit tabs have automatic width and share a toolbar with the From/To
   filters. All planning date controls use Kit `DateInput`, including the exam
   details editor, with calendar bounds and shared locale/theme formatting.
7. The subject uses Kit `TextInput` and the lessons Kit `Textarea`; neither
   gets a page-level focus outline over Kit's own ring. There is no lesson
   language field: the first letter of the text decides, like `dir="auto"`,
   so Arabic lessons get the Arabic font and right-to-left layout on screen
   and on the A4 sheet. Delete, Cancel and Preview/Save share the editor
   action row; actions wrap on narrow screens.
8. The editor header is one compact row: calendar icon, date/class and subject.
   The edit button and redundant "Edit revision lessons" caption are removed. Long header text
   truncates with its full text available on hover, keeping the row compact.

## Example imported on 2026-10-28

The user's visualization supplied 84 French/Arabic entries, saved through the
internal REST API to the six existing primary classes for **November 2026**:
CP 13, CE1 14, CE2 15, CM1 15, CM2 13, CE6 14. The reference dates are November
9–13 (CE6 ends November 12). All 15 existing classes remain enabled. No teachers,
subjects, classes or graded exam records were fabricated. The one-time loader
preserves an existing nonempty November plan on reruns.

## Verification

### Clear planning

- **Clear all** opens the Najm destructive confirmation dialog, naming the viewed
  school year. Cancel keeps saved content and drafts. Confirm clears every
  class/month, including hidden classes and drafts; classes, visibility and other
  years are preserved. A failed request keeps the dialog and content for retry.
- `DELETE /api/exam-planning` requires school-wide `update:exams` and clears only
  the owned year catalog in one update. The browser acceptance script refuses
  to run its clear scenario unless the marked fixture's initial planning is empty.
- Verified on 2026-10-29: opening/Cancel makes no DELETE request; failed clear
  preserves saved content and drafts for retry; confirmation clears visible and
  hidden months and drafts, persists after reload, and keeps other years and
  visibility intact. The confirmation fits 320px. Fixture cleanup, 14 focused
  service/year tests, full typecheck, lint, translations, boundaries and the
  production build passed (lint retains the existing ParentsTable warning).

### JSON backup and import

- The toolbar exports all saved planning for the viewed school year, including
  hidden classes, lessons and visibility. Save/cancel drafts first.
- JSON uses `format: "school-exam-planning"`, `version: 1`, `schoolYear`,
  `exportedAt` and `classes` (names, visibility and months; no database class IDs).
  Maximum 5 MB. Older version 1 exports containing class IDs remain accepted;
  those IDs are ignored and removed during normalization.
- Import opens a Najm sheet for file selection, validation and a class/count
  preview. Confirming import replaces each included month's entries and restores
  the included classes' visibility. Empty arrays clear a month. Omitted months
  and classes are preserved. Class names identify classes in the destination's
  owned school-year catalog, ignoring case, surrounding whitespace and Unicode
  composition. Matching does not depend on the source database's IDs.
- The browser and REST endpoint share validation rules. Invalid dates, duplicate entry IDs or class names,
  oversized lessons, unknown versions/classes and another school year are refused.
  Ambiguous destination names are refused before writing any part of the batch.
  `PUT /api/exam-planning/import` requires school-wide `update:exams` and saves
  the batch in one atomic upsert. Import does not create classes or sections.
- Repeatable Playwright acceptance uses only the marked local
  `school_history_test` database and removes its own temporary class afterward:
  `bun run test:exam-planning:browser` (build first; set `NAJM_NEXT_DIST_DIR` for an
  isolated production build). It verifies JSON download, import/persistence,
  validation failures, preserved months, hidden-class export, unauthenticated
  refusal and mobile layout.
- Verified on 2026-10-29 against the isolated production build: JSON download,
  invalid JSON/version/year/class/date/size refusal, preview, failed-import retry,
  import and reload persistence, empty-month clearing, omitted-month/class
  preservation, visibility restoration and hidden-class export. At 320/390px,
  the sheet and replacement instructions are fully visible with no horizontal
  overflow or browser errors.
  The temporary class was removed and fixture planning matched its baseline.
  Full typecheck, production build, translations, workspace boundaries and 738
  frontend/contracts tests passed. Lint passed with the existing ParentsTable
  dependency warning. No main-school records were changed.

- Name-based transfer regressions cover ID-free exports, older exports with
  foreign database IDs, destination ID resolution, unknown names despite a
  matching legacy ID, duplicate names and ambiguous destination names. The
  browser acceptance script checks ID-free downloads and imports a legacy file
  containing a different machine's class ID.

### Existing checks

- Release preflight reviewed 234 ownership SQL baseline differences. The only
  changes are the new assessment planning/target-section projections and the
  nullable planning column in insert/returning lists. Query methods, parameters
  and outer ownership/year predicates are unchanged. The reviewed fixture is
  recorded in a separate commit. DTO validation refusals are also included in
  all four languages' validation catalog.

- Workspace typecheck, lint, translations, boundaries, year registration tests,
  focused planning/DTO/service/navigation tests and isolated production build.
- Baseline browser coverage before the date-input update: 15 class tabs, November
  lessons, automatic February semester, revision editor/cancel, settings sheet,
  A4 preview, font/logo-ready print popup and 390px width without overflow.
- Playwright comparison with the work example: 63px Arabic subject rows,
  day cards and a side editor; stacked editor above the list on mobile. Header
  computed styles match the Exams page. Changing theme color/border/radius
  tokens propagates without a local palette. Widths 320/390/768/1024 pass.
- PDF uses A4 portrait, date row spans, Arabic direction and per-grade colors.
  Longer content continues onto further pages rather than being clipped.
- Date-input regressions cover inclusive endpoints, cross-month/semester ranges,
  leap days, cleared drafts and preservation of entries outside the filter.
  On 2026-10-29, 734 frontend/contracts tests, dashboard typecheck, root lint,
  translation checks and the final isolated production build passed.
  Windows Computer Use could not verify the browser URL, so visual acceptance
  of the new date inputs was not completed in this pass.

Commands:

```powershell
bun test packages/server/tests/security/ExamPlanning.test.ts packages/server/tests/academicYears/YearScopedModules.test.ts
bun run test:config
bun run lint
bun run typecheck
bun run i18n:check
bun run test:boundaries
bun run db:check
bun run build
```
