# Massar grades verification

Implemented 2026-11-06. School grades, assessments, exams and report cards are
unchanged. Massar uses its own year-scoped records and permission guards.

## Available workflow

- `/massar`: one sidebar item, with no page tabs. Upload/check/confirm is a
  dialog; class/subject matching opens in Massar settings. Arrivals and
  departures are made in Students: sheets follow the School enrollment.
- Empty screens point to uploading files, then opening the first Contrôle.
  Registrars open on Overview; teachers open directly on their first owned
  sheet; supervisors see only their supervised classes, read-only.
- Class buttons and subject buttons lead to a paper sheet. Sparse auto-saves
  serialize requests using the sheet revision, preserving typing during an
  in-flight save. Invalid cells stay visible and are not saved. A/مبرر sets a
  justified absence; Enter, Tab, arrows and Excel block paste are supported.
- Overview refreshes while visible, counts completion without Submit and groups
  remaining sheets by teacher. Phone layouts use class cards and one student at
  a time. Print includes current marks and blanks: all visible sheets from
  Overview, or all visible subjects of the selected class.
- Download for Massar generates the full Contrôle ZIP without locking. A signed
  receipt binds acceptance to the downloaded year, sheets and revisions. Only
  confirming acceptance locks them. Reopen is a management action; corrections
  retain the prior export record and show “changed after sending”.
- The acceptance question is retained in browser storage per account/year;
  unsaved cells are retained in tab storage per account/year/sheet. Restored
  drafts keep their old revision, so concurrent edits are still refused.
- The class and subject links (Réglages Massar) are their own page in the
  Académique menu, `/massar-settings`, for roles with `manage:massar`. The old
  `/massar/setup` URL redirects there.
- Old `/massar/rounds`, `/massar/sheets` and sheet detail URLs redirect to
  `/massar`. Existing REST/MCP read routes remain available.

Labels are resolved on the server from imported observations. Unseen primary
rounds use standard Arabic labels and show a notice; later collège rounds and
integrated activities still require matching imported evidence. Unmatched
students are added in School with their Massar code and correct class; Fix →
Check again restores their imported identities and order and creates waiting
sheets. Legacy imports that retained only codes need one re-import.

Optional due dates appear above the sheet and Overview. Today is orange;
unfinished sheets after the date are red, with overdue teachers first. The
server computes lateness from the school business date. Managers can change
or clear the date; passing it never locks entry.

## Single-page redesign verification (2026-11-06)

Focused tests cover page states, French/Arabic text, role controls, editable
paper, phone fields, due dates, sparse saves, typing during an in-flight request,
stale revisions, draft recovery, paste validation and keyboard movement. The
PostgreSQL workflow uses an outer rollback and includes pending-student
reconciliation, wrong-class refusal, original row order/hidden IDs, full-Control
download, acceptance and reopening. Lint, workspace typecheck, translations,
boundaries, full root tests, production build and authenticated security suites
all pass. The full root suite passes 2,727 tests (five skips); the final
focused suite passes 51 tests, including integrated-activity navigation. The
rolled-back PostgreSQL workflow passes 70 assertions; authenticated route and
refresh transport checks pass all 16 tests. The optional local golden workbook
test remains skipped without a samples directory.

Migrations `0103` (pending student details) and `0104` (optional due date) are
additive and preserve existing records. Each was verified on
`school_history_test` before applying the single reviewed migration to local
`school`. No new permission, external deployment, external Massar upload or
verification-flag change is included. The browser-control host was unavailable,
so live desktop/phone visual inspection and owner acceptance remain open.

Registrar, principal and admin defaults include all Massar permissions. Teachers
get read and mark entry for their exact assignments. Supervisors get reads for
currently supervised classes. Monitors have no Massar access: no ownership
rule and no default grant (decided 2026-11-06).

## Verified locally

