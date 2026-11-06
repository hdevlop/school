# Plan: Massar grade sheets (نقط المراقبة المستمرة)

Status: v1 implemented on 2026-11-06; filled export is gated pending the real
Massar import check in §9.1. Unshipped migrations are consolidated in 0101;
the final schema is present in the local databases. Verification and remaining
external checks: [Massar grades](../tests/massar-grades.md).
Owner role: registrar ("student records and the Massar exchange").

## 1. Goal

Today the registrar exports empty grade sheets from Massar (one per class ×
subject × فرض), hands them to teachers, collects them, fixes mistakes, and
uploads them to Massar. School replaces the middle of that work:

1. **Start of year (once):** the registrar uploads Massar's empty exports.
   School learns the Massar classes, students and subject components.
2. **Each فرض:** School creates every sheet (class × subject) itself.
3. **Teachers** type marks in School, or write on a printed sheet and the
   registrar types them in.
4. **The registrar** follows progress and missing marks.
5. **Download:** one zip of Massar files, identical to Massar's own format.
6. **Upload to Massar** — all classes at once, as today.

Primary (APG, marks /10, several components) and collège (APIC, marks /20, one
column) are both in scope.

## 2. What we know (evidence)

From 2025/26 and 2026/27 files (about 130 workbooks) and a generation test.

### 2.1 The Massar file

One workbook, sheets `NotesCC` (visible, right-to-left) and `Data` (hidden,
holds the absence list: `' '`, `مبرر`). Written by the Open XML SDK (`x:`
namespace prefix). Sheet and workbook structure are protected; **the password
hash and salt are the same in every file**.

| Cell(s) | Meaning | Source |
|---|---|---|
| `C5` | school code | constant |
| `E5` | Massar class GUID | **one per class per year**, same for every subject and both terms |
| `G5` | term number (1, 2) | round |
| `I5` | فرض number (1, 2, 3…; 4 = الأنشطة المندمجة) | round |
| `K5` | subject code `#0011#` | catalog |
| `M5` | Massar year id (18 = 2025/26, 19 = 2026/27) | year |
| `O5` | level code (`1061101010`… for APG, `2A31101110`… for APIC, number or text) | level |
| `D7`, `I7`, `O7` | academy, direction, school name | constant |
| `D9`, `I9` | level label (`الأول ابتدائي عام`), class (`1APG-1`) | level, class |
| `D11`, `I11`, `O11` | term label, فرض label, subject name | round, catalog |
| `D13` | year label `2026/2027` | year |
| row 15, from `G` | component code `#1001#` on the first column of each pair | catalog |
| row 16 | component name, on **both** columns of the pair | catalog |
| row 17 | `النقطة` / `التغيب` | constant |
| rows 18+ | `B` hidden Massar student id, `C` code Massar, `D` name (merged D:E), `F` birth date `dd-mm-yyyy` (text) | enrollment |
| validations | mark column `decimal 0..max`, absence column `list Data!$A$1:$A$2`, rows 18..last student | generated |

Everything else (merges, hidden rows 1, 2, 5, 8, 15, hidden column B and all
absence columns, styles, conditional formatting that draws the borders, print
area) is **the same skeleton in every file**, whatever the class, subject or
number of components. Generating a sheet = writing values + setting the
validation ranges. No row or column is inserted.

Collège differs: one column per sheet, component code `#<فرض>#`, label = the
فرض label (`الفرض الأول`), marks 0–20.

### 2.2 What Massar checks (observed, not documented)

- Last year every file imported without error, including 12 robotics files
  copied from the 1APG-1 file (wrong GUID, wrong level code, maths code, wrong
  hidden ids) and two maths files whose hidden ids differed for all 50
  students. The registrar changed only the subject name.
- So Massar reads the **visible** names (class, subject) and finds students
  by **code Massar**, not by the hidden id. Unconfirmed for a row with an
  **empty** hidden id (a new student) — see §9.
- School still writes **every** field exactly like a real export, so it does
  not matter which ones Massar reads.

### 2.3 Generation test (2026-11-06) — passed

12 Arabic sheets for 2026/27 S1 فرض 1 were generated with `xlsx-manager` 2.1.0
from app-side data, each from **another level's** export as template, with
components learned from **another class's** export. Compared cell by cell
(value, type, lock, font, fill, border, alignment, number format, merges,
hidden rows/columns, validations, conditional formatting, protection, print
area) with Massar's real exports: **identical**.

