# Round 2 Playwright retest

Tested on 2026-10-21 at `http://localhost:3102` with standalone Playwright and
Chrome 155.0.8059.86. Base revision:
`3aa3ca1693353387ba685e211e68fcdd86526527`, plus uncommitted changes recorded in
[source-fingerprint.json](source-fingerprint.json). These are development results;
production deployment and acceptance were not exercised.

Initial result: **38 PASS, 1 FAIL**, recorded in [results.json](results.json).
No application source was changed during this retest.

The phone-statistics failure was subsequently fixed. The [correction and retest](grade-toolbar-fix.md)
records **53 PASS, 0 FAIL**, including the four-language grade toolbar matrix.

| Area | Result |
| --- | --- |
| Assessment teacher filtering | PASS: one eligible teacher out of 13 for the selected section/subject; changing subject clears an incompatible teacher. Selecting an additional section with no common teacher produces no teacher options. |
| Missing teacher | PASS: the form displays “A teacher is required” inline. Invalid submission sends no assessment write request. |
| Passing marks | PASS: 21/20 produces inline feedback before submission; increasing total marks to 30 clears it. |
| Assessment locale/layout matrix | PASS: inline validation, language, direction and dialog width in English, French, Arabic and Spanish, at 1440 × 1000 and 390 × 844. |
| Dashboard labels | PASS: paid-expense label and explanation in all four languages and both viewports. |
| Approved 150 dh expense | PASS: a disposable expense was created and approved through supported REST routes. Monthly and yearly paid-expense totals remained unchanged; the dashboard explains that approval alone is excluded. The owned expense was deleted afterward. No expense payment was recorded. |
| Grade draft | PASS: entering 15/20 displays Unsaved and enables the labeled Save grades button without writing a grade. Saved statistics remain unchanged until saving. |
| Draft retention | PASS: reload, navigation away/back and switching assessment sources retain the draft only for its original roster. Reset clears it without creating a grade. |
| New grade save | PASS: Save persists exactly one grade, removes Unsaved, and produces 75% highest/lowest and 100% pass rate. Reopening confirms persistence. |
| Existing grade update | PASS: saving 16/20 persists the update and changes the stats to 80%. |
| Phone grade controls | PASS: entering a mark displays Unsaved; Save grades and Reset changes remain available. |
| Phone grade statistics | **FAIL**: with pending edits, the three statistics share approximately 96 px beside the labeled action buttons. Individual labels need 55–64 px but each stat receives only 32 px, causing visible overlap. |
| Runtime errors | PASS: no unhandled page errors in the completed assessment, grades and locale/viewport checks. |

## Original visual defect (resolved in follow-up)

[Phone grade toolbar screenshot](grade-header-phone.png), cropped to exclude
student records. The label bounding boxes extend outside their stat containers
even though the overall toolbar fits inside the viewport. An outer-overflow
check alone does not accept this layout.

The relevant layout is in
`apps/dashboard/src/features/Grades/components/GradesHeader.tsx`: the stat group
shrinks in the same wrapping flex row as Reset changes and Save grades.

## Fixture cleanup and proof limits

Only owned assessment/grade and expense fixtures were mutated. Supported delete
routes removed them. Subsequent supported list reads found zero owned assessment
and expense fixtures; the grade list returned its original count of 1,000.
No sessions, passwords, authentication tokens or raw personal-data responses
are retained in this evidence directory.

The locale matrix covers assessment validation and dashboard labels. Grade
save/update and the failing phone statistics screenshot were exercised in English.
This run does not accept a new expense payment, notification delivery, direct
database invariants, or production behavior.