| Check | Result |
| --- | --- |
| Workbook components (1, 6, 9, 13), exact labels, numeric/text metadata, /10 and /20, marks, absences, validation ranges | Passed |
| Merges, hidden dimensions, styles, conditional formatting, protection, print area, no template student leakage | Passed |
| Local golden comparison against clean real exports, regenerated from a different workbook | Passed; originals stay outside the repo |
| Import preview/commit, replay refusal, code-only matching, merge preservation, year isolation | Passed in rolled-back `school_history_test` transactions |
| Teacher subject/section ownership, supervisor assignment expiry, family refusals | Passed against PostgreSQL |
| Arrival snapshots and hidden-ID completion on re-import, revision conflicts, submit/export locks, changed-after-export | Passed |
| Multipart preview, permission refusals, private storage, REST/MCP guard audit | Passed through authenticated transport |
| Dashboard permission/navigation variants, failed-load rendering, mark schemas | Passed |
| Shared four-language catalogs, lint, workspace types, full root tests, production build | Passed |
| Migration 0101 and Drizzle check | Unshipped 0102 merged into 0101; final schema already present locally; check passed |

No real workbook, student names, codes, credentials or school identifiers are
committed. The committed workbook is synthetic; its builder erases every cell
value and restores only an explicit synthetic allowlist.

## Review fixes (2026-11-06)

- Confirm/Cancel remove preview files after commit; template replacement removes
  the previous file. Failed commits remove the new template on rollback.
- Startup and five-minute maintenance sweeps remove expired previews and old
  unreferenced private files. Referenced templates across years and files less
  than one hour old are retained; storage failures are logged and retried.
- Unmatched students block only their class. Managers see its reason on the
  progress board; other classes create sheets, and repairing the class allows
  its missing sheets to be added to open rounds.
- Printable/empty downloads allow arrivals without hidden IDs. Filled export
  retains both the verification gate and the hidden-ID requirement.
- ZIP names use subject codes; progress uses owned, year-scoped database counts.
  Spreadsheet/text writes are confined to Massar storage. Migration 0102 is
  folded into 0101, and edited files with unsupported dimensions get a layout
  message. The optional golden test skips folders without enough clean files.

Regression checks include storage cleanup after commit/rollback/cancellation,
runtime expiry cleanup, actual generic-upload refusals, class isolation and
repair against PostgreSQL, zero-mark counts, and printable arrival downloads.

Review validation: 38 focused Massar tests, one rolled-back database workflow,
296 security tests, 197 ownership tests, 22 i18n tests, and 16 authenticated
transport tests passed. The full root test run passed 2,702 tests; the added
cleanup-failure and translated-notice checks also passed separately. Lint,
workspace typecheck, translation scan, migration metadata checks and the final
production build passed.
An empty local sample folder was verified to skip the optional golden test.

## Reproduce

```powershell
bun run test:massar
bun run test:ownership
bun run test:security
bun run test:security:transport
bun run test:massar:db
bun run i18n:check
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:check
```

The database acceptance command requires `SCHOOL_HISTORY_TEST_DB_URL` in the
existing env file and refuses every target except local `school_history_test`.
It rolls back its synthetic records. To update that fixture's schema:

```powershell
bun --env-file=apps/dashboard/.env.local packages/server/tests/massar/migrateFixture.ts
```

For the optional local golden test, point `MASSAR_SAMPLES` at a directory of
local workbooks, then run the workbook test. Every clean `NotesCC` workbook must
parse and regenerate successfully; other spreadsheets and encrypted files are
excluded. A folder with fewer than two clean exports skips the golden test.
Never copy those originals into the repo.

```powershell
$env:MASSAR_SAMPLES = 'C:/path/to/local/samples'
bun test packages/server/tests/massar/workbook.test.ts
```

## External checks still open

1. Import one generated filled workbook into Massar and verify the marks there.
   Keep `MASSAR_FILLED_EXPORT_VERIFIED` unset until that succeeds; then set it
   to `true` in the existing env file and restart the app.
2. Verify a filled student row without a hidden ID. Until then, re-import
   arrivals before filled export. Printable/empty sheets work without re-upload.
3. Import matching evidence before generating later collège assessments or
   integrated activities. Unknown PE/Amazigh catalog entries are not invented.
4. Confirm the allowed decimal step.
   Entry currently follows Massar's observed decimal range without rounding.
5. Owner review of the dashboard at desktop and phone sizes, including Arabic.

No upload to the external Massar service or owner visual acceptance is claimed.
