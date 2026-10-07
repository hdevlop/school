# Guarded list templates: measured repeat — 2026-10-05

**Actual observed selected-key increase: $0.012718700 for 60 completed replies.**
All 60 automatic checks and assistant reviews passed; 48 replies used templates
and only 12 used the model. Conservative declared estimate: $0.012989100.
The estimated cost gate passes on this frozen corpus: $0.216/1,000 correct replies
against $0.25; the observed ledger window implies $0.212/1,000 replies.

These per-1,000 figures are normalized projections, not daily bills or flat API
prices. The user's older $0.06/66-provider-request screenshot is consistent with
the earlier two runs; [price-unit reconciliation](price-units-20261005.md) explains
the counts and rounding. Full production/role/load acceptance remains open.

## Implemented product change

School's existing template factory delegates narrow, whole-message class-list,
upcoming-exam and today's student-attendance intents to `schoolListReplies.ts`.
Najm remains the sole guarded MCP executor; each new template makes one existing
read-only call with the already-validated year. Qualified, quoted, additional-command
and unsupported requests retain the model path. No year/ownership boundary,
controller, repository, package pin or provider was changed.

Class replies preserve stored class/section names; exam replies sort real dates
and times, show at most five rows and mention more only when more exist. Attendance
replies distinguish empty arrays from actual stored statuses, with up to 20 rows
and an explicit more-records notice for populated results. Optional relation/name
gaps are stated; phones, notes and unrelated fields are not rendered. Malformed
shapes throw into Najm's existing controlled error response, never a guessed result.
There is no post-read model fallback in the published executor.

A sections-to-classes routing dependency keeps the class read available for Darija
queries that previously selected sections. Tool cap, error fallback, guards and
Najm ownership stay unchanged. [Nine routing previews](list60-routing-preview-20261005.json)
passed; actual guarded execution is verified separately in this repeat.

## Frozen run and review

Executed the [new run plan](list60-plan-20261005.md) once, run `89626cbe`:
30 [fresh-fact Moroccan cases](list60-corpus-20261005.json) twice, admin,
selected year `2026-2027`, serial, fresh sessions, warm resident Qwen embeddings
and verified fresh application caches. GPT-OSS-120b/Cerebras-first/low reasoning
were retained. [Raw report](list60-run-20261005.json),
[all-answer assistant review](list60-analysis-20261005.json).

- 60 completed/non-empty replies, 60 automatic and assistant passes, 20 per language.
- All six class lists match nine stored classes and their A/B/C sections; all six
  exam lists correctly bind the first five of 12 exams to date/time/class/section.
- All six attendance arrays were empty and accurately described. Populated,
  truncation, missing-relation and malformed-data behavior has synthetic local
  coverage; no populated live fixture was created.
- 48 guarded read executions, no executed writes or false write claims/promises.
  Every request began with empty history; all request/embedding correlations and
  fresh-cache resets were verified, with no missing/incomplete spans.
- 48 templates, 12 model replies (greetings and missing-student searches),
  **18 generation steps**. Templates had observed zero LLM usage.
- Native fluency, held-out wording, broader roles/year denials and genuine live
  failure paths remain separate acceptance conditions. One Darija greeting has
  some formal vocabulary, retained as an editorial caveat in the row review.

## Descriptive timings

| Path | Replies | First-text p50/p95 | Completion p50/p95 |
|---|---:|---:|---:|
| Hybrid | 60 | 0.250 / 0.934 s | 0.250 / 0.952 s |
| Model | 12 | 0.820 / 1.204 s | 0.866 / 1.243 s |
| Template | 48 | 0.231 / 0.526 s | 0.231 / 0.526 s |

These serial development samples meet the declared timing targets. The model
subset has changed; neither subset nor hybrid timings prove a faster model or a
production p95. No concurrent/cold-model/browser condition is inferred.

## Spend and estimates, with explicit denominators

| Measure | Amount |
|---|---:|
| Observed later selected-key increase for this run | **$0.012718700** |
| Conservative declared estimate for this run | $0.012989100 |
| Unchanged raw SDK estimate for this run | $0.001561118 |
| Completed and assistant-accepted chatbot replies | 60 |
| Recorded generation steps | 18 |
| Observed increase per completed reply | $0.000211978 |
| Observed increase per 1,000 completed replies (projection) | $0.211978333 |
| Declared estimate per 1,000 correct replies (projection) | $0.216485000 |

The selected key matched the environment key and retained its $50 total cap.
The new 60-request/$0.50 estimated allowance settled from declared rates with no
unknown cost, unresolved reservation or extra paid retries/probes. This operating
limit was never a hard provider billing cap.

The immediate ledger delta was stale/zero. [Later postflight](list60-postflight-20261005.json)
read $0.753235334 versus $0.740516634 before the run. Recorded tokens exactly
match that increase at current Cerebras catalog rates:
`(33,442 × $0.35 + 1,352 × $0.75) / 1,000,000 = $0.012718700`.
This supports reconciliation, not isolated per-generation host/invoice attribution;
other traffic, retries outside recorded SDK steps and embedding infrastructure
costs remain unallocated. The raw immediate zero was retained unchanged.
The [later settled read](list60-settled-20261005.json) returned the same cumulative
usage, confirming stability at that read without isolating other account traffic.

Against the prior full repeat, observed key increase fell from $0.052126750 to
$0.012718700, about **75.6%** for the same 60-case-count workload. Prompt tokens
fell from 140,210 to 33,442, and generation steps from 54 to 18. This is dated
before/after evidence with a deliberate template-path change, not an interleaved
model comparison or a representative production traffic mix.

## Verification and next work

332 tests passed, zero failures, 986 assertions, in the worktree and independent
published-dependency [frozen snapshot](list60-manifest-20261005.json). Server
source/test typechecks, root lint, i18n-key check and isolated production build
(`.next-chat-list-check`) passed. [Readiness](list60-readiness-20261005.json),
[preflight](list60-preflight-20261005.json) and
[tool contracts](list60-tool-contracts-20261005.json) were captured before chats.
[Post-run source hashes](list60-source-after-20261005.json) match the frozen
manifest. [Final verification](list60-verification-20261005.json) also records
valid links, matching corpus hashes, clean whitespace and stable ledger evidence.
[Cleanup](list60-cleanup-20261005.json) confirmed no task launcher, snapshot
process or port 3102 listener remained; Ollama and the frozen snapshot were retained.

The serial corpus now passes correctness/timing/estimated-cost gates. Next are
separately budgeted concurrency 2/4, held-out and role/year coverage, failure
paths, and production/browser readiness; this run did not deploy or expand to
those conditions. Its 60-request allowance is consumed.