Rules learned:
1. The template must be a **clean Massar export** (still has the `x:` prefix).
   Files a teacher opened and saved in Excel are not clean.
2. Component **names must be copied exactly** from this year's export:
   Massar adds trailing spaces / line breaks (`'الخط '`, `'الإستماع والتحدث\n'`)
   and they changed between 2025/26 and 2026/27.
3. The level label comes from Massar (`الأول ابتدائي عام`), **not** from
   `SCHOOL_CLASS_ARABIC_NAMES` (`الأولى ابتدائي`).

## 3. Scope

**v1:** import, catalog, rounds, generated empty sheets, teacher/registrar
entry, progress, filled export, lock after export.

**Not v1:** linking Massar marks to School's `grades`/report cards; importing
Massar final results (yearly averages, pass/fail); school-defined components
that roll up into Massar ones (CP French 6 → 4); PE and Amazigh (no files yet).

Massar marks are a separate module. They do not change `grades`, `assessments`
or `exams`.

## 4. Data model (new module `massar`, all year-scoped)

All new value lists are readonly tuples in `@sms/contracts`
(`MASSAR_ABSENCE_VALUES = ['none', 'justified']`, `MASSAR_SHEET_STATUS_VALUES`,
`MASSAR_ROUND_STATUS_VALUES`, `MASSAR_SHEET_KIND_VALUES = ['components', 'exam']`),
pinned in `packages/contracts/tests/enums.test.ts`.

| Table | Per | Columns (main) |
|---|---|---|
| `massar_years` | academic year | `academicYearId` (unique), `massarYearId` (M5), `schoolCode`, `academy`, `direction`, `schoolName`, `templateFileId` (clean export in storage), `importedAt`, `importedBy` |
| `massar_levels` | year × level | `code` (`1APG`), `label` (D9, exact), `levelCode` (O5, text), `maxMark` (10/20), `kind` |
| `massar_classes` | year × Massar class | `name` (`1APG-1`), `levelId`, `guid` (E5), `classId` + `sectionId` (app mapping) |
| `massar_subjects` | year × level × subject | `code` (`0011`), `name` (O11, exact), `subjectId` (app mapping), `components` jsonb `[{code, name}]` (exact text) |
| `massar_enrollments` | year × student | `studentId`, `massarClassId`, `massarStudentId` (hidden B, nullable), `position` (Massar order), `leftOn` (nullable) |
| `massar_rounds` | year × term × فرض | `term`, `termLabel`, `exam`, `examLabel`, `status` (open / exported / closed), `createdBy` |
| `massar_sheets` | round × class × subject | `teacherAssignmentId` (nullable), `status` (not_started / in_progress / submitted / exported / changed_after_export), `exportedAt`, `exportHash` |
| `massar_marks` | sheet × student × component | `mark` numeric nullable, `absence` (none / justified), `updatedBy`, `updatedAt`; unique (sheet, student, component) |

Notes:
- `code Massar` is `students.studentCode` (see `docs/architecture/student-names.md`).
  It is the join key everywhere; nothing else identifies a student to Massar.
- A Massar class maps to one app class + section, but the student list of a
  sheet comes from `massar_enrollments`, not from the app section. The
  registrar never moves a student's Massar class during the year; the app
  section may change.
- Several app subjects can share a Massar code in old files (robotics used
  `0019`). The real المعلوميات code is `0030`. Mapping is by
  (level, Massar code) → app subject, chosen once by the registrar.

## 5. Flows

### 5.1 Start-of-year import (registrar)

1. Upload a zip, a folder, or many `.xlsx` (Massar names
   `export_notesCC_<class>_<subject>.xlsx`, any فرض, empty or not).
2. Server reads each file with `xlsx-manager` (`loadBuffer`, `useSheet('NotesCC')`):
   year (D13, M5), school (C5, row 7), level (D9, O5), class (I9, E5),
   subject (K5, O11), components (rows 15–16, exact text), students (rows 18+).
3. **Preview, nothing written yet:**
   - classes found / missing compared with the app's classes;
   - each Massar class → proposed app class + section (via `toAppClassName`,
     section number → `A`/`B`…), editable;
   - each (level, subject code) → proposed app subject, editable, remembered;
   - students: matched by code Massar; listed separately: in Massar but not in
     School, in School's class but not in Massar, same code with a different
     name or birth date (warning only);
   - files refused: password-protected, not a `NotesCC` workbook, another year,
     another school code, two files that disagree on the same class's
     students or GUID.
