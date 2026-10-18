# Students: development browser batch

Target: **http://127.0.0.1:3102**, the existing local demo, year **2026-2027**.
No deployment was triggered. The recorded working-tree checks contain
**75 PASS and 1 FAIL**.

The API previously accepted empty and whitespace-only student codes and stored
them as unique identifiers. Both disposable probes were removed. The form and
server DTO now trim codes and require a nonblank value. The
[before](student-code-before.json) and [after](student-code-after.json) MCP
probes, browser validation and real REST refusals verify the change.

| Journey | Assertions | Evidence |
| --- | --- | --- |
| Three-step form, validation and backward navigation | 5 PASS | [Wizard](students-wizard.json) |
| Reload and exact nested relationships | 5 PASS | [Saved creation](students-verify-create.json) |
| Identity editing, dated section transfer and cancelled deletion | 8 PASS | [Edit and transfer](students-edit.json) |
| Desktop table, filters, French/Arabic phone cards and direction | 22 PASS, 1 FAIL | [Read checks](students-read.json) |
| Empty, whitespace and duplicate submissions | 10 PASS | [Refusals](students-refusals.json) |
| Unassigned teacher ownership and mutation denial | 13 PASS | [Access](students-access.json) |
| Browser deletion and exact fixture cleanup | 12 PASS | [Cleanup](students-cleanup.json) |

The full form created one student, one parent link and one registration fee
of 50 MAD with no payment. No student or parent login account was created.
Identity editing preserved the complete enrollment history. The supported
transfer workflow closed section A on 2026-10-02 and opened section B on that
date, retaining admission on 2026-10-01 and the placement actor audit.
Cancelled deletion preserved the student. After removing the owned unpaid fee,
the browser deleted the student; its parent link disappeared and the unlinked
owned parent was removed through MCP. Final residue checks found no owned
student or parent; student detail returned 404 and the owned fee was unavailable.
The temporary teacher account was also deleted.

REST refused empty/whitespace codes with 400 and the French message
`Obligatoire`; duplicate and padded duplicate codes returned 409. Student and
parent counts stayed unchanged, and a refused blank-code edit preserved the
saved identity. An authenticated account confirmed as teacher had an empty
owned roster, received 404 for this unassigned student's detail/update and 403
for create/delete/enrollment history, and saw no browser create action.

The remaining failure is the
[shared class-filter accessible name](shared-class-filter-label.md).
Functional class/section filtering passes. Unlike the previously recorded
Users/Staff empty-state failure, Students supplies its controlled filtered-empty
flag and shows translated no-match feedback in the tested views.

| Development checklist case | Result |
| --- | --- |
| students-R01 | PASS for functional filters and consistent table/phone identity; shared filter accessibility failure recorded separately |
| students-R02 | PASS |
| students-M01 | PASS |
| students-M02 | PASS for identity and dated transfer; optional avatar upload not included |
| students-M03 | PASS |

[Earlier attempts](browser-attempts.json) retain harness failures without
counting them as product passes. The creation request succeeded once; its first
post-save harness expected a fee array instead of the real response object's
`fees` property. A corrected continuation verified the same record without
creating another. Accepted admin browser reports have no unhandled page errors
or HTTP error responses. Deliberate API refusals are recorded separately.

[Validation](validation.json) records passing focused tests, lint, root type
checks, 530 configuration tests, 17 server translation tests and a production
build in a separate output directory. Source fingerprints identify the mutable
working tree. Avatar handling, complete accessibility/security matrices and
production acceptance remain unverified. Production checkboxes are unchanged.
