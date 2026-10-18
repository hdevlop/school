# Exams, assessments and timetables: development browser batch

Later development follow-ups close this batch's specific shared empty-search
failures ([shared UI](../2026-10-18-shared-ui-recheck/README.md)), exam date-label
comparison and native browser 200% zoom gaps
([remaining reads](../2026-10-18-remaining-read-checks/README.md)). The original
execution counts and other limitations below are preserved.

Target: **http://127.0.0.1:3102**, existing local demo, year **2026-2027**.
Accepted reports contain **186 PASS and 2 FAIL assertions**, including 61 cleanup
and residue assertions. These are development results; production cases remain
unchanged. No deployment was triggered by this batch.

Three School defects were fixed and retested:

- A partial exam update could set the end before the stored start. The validator
  now combines supplied times with their saved counterparts before validating.
  Clearing an optional time and unrelated edits remain supported. The
  [before probe](learning-refusals-before.json) records the invalid persisted
  interval; the [after probe](learning-refusals-after.json) records refusal and
  unchanged valid values. Four focused regression tests cover both partial
  directions, equality, clearing and replacing both times.
- Teacher timetable phone tabs exposed abbreviated weekday names. They now
  expose the full translated weekday through `aria-label`. The
  [before report](learning-routine-views-before-day-label.json) retains the
  Arabic named-tab failure; the [retest](learning-routine-views.json) passes.
- Long class names overflowed adjacent teacher timetable cells. The class name
  now has a bounded width and retains its complete identity in `title`.
  [Before](learning-long-label-before.json), the label was 200.27 px inside a
  173.33 px cell; [after](learning-long-label-after.json), it was 152.33 px.
  Both views were inspected visually using a disposable lesson.

| Journey | Accepted assertions | Evidence |
| --- | --- | --- |
| Exam and assessment form creation, editing, reload and exact section targets | 16 PASS | [Forms](learning-forms.json) |
| Invalid scores, durations, relationships and partial exam times | 13 PASS | [API refusals](learning-refusals-after.json) |
| Plain, ordered fixed, alternative and mixed lessons; group limits and preview | 14 PASS | [Timetable editor](learning-routines-ui.json) |
| Parent-field preservation, teacher overlap and invalid layout/content | 7 PASS | [Conflicts](learning-routines-conflicts.json) |
| Two browser editors, stale replacement/deletion and winning content | 4 PASS | [Stale editors](learning-stale-editors.json) |
| Break duty, layout remapping and protection of occupied periods | 11 PASS | [Duty and layout](learning-duty-layout.json) |
| Filters, details, French/Arabic phone and RTL | 26 PASS, 2 FAIL | [Read checks](learning-read.json) |
| Light/dark, keyboard, emulated touch, CSS zoom and teacher profile view | 19 PASS | [Views](learning-routine-views.json) |
| Actual denied parent role and nine refused mutations | 13 PASS | [Access](learning-access.json) |
| Actionable invalid-score feedback, cancelled/confirmed deletion and cleanup | 36 PASS | [Main cleanup](learning-cleanup.json) |
| Long class text bounds and preserved full title | 2 PASS | [Label retest](learning-long-label-after.json) |
| Disposable visual lesson and teacher chain cleanup | 10 PASS | [Visual cleanup](learning-visual-cleanup.json) |
| Independent final residue reads | 15 PASS | [Residue audit](learning-residue-audit.json) |

Browser creation produced one exam and one assessment, each targeting exactly
two sections. Reopening and editing preserved both targets, scoring and
duration. Invalid browser scoring returned 400 with guidance and kept the form
available for correction. API relationship refusals returned 404; invalid
scores/durations returned 400 without changing the saved targets or score.
The separate denied account's actual parent role was verified before its nine
POST/PUT/DELETE requests returned 403. It was removed afterward.

The timetable editor saved and reopened zero-content plain lessons, ordered
three-label groups, alternative pairs and mixed groups. Conversion, reordering,
removal and six-group limits preserved saved content. Whole-period teacher
overlap returned 409. Two actual browser pages opened the same lesson version;
after one saved, the other's replacement and deletion returned 409, showed
actionable feedback and preserved the winner. Period replacement remapped
lesson references while preserving all five lessons and break supervision.
Removing occupied periods was refused.

Two checks remain failed: no-match translated feedback on the Exams and
Assessments tables, the previously recorded
[shared table defect](../2026-10-18-users/shared-table-empty-state.md).
Positive filters, recovery and the class filters' accessible names passed on
these pages. The [Najm skill](../../../../.agents/skills/najm/SKILL.md) says
"Najm source is read-only reference" and "School pins published versions".
The shared defect requires a published Najm fix and consumer retest; this
batch did not modify the reference checkout or introduce a second table owner.

| Development checklist case | Result |
| --- | --- |
| exams-R01 | PARTIAL: filter/type/status/section/phone checks pass; no-match feedback fails and date-label comparison was not independently asserted |
| exams-M01, exams-M02 | PASS |
| assessments-R01 | PARTIAL: filters and saved relationships pass; no-match feedback fails |
| assessments-M01, assessments-M02 | PASS |
| class-routines-R01 | PASS: class view and teacher profile timetable, matching five lessons; admin session |
| class-routines-R02 | PARTIAL: long labels, French/Arabic, both themes, keyboard and emulated touch pass; CSS 200% zoom passed, native browser zoom remains unverified |
| class-routines-M01, class-routines-M02, class-routines-M03, class-routines-M04 | PASS |

Cleanup is **PARTIAL**. Supported APIs removed both ungraded assessment/exam
records, all lessons and duties, both owned teacher/staff/login chains and the
unused third section. The denied login was also removed. Final reads confirm
zero retained lessons or duties, with the owned assessment/exam and teacher
chain details returning 404.

The API creates published schedules and permits deletion only for drafts. It
offers no transition back to draft. Consequently **three empty archived
timetables, 21 periods, two sections and one class remain**. The class and
sections are referenced by those schedules. No direct SQL or reset bypass was
used. No student, parent record, fee, payment or invitation was created for this
batch; the disposable login accounts were given private passwords.

[Validation](validation.json) records source hashes and passing focused tests,
15 routine tests, 18 server translation tests, 538 configuration tests, root
type checks, final lint and final production build. The build used a fresh
separate output directory and preserved the running dev output. The working
tree contains concurrent work, so its HEAD and hashes are a snapshot rather
than a released revision. [Harness attempts](browser-attempts.json) and
before-fix reports are excluded from accepted totals.

Accepted normal browser journeys have no unhandled page errors. The cleanup
journey deliberately records two invalid-score 400 responses; stale-editor
409s are expected refusals. Phone checks used Chrome touch emulation at
390 × 844. Physical devices, native browser zoom, the full accessibility matrix,
teacher-login browser acceptance and database migration/concurrency guarantees
remain unverified. Production checkboxes were not ticked by these dev results.