4. **Confirm:** writes the year, levels, classes, subjects, enrollments. Keeps
   one clean export as the template (prefer the newest clean file; refuse to
   proceed with no clean file).
5. **Any time, any number of files.** Each upload is merged into what the year
   already holds; the preview shows only **new**, **changed** and **already
   known** items. Typical use: Arabic in September, other subjects later, one
   class after a new student.
   - A file adds a missing class, subject or student, and updates what it
     changed (components, student order, hidden id, a new student).
   - A file **never deletes**: a class, subject or student it does not
     mention stays as it is. Removing is an explicit action (a student
     leaving sets `leftOn`; a wrong mapping is edited on the setup page).
   - Rounds already created get the new subject's sheets when the registrar
     confirms ("add missing sheets to open rounds"); exported sheets are not
     touched.
   - Files of another year or another school code are refused with a message.

### 5.2 New or leaving student (no file needed)

- Arrives: the registrar adds the student in Massar first, then in School with
  the same code Massar and the Massar class. `massarStudentId` stays empty
  until the next import fills it. Sheets created after that include the
  student.
- Leaves: set `leftOn`; later sheets leave the student out. Marks already
  entered stay.

### 5.3 Rounds and sheets

- The registrar creates a round: term (1, 2) and فرض (1, 2, 3…, or
  الأنشطة المندمجة = 4), labels as Massar writes them.
- School creates one sheet per (Massar class × Massar subject) of that year.
  The teacher comes from `teacher_assignments` (class + section + subject); a
  sheet without a teacher is shown as "no teacher" and stays editable by the
  registrar.
- Collège sheets get one column: code `#<فرض>#`, label = the فرض label.

### 5.4 Entering marks

- Grid: students in Massar order, one column per component, mark + an
  "absent / justified" toggle per component.
- Checks (UX in the form, again in the DTO): `0 ≤ mark ≤ maxMark`, step to be
  decided (§9), a mark and "justified" together are refused, only this
  sheet's students and components.
- "Submit" by the teacher; the registrar can reopen.
- Printable sheet: download the generated empty `.xlsx` for one sheet or a
  class (it prints like Massar's); a web print view can come later.

### 5.5 Progress (registrar)

Board per round: class × subject with status, teacher, count of missing marks;
filter "missing only"; export the list.

### 5.6 Export

1. The registrar picks a round (all sheets, or a selection).
2. Server builds every file from the template (section 2.1), fills marks and
   absences, names it `export_notesCC_<class>_<subject>.xlsx`, zips with
   `fflate`, streams the zip.
3. Each exported sheet records `exportedAt` and a hash of its marks; status
   `exported`. A later edit sets `changed_after_export` and the board shows
   "re-export needed".
4. Unfinished sheets are listed before export; the registrar can export them
   anyway (Massar accepts blanks).

## 6. Server

Module `packages/server/src/modules/massar/` following the 4-layer pattern:

```
massar/
├── MassarController.ts        # import preview/commit, rounds, sheets, marks, export
├── MassarService.ts
├── MassarRepository.ts        # year-scoped via @Year(); owned reads for teachers
├── MassarValidator.ts
├── MassarDto.ts
├── MassarGuards.ts            # ownership: teacher → own sheets via teacher assignment
├── massarSchema.ts
└── workbook/
    ├── cells.ts               # the cell map of §2.1, one place
    ├── readExport.ts          # file → typed export (pure, no DB)
    └── writeSheet.ts          # template + sheet data → buffer (pure, no DB)
```

- Dependency: `xlsx-manager` **2.1.0 exact** in `packages/server/package.json`;
  `fflate` is already there.
- Year scope: register the controller in `packages/server/src/config/yearScope.ts`;
  no `academicYear` in params/body.
- Ownership (`MassarGuards.ts`, one `.where(and(this.ownershipCondition(), …))`):
  - **teacher** — reads and writes only sheets whose `teacherAssignmentId`
    belongs to them: **their own subjects in their own sections**. Teaching
    Arabic in 1APG-1 does not show 1APG-1's maths sheet (stricter than
    `GradeForTeacher`, which also shows other grades of a taught section).
    A sheet with no teacher is visible to no teacher.
  - **supervisor** — reads (never writes) every sheet and mark of the Massar
    classes mapped to a class they supervise: `supervisesClass(massar_classes.classId, userId)`
    from `packages/server/src/modules/staff/supervisorScope.ts`, the rule
    students and grades already use.
  - **monitor** (moniteur) — **no access**, decided 2026-11-06: no ownership rule, no default grant.
  - `SCHOOL_WIDE_ROLES` (registrar, principal, admin…) read all; their
    permissions decide what they can change.
  - Any other role sees nothing.
