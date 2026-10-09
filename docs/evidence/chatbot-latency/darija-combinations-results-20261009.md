# Darija: Jev and router + GPT-OSS 20B comparison

**The best next candidate is guarded Jev first, with the existing router + 20B
as fallback for supported workflows.** This run does not justify replacing the
production model across the school. The two Jev paths tie on tool selection;
their remaining fallback answers still have correctness problems.

| Path | Correct tool plans | Average complete reply | Direct Jev replies | 20B replies |
| --- | ---: | ---: | ---: | ---: |
| Existing router → 20B | 14/20 | 1.242 s | 0 | 18 |
| Jev first → router/20B fallback | 17/20 | 1.247 s | 4 | 14 |
| Router first → Jev or 20B | 17/20 | 1.174 s | 4 | 14 |

Each path also had two local write refusals. All paths meet the owner's average
two-second goal on this sample; timing did not determine correctness, and no
two-second cutoff was applied. These are **60 actual authenticated chats on the
same 20 Darija/Arabizi questions**, not 60 independent questions. There were no
French cases, automatic retries or repeated failed requests.

## What improved, and what still fails

Jev directly answered student count, both combined student/teacher count variants
and today's student-attendance query in each hybrid path. **All eight selected
Jev answers used the correct tools and matched independent fixture ground truth.**
No wrong Jev plan passed the guard. This is narrow coverage: each hybrid made
16 classifier calls but only selected four Jev replies.

Both hybrid paths avoided a malformed count-tool call seen in router + 20B.
The ordinary path eventually returned the right counts, but its invalid call
remains a failed tool plan. One ordinary teacher-count answer also called the
student-count tool without being asked; the strict plan score retains that extra
call as a failure.

All three paths returned section labels A/B instead of the class identity for
the Arabic class-list case. The frozen expected intent is `classes_list`; native
class/section terminology remains reviewable. The Arabizi class-list counterpart
read the correct classes, but wording included wrong entity labels or an English
planning echo. Correct returned class values do not certify natural Darija.

Filtered fifth-class counts and daughter-grade questions still fail on fallback:
one path chose an arbitrary section and an unrequested girls filter; another
treated the word “daughter” as a student search name. Grade reads without a
student identity raised input errors, then the replies incorrectly described
those errors as a missing tool or permission. Other visible answer problems
included a grades question answered as attendance, a today-only read described
as a whole-year result, and an unresolved class presented as zero students.
The ambiguous Arabizi control received French or English in two paths.

**17/20 is a tool-plan score, not 17 fully accepted answers.** All 60 replies were
reviewed for those visible fact, scope and task issues. Per-case observations and
flags are in the [JSON report](darija-combinations-results-20261009.json).
Independent native fluency and populated personal-role acceptance are not claimed.

## Method and limits

The test reused ten assistant-authored paired families from the saved fresh
Darija corpus, with one observation per path/question and rotating serial order.
It ran the actual School endpoint, published SDK, router, MCP execution, year
scope and Jev guard/profile 6. A separate process used the existing marked local
administrator fixture: eight students, zero teachers, one class, two sections,
no current attendance records and no upcoming exams. Ground truth came from
authenticated internal MCP reads before the chats.

That fixture has no explicitly identified fifth class or linked daughter context.
The expected response is class discovery followed by clarification when needed,
and identity clarification before personal-grade reads. This is not a test of
populated parent, teacher or student accounts. The separate
[populated 20B report](darija-20b-quality-results-20261009.md) still records 12/24
factual/task passes; this new administrative comparison does not supersede it.
Stochastic fallback differences do not prove that scheduling caused those errors.

The candidate safety timeout was **3,000 ms**, rather than the default 800 ms;
the chat safety timeout was 120 seconds. No candidate timed out. Model/key settings
were overridden only in the test process's memory. Saved settings and the normal
app's production model/Jev mode were unchanged.

All 87 generation responses were observed as `openai/gpt-oss-20b` on CoreWeave.
Serial response ordering and input/output token counts matched all 87 SDK steps.
Reported generation usage cost was $0.0068858 and Jev response cost $0.001359456:
**$0.008245256 for all 60 chats, excluding routing embeddings**. SDK price-table
estimates were lower and are recorded separately. This is request-response cost,
not a monthly invoice projection; no further billing experiment was needed.

## What to do next

Use this conditional flow:

1. Serve a validated local reply when available, including read-only write refusals.
2. Send supported whole-school requests to guarded Jev; execute only an accepted
   plan through the existing authorized MCP path and render the result.
3. Keep the existing router and LLM fallback for declined or unsupported requests.
   Skip requests known to be unsupported before making a paid Jev call.

For example, “شحال كاينين ديال التلاميذ كاملين؟” can use Jev, the authorized student
count and a short template. “وريني نقط بنتي” first needs the right child identity;
Jev's whole-school intent menu does not solve that personal flow.

Jev-first is the simpler candidate and was also ahead in the saved larger
development comparison; the present 17/20 tie establishes no universal ordering
winner. The unsupported-query skip is a **next implementation**, not a measured
feature in this run. Repair class/section resolution and daughter-identity handling,
then recheck only those failing Darija families with populated data. Keep current
production settings until that answer-quality check passes; do not rerun the whole
comparison simply to chase milliseconds.

## Verification and retention

70 relevant regression tests passed with zero failures. No production source was
changed, so a new production build was unnecessary. The compact archive
[preserves observations, the frozen plan and sources](darija-combinations-20261009.zip)
without credentials, private tool payloads or personal record identifiers.
Entry hashes and cleanup status are recorded in the JSON report.
The test host is stopped, all 62 private captures and 75 temporary cache files
are removed, and the normal app remains running. No temporary Next build was
created. The archive occupies 40 KiB; intermediate evidence was not left as
dozens of project files.
