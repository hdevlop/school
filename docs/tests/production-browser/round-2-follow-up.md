# Round 2 follow-up — 2026-10-21

These are user-reported browser results and local source fixes. They do not
replace the serving-revision evidence in the individual feature guides.

## User-reported results

- Expenses: creation, validation and approval worked.
- Teacher assignments: class, section and subject assignment worked.
- Assessments: creation worked.
- Grades: saving worked and Highest/Lowest/Pass-rate updated.
- Calendar: event creation worked.
- Subjects: 10 pre-seeded subjects were present.

## Follow-up changes

- Dashboard expenses are cash out: paid expenses plus paid payroll. Approval
  alone is excluded. The cards and trend legend now say paid expenses, and
  the expense card explains the inclusion rule. The financial calculation
  remains the existing cash calculation.
- Assessment teacher options require an assignment to the chosen subject in
  **every** selected section of the selected class. A teacher selection that
  becomes incompatible is cleared. An empty selection says “A teacher is
  required”. Passing marks above total marks produce an inline field error,
  rechecked when either mark field changes.
- Grade edits show an unsaved indicator and an explicit “Save grades” button.
  Statistics describe saved grades. Drafts stay in this browser tab, scoped by
  account, academic year, source type, source ID and section. Reopening the
  same roster restores the draft; it does not apply it to another roster.
  Successful saving or “Reset changes” clears that roster's draft. Draft
  retention across reload requires available session storage.

## Verification and remaining browser acceptance

- PASS: 40 focused tests covering assessment options, eligibility and validation,
  grade schemas and draft isolation/restore/clear, and finance dashboard cash rules.
- PASS: dashboard type-check, root lint, and translation-key check in four locales.
- PASS: production build and local app health (`HTTP 200`).
- Initial development browser retest: **38 PASS, 1 visual FAIL**, using standalone
  Playwright at the user's request. See [browser evidence](../../evidence/development-browser/2026-10-21-round-2/README.md).
  Functional checks passed; phone grade-stat labels overlap beside Save/Reset.
- Phone grade-stat overlap is now fixed. The [follow-up](../../evidence/development-browser/2026-10-21-round-2/grade-toolbar-fix.md)
  passed **53 browser checks**, including four languages at five widths with
  saved and unsaved states, and the grade save/update workflow.
- Production deployment and acceptance of these local fixes: NOT RUN.

The development retest exercised teacher filtering with multiple sections and
different subjects, passing-mark revalidation, and grade drafts through reload,
navigation, source switching, reset, create/save and update/save. Assessment
validation and dashboard labels passed in four languages at desktop and phone
widths. An owned approved 150 dh expense did not change paid-expense totals.
All owned fixtures were removed. The phone grade-stat correction and grade
layout locale matrix passed the follow-up. An expense-payment mutation and
production acceptance remain unperformed by this retest.
