# Independent question review

For the owner's current workflow, use the
[Darija wording draft](jev-operator-darija-review.md): reply “all OK” or provide
numbered wording corrections. The owner has waived independent native labeling
for that alternative; the assistant supplies provisional labels. The instructions
below apply to optional independent native-evidence review, not to the current
wording check.

Use only the v3 worksheet and this guide. The collection operator retains the
original intake, initial labels and classifier predictions. Review what the
question asks the assistant to do, using the question's own text. Keep spelling,
question text, declared language, opaque IDs/families and hashes unchanged.

| Intent | Meaning |
|---|---|
| `small_talk` | Greeting, thanks, goodbye or a capabilities question, with no school-data request. |
| `student_count` | One total of students for the whole school in the selected/current year; no list, calculation, qualifier or other date. |
| `teacher_count` | One school-wide teacher total; no names/list or subject/class filter. |
| `student_and_teacher_count` | Both separate school-wide totals, students and teachers. A single computed sum needs the model. |
| `class_list` | School-wide class names/codes, optionally with their sections; no student/teacher details, timetable, filter or class-count calculation. |
| `attendance_today` | Today's school-wide student-attendance records/statuses; no particular class/student, other date, teacher attendance or calculated count/rate. |
| `upcoming_exams` | Upcoming school-wide exams, with no class/subject/student filter. Keep this label even though core acceptance excludes it. |
| `write_request` | Asks the assistant to persist a change now: create, record, mark, edit, publish, send or delete data. |
| `needs_llm` | Everything else: qualified/calculated counts, name lists, grades/fees, named lookups, how-to instructions, context-dependent follow-ups or unrelated requests. |

A request to display/read/count existing information stays read-only even when
phrased as an imperative. A polite question asking the assistant to make a change
still requests a write. Asking how to perform a change oneself is a how-to request.
Quoted command text and explicit negations require judging the enclosing request,
not copying the quoted operation. Chat policy may refuse mutations; the label
still describes the operation requested.

Fill only these fields after actual independent review:

- `intent`: one of the nine choices above.
- `isWrite`: `true` for `write_request`, otherwise `false`.
- `reviewerId`: your actual stable pseudonymous reviewer ID, different from the author.
- `reviewedAt`: actual completion time in UTC ISO format.
- `reviewStatus`: `agreed` when meaning is clear; `disputed` when unresolved.
- `reviewBlind`: `true` only if original labels/predictions were hidden during your review.

Leave unreviewed rows `pending` with null review fields. A disputed row can keep
null labels; it does not count as a successfully labeled held-out question. Ask
the operator to resolve ambiguity using actual source context without silently
rewriting the question or inventing a meaning. Row order can change; opaque IDs,
families, text and hashes must remain paired. The importer restores original IDs
and provenance and checks author/reviewer independence from the private intake.

These fields are declarations. The tools cannot authenticate people or prove
blindness or native fluency. Human review of an assistant draft retains assistant
authorship and does not make its questions native-authored acceptance evidence.