- Every route names its guard. New permissions in
  `packages/server/src/modules/seed-data/admin/permissions.json`:
  - `read:massar` — see rounds, sheets, progress
  - `manage:massar` — import, rounds, export, edit any sheet
  - `update:massar-marks` — enter marks (teacher: own sheets only)
  Defaults in `rolePermissions.json`: registrar `read:massar`, `manage:massar`,
  `update:massar-marks`; teacher `read:massar`, `update:massar-marks`;
  supervisor `read:massar`; principal and admin all. A migration grants the same to existing roles (see
  `0066_role_permission_defaults.sql`).
- Files: uploads and the template through `najm-storage` (restricted, not
  public). Upload size limit (a year is about 150 files ≈ 5 MB).
- Messages: every refusal is a catalog key, in the four languages
  (`test:server-i18n`).

## 7. Dashboard

`apps/dashboard/src/features/Massar/` with its own `config/` (schemas, options,
columns). Pages, each in `PAGE_ACCESS`:

| Page | Who | What |
|---|---|---|
| Massar setup | registrar, principal | upload exports, preview, confirm; mapping of classes and subjects; template status |
| Rounds | registrar, principal; supervisor (read-only, own classes) | list, create round, progress board, export zip (not for supervisor) |
| My sheets | teacher | own subjects in own sections, open rounds |
| Sheet | teacher (own, edit), registrar (any, edit), supervisor (own classes, read-only) | entry grid, submit/reopen, print/download |

Sidebar: a **Massar** group right after **Notes** (`/grades`), with children
filtered by `PAGE_ACCESS` like every other group. A role with one Massar page
gets a single item (existing `simplifySidebarGroups`).

| Role | Sidebar shows | Sees | Can edit |
|---|---|---|---|
| Registrar, principal, admin | Massar ▸ Rounds, All sheets, Setup | every class and subject | every sheet; import; export |
| Teacher | Massar (→ My sheets) | only their subjects in their sections | those sheets, until exported or submitted |
| Supervisor | Massar ▸ Rounds, All sheets | only the classes they supervise | nothing |
| Monitor | — | nothing | nothing |
| Parent, student | — | nothing | nothing |

Rules from CLAUDE.md: `useEntityCRUD`, `tableErrorProps` + `isCountUnknown`
on every `NTable`, selects from `@sms/contracts` tuples, all text in the shared
catalogs, mobile card views for lists. The grid needs a keyboard-first layout
(arrow keys, Enter moves down) for the registrar typing paper sheets.

## 8. Tests

No real Massar file is committed: they hold student names, codes and the
school's identifiers.

**Workbook (pure, `packages/server/tests/massar/`)**
- A committed **synthetic template**: built once by a script from a clean export
  with every student row removed and the school fields, GUID and protection
  hash replaced by placeholders. Kept small and reviewed for personal data.
- `readExport`: header, row 5 values and types (number vs text `O5`), component
  pairs (1, 6, 9, 13 components), exact labels (trailing space and `\n`),
  collège shape, students in order, filled marks/absences read back.
- `writeSheet`: values, validation ranges for 1 and 33 students, list rule,
  0–10 vs 0–20, empty rows untouched, protection and print area kept,
  absence `مبرر` written, `Data` sheet values.
- Round trip: `writeSheet` → `readExport` returns the same data.
- **Local golden test** (skipped unless `MASSAR_SAMPLES` contains at least two
  clean exports, never in CI):
  for each real clean export, regenerate it from its parsed data with another
  file as template and compare cell by cell — must be identical (the 2026-11-06
  test, kept as a regression check).

**Server**
- Import preview/commit: matching by code Massar, unmatched lists, refused
  files, re-import diff, one GUID per class.
