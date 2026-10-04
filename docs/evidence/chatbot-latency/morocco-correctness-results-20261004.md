# Morocco correctness checks — 2026-10-04

The default corpus covers all ten scenarios in Moroccan Darija, formal Arabic
and French (30 cases). Keep the saved GPT-OSS 120B route. The local checking
work is complete; the retained live replies still contain language/register
failures, so full current-model acceptance has not been achieved.

## Implemented checks

- Exam dates, times, class/section names and next-five ordering are bound to
  each captured school record. Swaps, extra/duplicate/missing rows and false
  total/remaining counts fail. Class lists require all exact section names.
- Exact stored French/English/Arabic names are exempt from language scoring.
  Prose in tables, parentheses and list descriptions remains checked. Mixed
  replies and mismatches between Darija and formal Arabic fail. Moroccan
  possessives such as `ديالي`, `ديالك` and `ديالنا` are recognized.
- Counts support Arabic digits, French/Arabic words and common Moroccan forms
  such as `طناش`, `حداش` and `تمنية`. A French article is distinguished from an
  explicit count claim such as “il reste un examen”.
- Internal MCP/REST captures decode UTF-8 explicitly. Fixtures are validated
  before provider calls, and reports record corpus/config/scoring hashes.

The checks cover the captured facts and supported formats. They do not prove
native fluency or every possible narrative claim. Saved diagnostics expose
failure codes and fixture indices rather than private expected values.

## Verification

The full script suite passed 198 tests. After the final Moroccan number-word
and possessive-form additions, the focused facts/language/regression/UTF-8
capture suite passed 51 tests (156 assertions). Lint passed after these edits.
Backend chat tests and production build also passed earlier in this work.
Concurrent changes outside this task are retained.

## Retained live runs

| Run | Requests | Result |
|---|---:|---|
| Initial default GPT-OSS | 60 | Raw 54/60; later bidirectional register audit finds additional defects |
| Corrected UTF-8 snapshot | 30 | One empty multi-count answer; one count-detector false flag subsequently fixed |
| Multi-count recheck | 30 | Raw 22/30; corrected offline review 24/30, six genuine defects |
| Frozen checkout | 6 of 30 | Interrupted by another runner changing the shared model to Nitro |

The first three raw reports remain unchanged. The
[register review](morocco-register-review-20261004.md) explains the corrected
offline scores. Source edits overlapped the third run, so it is not a frozen
timing baseline. The [six-sample frozen report](morocco-gptoss30-frozen-20261004.json)
records the model mismatch and unknown-cost stop; it is not a passing full run.
Its [source manifest](morocco-frozen-manifest-20261004.json) is retained.
This task sent 126 outer chat requests; no further calls were sent after the
shared-model collision. The task-owned port-3167 process was stopped and its
temporary env copy removed. No school-domain records were changed.

A separate concurrent task completed the
[30-pair default/Nitro comparison](tool-rename-nitro-full50-20261004.json):

| Route | Automatic passes | Completion median / p95 |
|---|---:|---:|
| Default GPT-OSS 120B | 27/30 | 8.18 / 39.38 seconds |
| GPT-OSS 120B Nitro | 24/30 | 0.88 / 3.15 seconds |

Both routes completed all replies and had zero structured fact flags in that
run. Remaining flags concern language/register. That comparison did not retain
answer text and used uncontrolled caches; its flags are unreviewed and its
timings are a small API-client sample, not a production SLA. See its
[tool-renaming review](cerebras-tool-prefix-20261004.md) for conditions.
The faster route is not accepted: it passed fewer checks.

A concurrent request-specific language-context correction is recorded in
[its experiment plan](morocco-request-context-plan-20261004.md). Its pending
validation must not be represented as an achieved all-pass result. Further
paid reruns require coordination because model settings are shared across
checkouts; a separate port alone does not isolate the selected model.
