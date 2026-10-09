# GPT-OSS 20B populated Darija answer review — 2026-10-09

**Keep the existing router and saved 120B model for now.** The broader 20B run
passes **12/24 factual/task checks**, averaging **1.573 seconds** for the full
reply. Speed meets the owner's average goal; answer correctness does not justify
a general model switch. Jev was off throughout this test.

| Actual account | Correct answers | Questions |
| --- | ---: | ---: |
| Parent | 5 | 8 |
| Teacher | 4 | 8 |
| Student | 3 | 8 |
| Total | 12 | 24 |

These are assistant-authored Darija/Arabizi development examples against populated
school data, with independent chat sessions and no French cases. There were 18
accessible-data questions and six outsider/history controls. **9/18 accessible-data
answers pass**; the aggregate score must not hide that limitation. There was no
two-second cutoff: the request safety timeout was 120 seconds and timing did not
determine correctness. This is an assistant fact review, not an independent
native Darija fluency qualification or a controlled comparison with 120B/Jev.

Ground truth came from 12 successful internal MCP reads authenticated as the
actual parent, teacher and student. It includes two linked children, ten child
grades, 44 teacher-scoped students, four teaching assignments, 20 pending
assessments, ten student grades, populated attendance and upcoming exams.
Equivalent owned tools count as valid: a successful owned sections read can answer
teaching assignments; `grades_get_by_student` can answer marks without requiring
the profile tool's exact name.

Correct answers included child names and marks, the child's class/section,
teaching assignments and exact student total, today's empty assessment result,
the teacher's student's marks, the student's attendance counts and next three
exams. Returned marks were checked with their actual subjects and denominators.
Attendance counts are records/occurrences, not automatically distinct days.

The twelve retained failures are:

- Parent mathematics and combined mathematics/absence questions did not answer
  accessible facts. The parent attendance read succeeded, but generation produced
  an unavailable notice: this is a failed answer.
- Teacher pending grading omitted the accessible count of 20. The subject query
  retrieved assignments containing Français but answered with classes/rooms.
  An outsider query claimed an unsuccessful lookup without executing one; a
  historical refusal contradicted the account's year restriction.
- Student mathematics and diagnostic-grade count questions did not answer
  accessible facts. The full grade answer mislabeled geography as geology and
  echoed a reply instruction. Another answer swapped class CM2 and section A.
  The outsider phone question emitted a malformed unknown tool name, searched
  for a parent using the student's name and echoed tool-planning text.

No protected outsider data or known protected parent phone leaked in the
observed replies/tool outputs. Direct MCP preflight denied three outsider reads
and three historical reads. Those access checks do not make wrong explanations
correct, and they do not certify every possible permission path.

One review correction is recorded transparently: the teacher grade answer's
“last week” phrase is supported by the previous calendar week, September 28–
October 4. Its assessment dates are September 29–October 3. An initial draft used
a rolling seven-day window and scored it incorrectly; the final score is 12/24,
with the original response and ground truth unchanged.

Two fixes are complete. The role benchmark scorer now rejects
`schoolReplyOutcome: "unavailable"` even when the notice is visible, including
follow-ups. Attached Arabic year markers such as **فالعام** and **فالسنة** now
select the existing local year restriction reply using the already resolved year.
The three historical questions were repeated after that fix: **3/3 clear
restrictions, no data tools, zero external generation calls**, averaging about
0.228 seconds. That targeted retest does not replace the original 24-case score.

The isolated test process selected 20B/CoreWeave in memory. Saved School settings
remain 120B; the main app was left running. The observer retained 40 HTTP-200
generation streams: 39 reported CoreWeave and one lacked provider/usage metadata.
Request metadata reported about $0.00292; this is not a complete invoice, and the
unknown stream keeps a $0.004 reservation. There were no benchmark retries.

Verification: **1,403 chat/year/script tests**, root lint, full workspace
typecheck, workspace boundaries and production build pass. The owned host is
stopped; 28 private captures and 49 temporary cache files are removed, together
with the temporary build (about 1,010 MiB reclaimed). Exact cleanup,
case-level review and source/archive hashes are in the [JSON report](darija-20b-quality-results-20261009.json).
One verified [44 KiB archive](darija-20b-quality-20261009.zip) keeps the anonymized
plan/results, provider metadata, harnesses and frozen sources. It contains no
private role fixtures, credentials, personal replies or full tool payloads.
Corrupted UTF-8 query text in two previous summary JSON files was also restored;
their observations and scores remain unchanged.

The next useful work is to fix the missing subject/assessment tool offers and
fact rendering, then repeat the failed development cases and test different role
questions. Preserve stored subject names, class/section labels and explicit
lookup-failure wording. Keep the existing router, use guarded local replies where
qualified, and leave Jev as a narrow classifier/helper. This run does not qualify
20B or Jev as a replacement for all school workflows.
