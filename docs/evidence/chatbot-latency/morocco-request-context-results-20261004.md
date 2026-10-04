# Darija, Arabic and French reply fixes — 2026-10-04

The six genuine text failures from the previous Morocco report are resolved in
the frozen 30-question validation. GPT-OSS 120B remains configured; this experiment
did not change model settings or school-domain data.

The full run completed 30/30 replies. Its original automatic score is **29/30**:
the detector missed the attached Darija prefix in `فهاد العام`. A regression test
and retained [offline audit](morocco-context30-language-audit-20261004.json) correct
exactly that sample to **30/30**, retaining the original tool, argument, fact and
write checks. Raw reports are unchanged. All three exam answers show five
chronological rows with the correct dates, times, classes and sections. All three
multi-count answers contain both correct counts and execute both reads.

Attendance refusals were then made explicitly about attendance rather than a
generic change. The final [six-request recheck](morocco-context6-final-20261004.json)
passes **6/6**: attendance writes in Darija, formal Arabic and French, followed by
the three unchanged general exam questions. Each refusal contains two sentences,
clearly explains that attendance cannot be recorded/changed here, and points to
the attendance page. There are no student lookup calls, ID/confirmation requests,
write promises, false write claims or executed writes in these attendance samples.

| Language | Full-run completion median | Full-run exam completion | Final exam recheck |
|---|---:|---:|---:|
| French | 7.356 s | 37.036 s | 10.302 s |
| Formal Arabic | 5.264 s | 34.710 s | 12.722 s |
| Darija | 5.672 s | 12.135 s | 16.791 s |

Overall full-run completion p50/p95 is **6.799/34.710 seconds**, first text
**4.965/24.985 seconds**; embedding median is about **0.19 seconds**. The previous
Morocco run observed completion 11.847/33.433 and first text 9.208/28.215 seconds.
The lower observed median does not establish a causal speed improvement: that
earlier run had concurrent source edits, and provider routing/load/prompt caching
remain uncontrolled. The long French/Arabic exam samples are retained. The model
continues to dominate latency; three quicker rechecks do not establish reliable
exam latency or a production SLA.

## Implementation

`schoolReplyContext.ts` selects a conservative request-specific language hint
from the user's wording, ignoring quoted announcement bodies and preserving
stored names. Only the selected language's refusal example is sent. Generic
upcoming-exam questions receive the next-five reminder; two-count questions get
the two-read reminder. Attendance write verbs are matched as complete words so
read requests mentioning `سجلات الحضور` are not mistaken for writes. Unknown
languages retain the existing system language policy.

`SchoolChatContextProvider` appends these hints through the published context
provider contract, preserving year/actor context, knowledge and its trace. No
extra embedding, translation or model call is introduced. The stable system
prompt removes repeated cross-language examples. Its text is 4,843 characters;
this is a character count, not a measured token saving.
The runner records context-provider/helper source hashes in addition to prompt,
scorer and corpus hashes.

This use of concise, aligned instructions/examples follows
[official OpenAI reasoning guidance](https://developers.openai.com/api/docs/guides/reasoning-best-practices);
the language heuristics and measured results are School's implementation and
evidence, not an official model guarantee.

## Conditions and verification

Thirty full-corpus requests plus six final checks: **36 paid outer requests**,
no paid warmups. Every sample has matching GPT-OSS model/server/embedding
diagnostics and verified fresh application-cache conditions. Total installed
SDK token-cost estimate is about **$0.00743**, not a provider invoice. Separate
client-estimate limits were $0.50 and $0.15 with $0.01 request reservations.

Code ran in `%TEMP%/school-morocco-request-context-20261004` with independently
installed published dependencies and workspace links, Node Next at 3169 and
separate development/build output. A fresh internal MCP/REST facts capture
matched the earlier nine classes, twelve upcoming exams and both counts exactly.
Preflight confirmed a null saved system prompt, so the configured default applies;
[postflight](morocco-context-postflight-20261004.json) confirms GPT-OSS retained.
Initial development readiness/HMR failures sent no provider requests and are not
latency samples. Only this experiment's dev process is stopped after verification.

Verification: 104 focused tests, the updated 34-case reply-context subset,
benchmark CLI integration tests, lint, production builds and the final full
workspace typecheck pass. Tests include all 30 real queries,
mixed/quoted names, full-exam requests, single/both-count requests, native prefixes,
attendance reads versus writes, and preservation of knowledge/year context.

Coverage is admin-only, single-turn and serial. Language/register scoring is
heuristic; these passing checks do not establish native fluency or broader role,
conversation, production or concurrent-load correctness. Faster-model adoption
remains separate from this current-model validation.

Evidence: [full raw run](morocco-context30-20261004.json),
[final raw recheck](morocco-context6-final-20261004.json),
[facts](morocco-context-facts-20261004.json),
[experiment plan](morocco-request-context-plan-20261004.md).