- Ownership (`test:ownership`): a teacher with Arabic in 1APG-1 sees and edits
  that sheet only — not 1APG-1 maths, not Arabic in 1APG-2; a supervisor of
  CP reads CP's sheets and marks only and every write is refused; a
  supervisor whose assignment ended sees none; other roles none;
  school-wide roles all.
- Security (`test:security` and transport lists): every new route has a
  permission guard.
- Year scope: controller registered; reads outside the scope throw.
- Export: status changes, `changed_after_export`, zip names, blanks allowed.
- i18n: every new key in four languages.

**Dashboard**
- Schemas: mark limits per level, mark + justified refused.
- Tables: failed load is not an empty list.

## 9. Open questions and pending checks

| # | Question / check | Blocks |
|---|---|---|
| 1 | **Massar import test:** one generated sheet with one class's real marks, imported into Massar, marks checked there. | export (phase 4) |
| 2 | A row with an **empty hidden id** (new student) imports correctly. Include one in test 1, or wait for a real arrival. | new students without re-import |
| 3 | Collège: a فرض 2 export, to confirm `#2#` / `الفرض الثاني`. | collège rounds beyond فرض 1 |
| 4 | الأنشطة المندمجة sheets for other subjects than Islamic level 6. | that round type |
| 5 | Allowed decimals (0.25? 0.5? 2 digits?). The file only says `decimal 0..max`, number format `0.00`. | entry checks |
| 6 | PE and Amazigh: graded in Massar? | catalog completeness |
| 7 | Do all teachers have a login? If not, the registrar enters for them (already supported). | none |
| 8 | Next year's `M5` value: confirm from the first 2027/28 export (expected 20). | next year |
| 9 | ~~Monitor access~~ — decided 2026-11-06: monitors see no Massar sheets. | — |

## 10. Phases

Each phase is usable on its own.

1. **Workbook core:** `cells.ts`, `readExport`, `writeSheet`, synthetic template,
   unit and local golden tests. No UI.
2. **Import and catalog:** tables, import preview/commit, mapping screens,
   template storage, permissions and migration.
3. **Rounds and empty sheets:** create a round, generate the zip of empty
   sheets. The registrar can already stop exporting from Massar each فرض and
   use the current paper/Excel flow with School's files.
4. **Entry and progress:** grid for teachers and registrar, submit/reopen,
   progress board.
5. **Filled export and lock:** zip with marks, export record,
   changed-after-export. Needs check §9.1.
6. **Later:** link to School grades/report cards, import Massar final results,
   school components that roll up into Massar components.

## 11. Implementation notes (2026-11-06)

Phases 1–5 are implemented. Phase 6 stays out of scope.

- Sheets snapshot their roster and components when created. Later arrivals,
  departures and catalog imports affect later sheets; marks retain their meaning.
- Re-imports merge records and add missing sheets to open rounds. An unmatched
  code blocks only its class until its School identity is added and the export
  re-imported. Managers see the class and reason on the progress board; other
  classes can create rounds and sheets. Existing sheets retain their roster.
- Preview records are private, bound to the actor and year, expire after one
  hour, and carry a digest of the preview and its starting data. A consumed or
  stale preview cannot be committed again. Confirm and Cancel delete their
  preview file after the database commits; Confirm also deletes a replaced
  template. Startup and five-minute sweeps delete expired previews and old
  unreferenced Massar files, retaining active templates across years.
- Saves use a revision and a transaction lock on the selected year. Submitted
  and exported sheets require an explicit manager reopen before teacher entry.
- Numeric and text Massar hidden student IDs and level codes retain their
  original types. The writer also preserves zero-width hidden columns and
  explicit normal styles that ExcelJS otherwise drops.
- Decimal validation follows the workbook's observed range, without inventing
  a rounding step. Collège rounds beyond فرض 1 and integrated activities need
  matching imported evidence for every subject being generated.
- `MASSAR_FILLED_EXPORT_VERIFIED=true` enables filled exports only after §9.1
  passes. Arrivals with a missing hidden ID can download printable/empty sheets;
  filled export still requires re-import until the external hidden-ID test passes;
  monitors have no Massar access (no ownership rule, no grant; §9.9).
- ZIP names use the Massar subject code. Progress lists use owned, year-scoped
  SQL counts. Spreadsheet/text uploads are allowed only in the Massar namespace.
- Migration 0101 includes hidden-ID numeric types; the unshipped 0102 was merged
  into it. Edited files with unsupported dimensions receive a layout refusal.
