# Teachers: development browser batch

Target: **http://127.0.0.1:3102**, the existing demo, year **2026-2027**.
The accepted working-tree checks contain **58 PASS and 2 FAIL**.
No deployment was triggered.

An identity-only edit could invent teaching assignments. With Maths in section
A and French in section B of the same class, the repository returned both
section IDs and both subject IDs as a single group. The wizard submitted their
cross product, creating A/French and B/Maths too. The
[before-fix browser reproduction](teachers-edit-before.json) records two pairs
becoming four after a normal name edit.

The repository now groups subjects by class **and section**. The
[browser retest](teachers-edit-after.json) preserves exactly the original two
pairs. A PostgreSQL regression test on the guarded local `school_history_test`
fixture expands the real query response and resubmits it through the actual
repository-backed assignment replacement method. It checks exact pairs and
rolls back all fixture changes. The other assignment-year and ownership tests
in that file also pass.

| Journey | Assertions | Evidence |
| --- | --- | --- |
| Three-step creation, validation and linked staff identity | 8 PASS, 1 FAIL | [Creation](teachers-create.json) |
| Identity edit preserves exact assignment pairs | 5 PASS | [Edit after fix](teachers-edit-after.json) |
| Bulk section assignment, details, reload and reference conflict | 7 PASS | [Assignments](teachers-assignments.json) |
| Filters, keyboard card navigation, French/Arabic phone details | 15 PASS, 1 FAIL | [Read checks](teachers-read.json) |
| Duplicate identity and actual denied-role mutations | 11 PASS | [Refusals](teachers-refusals.json) |
| Clear assignments, cancel/delete, exact chain cleanup | 12 PASS | [Cleanup](teachers-cleanup.json) |

The browser created one teacher with one linked staff member and a pending
login invitation using the local console provider. Salary, identity and the
initial assignment survived reload. No external email delivery is claimed.
The wizard's assignment controls added English to sections B and C, producing
exactly four intended assignment rows, each shown once in profile details.
The standalone `BulkAssignmentForm` component is not mounted by a route; the
exposed wizard supports selecting multiple sections and subjects.

Deleting a teacher with assignments returned 409 with translated guidance and
preserved all four rows. The browser then removed every assignment through the
edit wizard and saved an empty list. Cancelling deletion kept the teacher.
Confirming deletion removed the exact teacher, linked staff and login; all
three detail endpoints returned 404. Final list scans found no owned teacher,
staff or login residue. The separate denied account was also removed.

Duplicate CIN creation created no teacher or staff. A separately authenticated
account confirmed as teacher could neither read this unowned teacher nor edit,
delete or assign subjects to it. The target identity and four assignments
remained unchanged.

Two shared Najm failures remain:

- [Previous discards the current step's unsubmitted draft](shared-wizard-draft.md).
- No-match card filtering leaves a blank area, the same
  [shared empty-state failure](../2026-10-18-users/shared-table-empty-state.md)
  already recorded for Users and Staff. Positive name/email/status filtering
  and clearing the filter pass.

| Development checklist case | Result |
| --- | --- |
| teachers-R01 | PARTIAL: positive filters and assignment/detail consistency pass; no-match feedback fails |
| teachers-M01 | PASS for saved creation/edit and linked identity; shared unsaved-draft failure remains separately recorded |
| teachers-M02 | PASS for exposed wizard assignment controls, bulk section selection and exact relationship preservation |
| teachers-M03 | PASS |

[Validation](validation.json) records four PostgreSQL tests, 39 focused teacher
tests, lint, full root type checks and a production build in a separate output
directory, all passing. Source fingerprints identify this mutable working
tree. Accepted admin browser reports have no unhandled page errors or HTTP
error responses; deliberate API refusals are recorded separately. Initial
[browser attempts](browser-attempts.json) remain unaccepted. Avatar uploads,
complete accessibility/security matrices, real invitation delivery and
production acceptance remain unverified. Production checkboxes are unchanged.
